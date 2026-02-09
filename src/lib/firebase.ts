import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// TODO: Replace with your Firebase project configuration
// Get these values from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyDFH3l_0GJY4L_UHxf-CGTM33LSQZRb0qA",
  authDomain: "booking-system-3b3cb.firebaseapp.com",
  projectId: "booking-system-3b3cb",
  storageBucket: "booking-system-3b3cb.firebasestorage.app",
  messagingSenderId: "624047910614",
  appId: "1:624047910614:web:4ad6ba692ec700cd01a377",
  measurementId: "G-RQ2FR21D0R"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
