import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_MAIN_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_MAIN_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_MAIN_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_MAIN_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MAIN_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_MAIN_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MAIN_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
