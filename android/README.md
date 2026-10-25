# Android-обёртка «Корона и Клинок»

Минимальное нативное приложение: один `Activity` с `WebView`, который открывает
`assets/index.html` — тот же самый одиночный файл, что лежит в
[`mobile/Корона_и_Клинок.html`](../mobile/Корона_и_Клинок.html).

Полная инструкция для телефона — в [MOBILE_INSTALL.md](../MOBILE_INSTALL.md).

## Структура

```
android/
├── build-apk.sh                     сборка APK без Gradle (Termux / Linux / CI)
├── build.gradle, settings.gradle   для Android Studio
├── gradle.properties
├── gradle/wrapper/gradle-wrapper.properties
├── toolz/                          сюда кладётся android.jar и debug.keystore (в .gitignore)
└── app/
    ├── build.gradle
    └── src/main/
        ├── AndroidManifest.xml
        ├── assets/index.html        игра (генерируется npm run build:mobile)
        ├── java/ru/idlerpg/corona/MainActivity.java
        └── res/
            ├── values/{strings,colors,styles}.xml
            └── mipmap-*/ic_launcher.png
```

## Сборка

```bash
# 1. Обновить игру внутри APK (из корня репозитория)
npm ci && npm run build:mobile

# 2. Собрать и подписать APK
bash android/build-apk.sh
# → ../download/corona-i-klinok.apk
```

Или откройте папку `android/` в Android Studio →
**Build → Build Bundle(s)/APK(s) → Build APK(s)**.

### Что делает `build-apk.sh`

1. Ищет `aapt2`, `d8`/`dx`, `apksigner`, `zipalign`, `javac` в `PATH` или в
   `$ANDROID_HOME/build-tools/*`. В Termux доставляет их через `pkg install`.
2. Ищет `android.jar` в `$ANDROID_HOME/platforms/*`; если нет — скачивает API 30
   в `toolz/android.jar`.
3. `aapt2 compile` + `aapt2 link` — ресурсы, бинарный манифест и `assets/`.
4. `javac` → `.class`, затем `d8`/`dx` → `classes.dex`, добавляется в APK.
5. `zipalign` → `apksigner sign` (v1 + v2) → `apksigner verify`.

На GitHub Actions всё это уже предустановлено — см.
[`docs/github-actions-example.yml`](../docs/github-actions-example.yml).

## Важные детали

- **Сохранение прогресса.** `file://` в WebView не всегда даёт `localStorage`,
  поэтому `MainActivity` регистрирует JS-мост `CKStorage`, который пишет сейв в
  `SharedPreferences`. `src/game/state.ts` использует его в первую очередь.
- **Офлайн.** Ни одного сетевого запроса: шрифты, стили, скрипты и иконки
  встроены в `assets/index.html`. Разрешение `INTERNET` добавлено только на
  случай WebView-сборок, требующих его даже для `file://`.
- **Поворот экрана.** `android:configChanges` предотвращает пересоздание
  Activity, поэтому игровой цикл не прерывается.
- **Иконки.** Генерируются скриптом `scripts/make_icons.py` (без Pillow).

## Изменение имени/пакета

Если хотите свой `applicationId`, замените `ru.idlerpg.corona` в
`AndroidManifest.xml`, `app/build.gradle`, и пути `java/...`. При установке
поверх существующей версии с другим ключом подписи сначала удалите старую.
