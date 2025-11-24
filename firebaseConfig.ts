
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Helper to safely get environment variables in Vite
const getEnv = (key: string) => {
  // Check if import.meta.env exists
  if (import.meta && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  return '';
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID")
};

// Validación para desarrollo - solo warn si falta la API key
if (!firebaseConfig.apiKey) {
    console.warn("Advertencia: Faltan las credenciales de Firebase. La autenticación y el chat no funcionarán.");
}

// Initialize Firebase (check apps length for hot-reload safety)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
export const db = firebase.firestore();
