import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAXuTDYp0Yxy6rLtNlhFH404v2OReFUAvY",
  authDomain: "odsportal-80582.firebaseapp.com",
  projectId: "odsportal-80582",
  storageBucket: "odsportal-80582.firebasestorage.app",
  messagingSenderId: "641917993181",
  appId: "1:641917993181:web:d5e0992302dc45a14f5b34",
  measurementId: "G-M87XRC4FVG",
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

export { storage };
