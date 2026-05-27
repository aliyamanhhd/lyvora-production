import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

import {
  getFirestore,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_NThP0Wl_f_fZO-F_tkxuLvEZIvO_LuQ",
  authDomain: "lyrova-1ccab.firebaseapp.com",
  projectId: "lyrova-1ccab",
  storageBucket: "lyrova-1ccab.firebasestorage.app",
  messagingSenderId: "796048764105",
  appId: "1:796048764105:web:381c43b12ccd93b6973118",
  measurementId: "G-W5C6MKJ8S8"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export { serverTimestamp };