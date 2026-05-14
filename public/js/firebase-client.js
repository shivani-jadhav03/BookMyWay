// Firebase Client Configuration
// This file initializes Firebase for client-side authentication
// You need to replace the config with your actual Firebase project configuration

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDcQJGcC0NjYTbIc3vbyKWNgt8Uir1WFzE",
  authDomain: "bookmyway-f3afd.firebaseapp.com",
  projectId: "bookmyway-f3afd",
  storageBucket: "bookmyway-f3afd.firebasestorage.app",
  messagingSenderId: "517166978421",
  appId: "1:517166978421:web:278375a9f2594c2a642f3c",
};

let app = null;
let auth = null;
let isFirebaseConfigured = false;

try {
  // Check if config is properly set
  if (firebaseConfig.apiKey !== "AIzaSyDcQJGcC0NjYTbIc3vbyKWNgt8Uir1WFzE") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    isFirebaseConfigured = true;
    console.log('Firebase client initialized successfully');
  } else {
    console.warn('Firebase not configured - using server-side authentication');
  }
} catch (error) {
  console.error('Firebase client initialization failed:', error);
}

export {
  auth,
  isFirebaseConfigured,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
