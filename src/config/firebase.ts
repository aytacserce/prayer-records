// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoePOof_6FNqxAl7pH_dPfUgJmCUnwV_w",
  authDomain: "prayer-records-app.firebaseapp.com",
  projectId: "prayer-records-app",
  storageBucket: "prayer-records-app.appspot.com",
  messagingSenderId: "839666099977",
  appId: "1:839666099977:web:07ec29caba3696901395d8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);