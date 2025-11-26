import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// NOVO: Importa o módulo de Autenticação
import { getAuth } from 'firebase/auth'; 

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// EXPORTAÇÕES
export const db = getFirestore(app);
export const auth = getAuth(app); // NOVO: Exporta o objeto de Autenticação