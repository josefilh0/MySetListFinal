import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged as firebaseOnAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore'; 
import { db } from '../firebase';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      displayName: user.displayName,
      email: user.email,
      uid: user.uid
    }, { merge: true });
    return user;
  } catch (error) {
    console.error("Erro durante o login com Google:", error);
    throw error;
  }
  
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro durante o logout:", error);
    throw error;
  }
}

export function onAuthStateChanged(callback: (user: any) => void) {
  return firebaseOnAuthStateChanged(auth, callback);
}