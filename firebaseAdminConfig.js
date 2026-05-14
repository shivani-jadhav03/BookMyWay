import admin from 'firebase-admin';

let firebaseAdmin = null;

try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    );

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin initialized');
  } else {
    firebaseAdmin = admin.app();
  }
} catch (error) {
  console.warn('Firebase Admin init failed:', error.message);
}

export default firebaseAdmin;
