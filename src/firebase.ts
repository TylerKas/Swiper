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
import { getStorage } from "firebase/storage";

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
// Configure Google Auth Provider for better cross-device compatibility
provider.addScope('email');
provider.addScope('profile');
provider.setCustomParameters({
  prompt: 'select_account'
});
export const db = getFirestore(app);
export const storage = getStorage(app);
auth.languageCode = 'en';

// Profile data interface that matches the Profile component
export interface ProfileData {
  full_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  age?: string;
  address?: string;
  miles_radius?: number;
  avatar_url?: string;
  updated_at?: any;
}

// Reference to the current user's profile document
const userProfileRef = (uid: string) => {
  if (!uid) throw new Error("User ID is required");
  return doc(db, "profiles", uid);
};

// Load profile once (returns null if none saved yet)
export async function loadProfile(uid: string): Promise<ProfileData | null> {
  try {
    const snap = await getDoc(userProfileRef(uid));
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as ProfileData;
    return data;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

// Live listener for profile changes
export function watchProfile(
  cb: (p: ProfileData | null) => void,
  uid: string
) {
  return onSnapshot(userProfileRef(uid), (snap) => {
    const data = snap.exists() ? snap.data() as ProfileData : null;
    cb(data);
  });
}

// Save/merge profile fields for this user
export async function saveProfile(partial: ProfileData, uid: string) {
  try {
    console.log('Firebase saveProfile called:', { uid, partial });
    
    // Validate user ID
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid user ID provided');
    }
    
    const profileRef = userProfileRef(uid);
    
    // Filter out empty fields before saving
    const cleanData = Object.fromEntries(
      Object.entries(partial).filter(([key, value]) => {
        // Keep non-empty strings, numbers, and other non-empty values
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        return true;
      })
    );
    
    console.log('Cleaned data to save:', cleanData);
    
    // Ensure we have data to save
    if (Object.keys(cleanData).length === 0) {
      console.log('No data to save after cleaning');
      return;
    }
    
    // Use batch write for better consistency across devices
    await setDoc(
      profileRef,
      { 
        ...cleanData, 
        updated_at: serverTimestamp() 
      },
      { merge: true }
    );
    
    console.log('Profile saved successfully to Firestore');
  } catch (error) {
    console.error('Error saving profile:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      uid,
      partial
    });
    throw error;
  }
}

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
