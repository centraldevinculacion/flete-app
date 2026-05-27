import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyC0G6gmoNnvyh_nj0swAjJ3o15c4y9uZi0",
  authDomain: "fleteapp-cd1d5.firebaseapp.com",
  projectId: "fleteapp-cd1d5",
  storageBucket: "fleteapp-cd1d5.firebasestorage.app",
  messagingSenderId: "741977060981",
  appId: "1:741977060981:web:75f23ddfea36a4987f2a3c",
  measurementId: "G-9ZPT6L9QNZ",
}

const app = initializeApp(firebaseConfig)
export const firestoreDb = getFirestore(app)
export const firebaseStorage = getStorage(app)
