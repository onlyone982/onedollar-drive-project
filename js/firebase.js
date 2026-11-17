// Firebase를 한 곳에서만 초기화합니다. 다른 파일은 여기서 import 하세요.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { FIRESTORE_DB_ID } from "./config.js";

// 웹용 Firebase 설정값은 공개되어도 괜찮습니다. 보안은 firestore.rules / storage.rules가 담당합니다.
// (Google Cloud 콘솔에서 API 키에 HTTP 리퍼러 제한을 걸어두면 더 안전합니다.)
const firebaseConfig = {
  apiKey: "AIzaSyDTJFT5aBr2km6_Z-Q8gXdBvkKGxLVmOyo",
  authDomain: "onedollardrive-3bbee.firebaseapp.com",
  projectId: "onedollardrive-3bbee",
  storageBucket: "onedollardrive-3bbee.firebasestorage.app",
  messagingSenderId: "37980557245",
  appId: "1:37980557245:web:9c752ecf11cdb6ff270cd4",
  measurementId: "G-LWQCX5XZ9D",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
export const db = FIRESTORE_DB_ID === "(default)" ? getFirestore(app) : getFirestore(app, FIRESTORE_DB_ID);

// Storage는 사진 업로드가 필요한 페이지에서만 불러옵니다(Blaze 요금제 필요).
let _storage = null;
export async function storage() {
  if (!_storage) {
    const { getStorage } = await import("https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js");
    _storage = getStorage(app);
  }
  return _storage;
}
