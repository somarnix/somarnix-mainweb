# Platform Apps

This project now supports three delivery paths with the same backend:

- Website: normal Next.js site
- Windows app: publish the PWA to Microsoft Store
- Android app: Capacitor wrapper for Google Play

## Current setup

- PWA manifest: `app/manifest.ts`
- Service worker: `public/sw.js`
- Offline fallback: `public/offline.html`
- Android wrapper config: `capacitor.config.ts`
- Android native project: `android/`

## Important environment values

Set one of these for production app builds:

- `CAPACITOR_SERVER_URL=https://yourdomain.com`
- or `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`

Current fallback in config is:

- `https://somarnix.com`

Update this if your final production domain is different.

## Android

### Useful commands

```bash
npm run cap:assets
npm run cap:android
npm run cap:open:android
```

### Play Store path

1. Open the Android project in Android Studio.
2. Set your real app id, app name, icons, splash, and signing config.
3. Build an AAB.
4. Upload the AAB to Google Play Console.

## Windows / Microsoft Store

The cleanest path for this project is the PWA route.

### Recommended path

1. Deploy the website on HTTPS.
2. Confirm the manifest and service worker work in production.
3. Use PWABuilder or Microsoft Store PWA packaging workflow.
4. Submit the packaged app to Microsoft Store with your developer account.

## Final app identity in repo

- App name: `Edugroit`
- Android package id: `com.edugroit.app`

## Notes

- The website stays normal.
- The Android app and Windows app use the same backend.
- Store publishing still needs your own Microsoft and Google developer accounts.
- Native push and store signing are account/platform tasks, not just code tasks.
