import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfQ8zNd8VCduEN8SEJDfmTXldFHLJ7Ues",
  authDomain: "wlotka-af816.firebaseapp.com",
  projectId: "wlotka-af816",
  storageBucket: "wlotka-af816.firebasestorage.app",
  messagingSenderId: "931325389080",
  appId: "1:931325389080:web:034e0cb84825a48a2ed66d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const APP_ID = 'wlotka-web-v1';