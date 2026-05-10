# SkillBridge Android App

This folder contains a native Android wrapper for the existing SkillBridge web app:

- Project path: `android-app/`
- Launch URL: `http://10.112.80.138:3000`
- Package name: `com.skillbridge.app`

## What it supports

- Login and session-based navigation
- Resume upload through the web form
- Camera permission flow for in-page capture
- Pull-to-refresh
- Back navigation inside the WebView

## How to run on an Android device

1. Start the SkillBridge server on your laptop:

```bash
npm start
```

2. Make sure your Android phone and laptop are on the same Wi-Fi network.

3. Open `android-app/` in Android Studio.

4. Let Android Studio sync Gradle.

5. Connect your Android device with USB debugging enabled, or use a local emulator.

6. Build and run the app.

## Important note

This is a native Android wrapper around the current website, not a full offline native rewrite of the backend. The app expects the SkillBridge server to be running and reachable at the URL in:

`android-app/app/src/main/res/values/strings.xml`

If your laptop IP changes, update `skillbridge_base_url` before building.
