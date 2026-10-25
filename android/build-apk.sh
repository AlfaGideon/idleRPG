#!/usr/bin/env bash
# Собирает и подписывает APK без Gradle/Android Studio.
# Работает в Termux (на телефоне), на Linux/macOS с Android SDK и в GitHub Actions.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
APP="$HERE/app"
BUILD="$HERE/build"
TOOLZ="$HERE/toolz"
OUT="$ROOT/download"
APK="$OUT/corona-i-klinok.apk"
JAR_URL="https://raw.githubusercontent.com/Sable/android-platforms/master/android-30/android.jar"
JAR_URL_ALT="https://github.com/Sable/android-platforms/raw/master/android-30/android.jar"

mkdir -p "$BUILD" "$TOOLZ" "$OUT"

log()  { printf '\n\033[1;33m==>\033[0m %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\n\033[1;31mОШИБКА:\033[0m %s\n\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 1. checking
[ -f "$APP/src/main/assets/index.html" ] || die "Нет android/app/src/main/assets/index.html. Сначала выполните: npm ci && npm run build:mobile"
[ -f "$APP/src/main/AndroidManifest.xml" ] || die "Нет AndroidManifest.xml"
info "Ассет игры: $(du -h "$APP/src/main/assets/index.html" | cut -f1)"

IS_TERMUX=0
if [ -n "${TERMUX_VERSION:-}" ] || [[ "${PREFIX:-}" == *"com.termux"* ]]; then IS_TERMUX=1; fi

need_tools=(aapt2 zipalign apksigner javac zip)
missing=0
for t in "${need_tools[@]}"; do command -v "$t" >/dev/null 2>&1 || missing=1; done
if ! command -v d8 >/dev/null 2>&1 && ! command -v dx >/dev/null 2>&1; then missing=1; fi

if [ "$missing" -eq 1 ] && [ "$IS_TERMUX" -eq 1 ]; then
  log "Termux: ставлю инструменты сборки (один раз, ~2 минуты)"
  pkg install -y openjdk-17 aapt2 d8 apksigner zipalign zip curl || \
    pkg install -y openjdk-17 aapt2 dx apksigner zipalign zip curl
  export JAVA_HOME="${JAVA_HOME:-$PREFIX/lib/jvm/java-17-openjdk}"
  export PATH="$JAVA_HOME/bin:$PATH"
  hash -r
fi

# Ищем инструменты: сначала в PATH, затем в Android SDK.
find_sdk_tool() {
  local name="$1" base hit
  if command -v "$name" >/dev/null 2>&1; then command -v "$name"; return 0; fi
  for base in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$HOME/Android/Sdk" "/usr/lib/android-sdk"; do
    [ -n "$base" ] && [ -d "$base/build-tools" ] || continue
    hit="$(find "$base/build-tools" -maxdepth 2 -type f -name "$name" 2>/dev/null | sort | tail -1)"
    if [ -n "$hit" ]; then echo "$hit"; return 0; fi
  done
  return 1
}

AAPT2="$(find_sdk_tool aapt2 || true)"
ZIPALIGN="$(find_sdk_tool zipalign || true)"
APKSIGNER="$(find_sdk_tool apksigner || true)"
D8="$(find_sdk_tool d8 || true)"
DX="$(find_sdk_tool dx || true)"

for pair in "AAPT2:$AAPT2" "ZIPALIGN:$ZIPALIGN" "APKSIGNER:$APKSIGNER"; do
  [ -n "${pair#*:}" ] || die "Не найден ${pair%%:*}. В Termux: pkg install openjdk-17 aapt2 d8 apksigner zipalign zip"
done
[ -n "$D8" ] || [ -n "$DX" ] || die "Не найден d8/dx. В Termux: pkg install d8"
command -v javac >/dev/null 2>&1 || die "Не найден javac. В Termux: pkg install openjdk-17"

# ---------------------------------------------------------------- 2. android.jar
find_android_jar() {
  local base hit
  [ -f "$TOOLZ/android.jar" ] && { echo "$TOOLZ/android.jar"; return 0; }
  for base in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$HOME/Android/Sdk" "/usr/lib/android-sdk"; do
    [ -n "$base" ] && [ -d "$base/platforms" ] || continue
    hit="$(find "$base/platforms" -maxdepth 2 -type f -name android.jar 2>/dev/null | sort | tail -1)"
    if [ -n "$hit" ]; then echo "$hit"; return 0; fi
  done
  return 1
}

ANDROID_JAR="$(find_android_jar || true)"
if [ -z "$ANDROID_JAR" ]; then
  log "Скачиваю android.jar (API 30) — нужен один раз"
  curl -fL --retry 3 -o "$TOOLZ/android.jar" "$JAR_URL" || \
    curl -fL --retry 3 -o "$TOOLZ/android.jar" "$JAR_URL_ALT" || \
    die "Не удалось скачать android.jar. Положите его в android/toolz/android.jar вручную."
  ANDROID_JAR="$TOOLZ/android.jar"
fi
info "android.jar: $ANDROID_JAR"

# ---------------------------------------------------------------- 3. resources
log "Компилирую ресурсы и манифест"
rm -rf "$BUILD/classes" "$BUILD/dex" "$BUILD/res.zip" "$BUILD/base.apk" "$BUILD/aligned.apk" "$BUILD/classes.dex"
mkdir -p "$BUILD/classes" "$BUILD/dex"
"$AAPT2" compile --dir "$APP/src/main/res" -o "$BUILD/res.zip"
"$AAPT2" link \
  -o "$BUILD/base.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$APP/src/main/AndroidManifest.xml" \
  -A "$APP/src/main/assets" \
  --min-sdk-version 21 \
  --target-sdk-version 34 \
  --auto-add-overlay \
  "$BUILD/res.zip"

# ---------------------------------------------------------------- 4. java → dex
log "Компилирую MainActivity.java"
JAVAC="$(command -v javac)"
if "$JAVAC" --help 2>&1 | grep -q -- '--release'; then
  "$JAVAC" --release=9 -d "$BUILD/classes" -cp "$ANDROID_JAR" \
    $(find "$APP/src/main/java" -name '*.java')
else
  "$JAVAC" -source 8 -target 8 -d "$BUILD/classes" -cp "$ANDROID_JAR" \
    $(find "$APP/src/main/java" -name '*.java')
fi

log "Собираю classes.dex"
if [ -n "$D8" ]; then
  "$D8" --lib "$ANDROID_JAR" --output "$BUILD/dex" $(find "$BUILD/classes" -name '*.class')
  cp "$BUILD/dex/classes.dex" "$BUILD/classes.dex"
else
  "$DX" --dex --output="$BUILD/classes.dex" "$BUILD/classes"
fi
(cd "$BUILD" && zip -q -0 base.apk classes.dex)

# ---------------------------------------------------------------- 5. align + sign
log "Выравниваю и подписываю APK"
"$ZIPALIGN" -f 4 "$BUILD/base.apk" "$BUILD/aligned.apk"

KS="$TOOLZ/debug.keystore"
if [ ! -f "$KS" ] && command -v keytool >/dev/null 2>&1; then
  keytool -genkeypair -keystore "$KS" -storepass android -keypass android \
    -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Corona i Klinok, OU=Mobile, O=idleRPG, C=RU" >/dev/null 2>&1
fi

if [ -f "$KS" ]; then
  "$APKSIGNER" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android \
    --v1-signing-enabled true --v2-signing-enabled true \
    --out "$APK" "$BUILD/aligned.apk"
else
  info "keytool не найден — подписываю ключом OpenSSL"
  openssl req -x509 -newkey rsa:2048 -nodes -keyout "$BUILD/key.pem" \
    -out "$BUILD/cert.pem" -days 10000 -subj "/CN=Corona i Klinok" >/dev/null 2>&1
  openssl pkcs8 -topk8 -nocrypt -in "$BUILD/key.pem" -outform DER -out "$BUILD/key.pk8"
  "$APKSIGNER" sign --key "$BUILD/key.pk8" --cert "$BUILD/cert.pem" \
    --v1-signing-enabled true --v2-signing-enabled true \
    --out "$APK" "$BUILD/aligned.apk"
fi

"$APKSIGNER" verify "$APK" >/dev/null

log "Готово: $APK ($(du -h "$APK" | cut -f1))"
"$AAPT2" dump badging "$APK" 2>/dev/null | grep -E "package:|application-label:|sdkVersion:" || true

if [ "$IS_TERMUX" -eq 1 ]; then
  SHARED="$HOME/storage/shared/Download"
  if [ -d "$SHARED" ]; then
    cp "$APK" "$SHARED/corona-i-klinok.apk"
    log "APK скопирован в Загрузки: $SHARED/corona-i-klinok.apk"
    info "Откройте его в «Файлах» и разрешите установку из неизвестных источников."
  else
    info "Выполните termux-setup-storage, затем: cp \"$APK\" ~/storage/shared/Download/"
  fi
fi
