import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

export const firebaseConfig = {
  apiKey: "AIzaSyBDRh7Uq76eXKms9seMKByxZ2uXegrrLsU",
  authDomain: "sunset-game.firebaseapp.com",
  projectId: "sunset-game",
  storageBucket: "sunset-game.firebasestorage.app",
  messagingSenderId: "330458101789",
  appId: "1:330458101789:web:487bf0792f950b3d88eef4",
  measurementId: "G-C4E4R91R4W"
};



const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function loginEmail(email, pass) {
  return signInWithEmailAndPassword(auth, email, pass);
}

export async function registerEmail(email, pass, displayName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential;
}

export async function updateDisplayName(name) {
  if (!auth.currentUser) return;
  return updateProfile(auth.currentUser, { displayName: name });
}

export async function loginGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function logout() {
  return signOut(auth);
}

export async function getIdToken() {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken();
}

