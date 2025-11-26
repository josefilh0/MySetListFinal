import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 🔥 Cole AQUI o firebaseConfig gerado no Firebase Console
const firebaseConfig = {
  apiKey: 'AIzaSyDo0asYhLVGoRzz_wBlPallzUQmfYKZ7n8',
  authDomain: 'mysetlist-a9131.firebaseapp.com',
  projectId: 'mysetlist-a9131',
  storageBucket: 'mysetlist-a9131.firebasestorage.app',
  messagingSenderId: '743915642840',
  appId: '1:743915642840:web:c2a8ca9584eea72221dcad',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
