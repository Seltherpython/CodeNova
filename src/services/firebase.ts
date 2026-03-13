import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = requiredVars.filter(v => !import.meta.env[v]);
if (missing.length > 0) {
  console.error(
    `%c🔴 FIREBASE CONFIG MISSING\n%cCreate a .env file in the project root with:\n${missing.map(v => `  ${v}=your_value`).join('\n')}\n\nSee .env.example for the full template.`,
    'color: red; font-size: 14px; font-weight: bold;',
    'color: orange;'
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const isMockAuth = missing.length > 0;
const app = !isMockAuth ? initializeApp(firebaseConfig) : null;

export const analytics = (typeof window !== "undefined" && app) ? getAnalytics(app) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export default app;
