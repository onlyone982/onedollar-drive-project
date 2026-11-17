// Firebase를 한 곳에서만 초기화합니다. 다른 파일은 여기서 import 하세요.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
import { FIRESTORE_DB_ID } from "./config.js";

// 웹용 Firebase 설정값은 공개되어도 괜찮습니다. 보안은 firestore.rules / database.rules.json이 담당합니다.
// (Google Cloud 콘솔에서 API 키에 HTTP 리퍼러 제한을 걸어두면 더 안전합니다.)
const firebaseConfig = {
  apiKey: "AIzaSyDTJFT5aBr2km6_Z-Q8gXdBvkKGxLVmOyo",
  authDomain: "onedollardrive-3bbee.firebaseapp.com",
  projectId: "onedollardrive-3bbee",
  storageBucket: "onedollardrive-3bbee.firebasestorage.app",
  messagingSenderId: "37980557245",
  appId: "1:37980557245:web:9c752ecf11cdb6ff270cd4",
  measurementId: "G-LWQCX5XZ9D",
  // Realtime Database(접속자 수 전용). 미국 리전 인스턴스를 새로 만들면 이 URL을 바꾸세요.
  databaseURL: "https://onedollardrive-3bbee-default-rtdb.asia-southeast1.firebasedatabase.app",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = FIRESTORE_DB_ID === "(default)" ? getFirestore(app) : getFirestore(app, FIRESTORE_DB_ID);

let _rtdb = null;
export function rtdb() {
  if (!_rtdb) _rtdb = getDatabase(app);
  return _rtdb;
}
