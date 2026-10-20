// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATNlGSZYSL6acIiyZZ4rgxP-wkBIJP3is",
  authDomain: "compte-caisse.firebaseapp.com",
  databaseURL: "https://compte-caisse-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "compte-caisse",
  storageBucket: "compte-caisse.firebasestorage.app",
  messagingSenderId: "723188845122",
  appId: "1:723188845122:web:5898ebe0a1b77cfa3b7bdb"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "default");
export const rtdb = getDatabase(app);

