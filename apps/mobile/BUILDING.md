# Turna mobile builds

Turna is a bare React Native application. Native artifacts are produced by the platform toolchains rather than by the web build.

## Android

Install Android Studio, Android SDK Platform 34, Android build tools 34.0.0, and NDK 26.1.10909125. Set `ANDROID_HOME` or `ANDROID_SDK_ROOT` to the SDK directory. A local SDK path can also be written to `android/local.properties`; that file is intentionally ignored by Git. Start with the tracked template at `android/local.properties.example`.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm build:android:apk       # signed-by-debug-keystore release APK
pnpm build:android           # Android App Bundle for distribution
```

For a development APK, use `pnpm --filter @turna/mobile android:debug`. Run `pnpm --filter @turna/mobile android:doctor` before building when configuring a new machine.

## iOS

iOS builds require macOS, Xcode, CocoaPods, and a configured Apple signing team. From the repository root on macOS:

```bash
pnpm install --frozen-lockfile
pnpm --filter @turna/mobile ios:debug
pnpm build:ios
```

The iOS command installs Pods and invokes `xcodebuild` using the `Turna.xcworkspace` scheme. Configure signing in Xcode for device/archive distribution; the release command disables signing only for an unsigned compile check.

## Workspace shortcuts

`pnpm build:web` builds the Next.js web app. `pnpm build:mobile` produces the Android App Bundle, while `pnpm build:android:apk` produces an APK. `pnpm build:ios` is the iOS release compile path and must run on macOS.
