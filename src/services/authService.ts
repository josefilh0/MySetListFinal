// src/services/authService.ts
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore'; 

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

async function updateUserInFirestore(user: any) {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    displayName: user.displayName || user.email?.split('@')[0],
    email: user.email,
    uid: user.uid,
    lastAccess: new Date().toISOString()
  }, { merge: true });
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await updateUserInFirestore(result.user);
    return result.user;
  } catch (error) {
    throw error; // Apenas repassa o erro, não imprime no console
  }
}

export async function loginWithEmail(email: string, pass: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    await updateUserInFirestore(result.user);
    return result.user;
  } catch (error) {
    throw error;
  }
}

export async function registerWithEmail(email: string, pass: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateUserInFirestore(result.user);
    return result.user;
  } catch (error) {
    throw error;
  }
}

export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro logout:", error);
  }
}

export function onAuthStateChanged(callback: (user: any) => void) {
  return firebaseOnAuthStateChanged(auth, callback);
}