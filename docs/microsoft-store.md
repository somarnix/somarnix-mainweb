# Microsoft Store

## Recommended path

Use the PWA route for Windows.

This project already has:

- manifest: `app/manifest.ts`
- service worker: `public/sw.js`
- install prompt UI: `app/components/PWAInstallPrompt.tsx`

## Before packaging

1. Deploy on HTTPS.
2. Confirm install works in Edge/Chrome.
3. Confirm icon, name, theme color, and offline page are correct.
4. Confirm login, payments, uploads, and notifications in installed mode.

## Suggested store identity

- App name: `Edugroit`
- Website URL: your production domain
- Windows package route: PWA package

## Packaging

The easiest Windows route is:

1. Build and deploy production site.
2. Open PWABuilder.
3. Generate the Microsoft Store package from your live URL.
4. Submit with your Microsoft Partner Center account.

## Notes

- Website still keeps working normally.
- Store package is another client, not a replacement for the site.
- Push notification behavior on Windows depends on browser/PWA support and permission flow.
