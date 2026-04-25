import admin from 'firebase-admin';

let initialized = false;

function initAdmin() {
  if (initialized) return;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (process.env.ALLOW_INSECURE_DEV_AUTH === '1') {
    // Skip initialization in insecure dev mode.
    initialized = true;
    return;
  }

  if (json) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(json))
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }

  initialized = true;
}

export async function verifyFirebaseIdToken(idToken) {
  initAdmin();

  if (process.env.ALLOW_INSECURE_DEV_AUTH === '1') {
    return { uid: (idToken || 'dev').slice(0, 32), name: 'Dev User' };
  }

  return admin.auth().verifyIdToken(idToken);
}

