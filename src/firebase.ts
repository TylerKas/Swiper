// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD18Yaqmc4IuCjy9UK-MOyqZys6ZAZ4vVo",
  authDomain: "swiper-35a4f.firebaseapp.com",
  projectId: "swiper-35a4f",
  storageBucket: "swiper-35a4f.firebasestorage.app",
  messagingSenderId: "944299219126",
  appId: "1:944299219126:web:59948e59ce9db8dbe42e17",
  measurementId: "G-151Q8WMNF2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);