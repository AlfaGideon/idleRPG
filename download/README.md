# Готовые файлы для телефона

Здесь появляется собранный APK: `corona-i-klinok.apk`.

Он **не лежит в Git**, потому что в среде сборки нет Android SDK/JDK.
Три способа получить файл:

1. **GitHub Actions (рекомендуется).** Скопируйте
   `docs/github-actions-example.yml` в `.github/workflows/build.yml`, запушьте —
   APK появится в Releases (`apk-latest`) и в артефактах запуска.
2. **Termux на телефоне.** `bash android/build-apk.sh` — положит APK сюда же.
3. **ПК.** `ANDROID_HOME=... bash android/build-apk.sh` или Android Studio.

Саму игру без всякой сборки можно открыть прямо сейчас файлом
[`mobile/Корона_и_Клинок.html`](../mobile/Корона_и_Клинок.html).

Подробности: [MOBILE_INSTALL.md](../MOBILE_INSTALL.md).
