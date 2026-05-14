// Firebase Admin Configuration
// This file handles Firebase Admin SDK initialization using environment variables
// For deployment, set these environment variables in your hosting platform

import admin from 'firebase-admin';

let firebaseAdmin;

try {
  // Try to initialize with environment variable (recommended for production)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      });
      console.log('Firebase Admin initialized from environment variable');
    } catch (envError) {
      if (envError.code === 'app/duplicate-app') {
        firebaseAdmin = admin.app();
        console.log('Firebase Admin already initialized');
      } else {
        console.warn('Firebase Admin initialization from environment variable failed:', envError.message);
        firebaseAdmin = null;
      }
    }
  } else {
    // Fallback: try to use default ADC (Application Default Credentials)
    try {
      firebaseAdmin = admin.initializeApp();
      console.log('Firebase Admin initialized with default credentials');
    } catch (defaultError) {
      if (defaultError.code === 'app/duplicate-app') {
        firebaseAdmin = admin.app();
        console.log('Firebase Admin already initialized');
      } else {
        console.warn('Firebase Admin not configured. Using file-based authentication.');
        console.warn('To enable Firebase:');
        console.warn('1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account JSON path');
        console.warn('2. Or provide service account JSON as environment variable');
        firebaseAdmin = null;
      }
    }
  }
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    firebaseAdmin = admin.app();
  } else {
    console.warn('Firebase Admin initialization failed:', error.message);
    console.warn('Using file-based authentication as fallback');
    firebaseAdmin = null;
  }
}

export default firebaseAdmin;
