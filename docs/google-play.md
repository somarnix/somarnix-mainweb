# Google Play

## Current Android identity

- App name: `Edugroit`
- Package id: `com.edugroit.app`
- Capacitor config: `capacitor.config.ts`
- Native Android shell: `android/`

## Useful commands

```bash
npm run cap:assets
npm run cap:android
npm run cap:open:android
```

## Before building AAB

1. Set final production URL in `CAPACITOR_SERVER_URL` or `NEXT_PUBLIC_SITE_URL`.
2. Open the Android project in Android Studio.
3. Set signing config and release keystore.
4. Review app icon, splash, app name, and permissions.
5. Test login, payment flow, upload flow, and notifications on a real Android device.

## Play Store publish path

1. Build release AAB in Android Studio.
2. Upload AAB to Google Play Console.
3. Complete privacy policy, screenshots, content rating, and data safety form.

## Notes

- Android app uses the same backend as the website.
- Website is not blocked by the Android app.
- Native push can be added later if you want stronger Android notification support than browser PWA push.
