# Multiplayer Server + Firebase Auth

This server serves `game-project/` and hosts a WebSocket endpoint at `/ws`.

## Run

1. Install deps:
   - `npm install`
2. Start:
   - `npm run server`
3. Open:
   - `http://localhost:3000`

## Firebase Admin (Server Token Verification)

The server verifies Firebase ID tokens using `firebase-admin`.

Pick one:

- Recommended: set `GOOGLE_APPLICATION_CREDENTIALS` to a Firebase service account JSON file path.
- Alternative: set `FIREBASE_SERVICE_ACCOUNT_JSON` to the JSON string.

Example (PowerShell):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\serviceAccount.json"
npm run server
```

## Insecure Dev Mode (Local Only)

If you want to test the socket flow without Admin credentials:

```powershell
$env:ALLOW_INSECURE_DEV_AUTH="1"
npm run server
```

Do not use this in production.

## Firebase Console Checklist

- Enable Auth providers you want (Email/Password, Google).
- Add `localhost` to **Authorized domains**.

