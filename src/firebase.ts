// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  browserLocalPersistence, 
  setPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC32Hhg6zb9gt7F2b-pVkdmz3r672070ho",
  authDomain: "swiper-74825.firebaseapp.com",
  projectId: "swiper-74825",
  storageBucket: "swiper-74825.firebasestorage.app",
  messagingSenderId: "29626718575",
  appId: "1:29626718575:web:7909eb6465d46eb9e6b09a",
  measurementId: "G-GGPFR0ZGCZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Make sure auth exists before using it
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
auth.languageCode = 'en';

// Login with Google (popup)
export async function signInWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

//Register with regular email
export async function registerWithEmail(email: string, password: string) {
  await setPersistence(auth, browserLocalPersistence);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

//Login with regular email
export async function signInWithEmail(email: string, password: string) {
  await setPersistence(auth, browserLocalPersistence);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// Sign out user
export async function signOutUser() {
  return signOut(auth);
}

export type ProfileData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  age?: number;
  phone?: string;
  bio?: string;
  address?: string;
  radiusMiles?: number;
};

// Reference to the current user's /users/{uid} doc
const userDocRef = (uid?: string) => {
  const u = uid ?? auth.currentUser?.uid;
  if (!u) throw new Error("Not signed in");
  return doc(db, "users", u);
};

// Load profile once (returns null if none saved yet)
export async function loadProfile(uid?: string): Promise<ProfileData | null> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return (data.profile ?? null) as ProfileData | null;
}

// Live listener (optional; unsubscribe on unmount)
export function watchProfile(
  cb: (p: ProfileData | null) => void,
  uid?: string
) {
  return onSnapshot(userDocRef(uid), (snap) => {
    const data = snap.exists() ? ((snap.data() as any).profile ?? null) : null;
    cb(data as ProfileData | null);
  });
}

// Save/merge profile fields for this user
export async function saveProfile(partial: ProfileData, uid?: string) {
  await setDoc(
    userDocRef(uid),
    { profile: { ...partial }, updatedAt: serverTimestamp() },
    { merge: true }
  );
}