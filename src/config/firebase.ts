import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBoePOof_6FNqxAl7pH_dPfUgJmCUnwV_w",
  authDomain: "prayer-records-app.firebaseapp.com",
  projectId: "prayer-records-app",
  storageBucket: "prayer-records-app.appspot.com",
  messagingSenderId: "839666099977",
  appId: "1:839666099977:web:07ec29caba3696901395d8",
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);
