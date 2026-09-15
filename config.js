import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, setDoc, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js";

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

const SITE_CONFIG = {
  whatsappNumber: '5511999999999', // Coloque aqui o número real do WhatsApp (55 + DDD + Numero)
  appCheckSiteKey: '' // Passo: Vá ao Console do reCAPTCHA v3, gere uma chave (não enterprise) para maprimetec-os.web.app e cole aqui.
};

if (SITE_CONFIG.appCheckSiteKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(SITE_CONFIG.appCheckSiteKey), 
      isTokenAutoRefreshEnabled: true
    });
  } catch (e) {
    console.warn('App check init falhou:', e);
  }
}

export const STATUS = [
  { id: 'aberto',     label: 'Aberto',            cls: 'st-aberto'    },
  { id: 'analise',    label: 'Em Análise',        cls: 'st-analise'   },
  { id: 'orcamento',  label: 'Orçamento Enviado', cls: 'st-orcamento' },
  { id: 'reparo',     label: 'Em Reparo',         cls: 'st-reparo'    },
  { id: 'finalizado', label: 'Finalizado',        cls: 'st-final'     },
  { id: 'cancelado',  label: 'Cancelado',         cls: 'st-cancel'    }
];

export { 
  db, auth, collection, getDocs, doc, getDoc, onSnapshot, 
  updateDoc, deleteDoc, query, orderBy, setDoc, addDoc, onAuthStateChanged, signOut, 
  GoogleAuthProvider, signInWithPopup, signInAnonymously, SITE_CONFIG 
};
