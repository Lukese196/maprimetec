import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDoc, getDocs, doc, onSnapshot, updateDoc, query, orderBy, where, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  projectId: "maprimetec-os",
  appId: "1:985444390040:web:104ff73f822ed9be64aced",
  storageBucket: "maprimetec-os.firebasestorage.app",
  apiKey: "AIzaSyD835TJydsqLPzXGHpblEOQv1RUXLGL5gI",
  authDomain: "maprimetec-os.firebaseapp.com",
  messagingSenderId: "985444390040",
  measurementId: "G-1FXP8DHLBM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, collection, addDoc, getDoc, getDocs, doc, onSnapshot, updateDoc, query, orderBy, where, setDoc, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup };
