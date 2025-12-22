// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { 
   
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 1. Inicializa a App
const app = initializeApp(firebaseConfig);

// 2. Inicializa o Auth
export const auth = getAuth(app);

// 3. Inicializa o Firestore com PERSISTÊNCIA OFFLINE (Cache Local)
// Usamos initializeFirestore em vez de getFirestore para passar configurações
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() // Permite usar em várias abas sem travar
  })
});

export default app;