import { auth, provider, db } from "./firebase-config.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ✅ UI 요소
const topRight = document.querySelector(".top-right-buttons");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendMessageBtn");
const chatMessages = document.getElementById("chatMessages");

// ✅ 로그인
window.signInWithGoogle = async function () {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    await saveUserToFirestore(user);
    renderUserInfo(user);
  } catch (e) {
    console.error(e);
  }
};

// ✅ 로그아웃
window.signOutFromGoogle = async function () {
  await signOut(auth);
  location.reload();
};

// ✅ Firestore에 사용자 저장
async function saveUserToFirestore(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(ref, { lastLogin: serverTimestamp() }, { merge: true });
  } else {
    await setDoc(ref, {
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      membership: "free"
    });
  }
}

// ✅ UI 렌더링
function renderUserInfo(user) {
  topRight.innerHTML = `
    <div class="user-info" style="display:flex;align-items:center;gap:10px;">
      <span style="font-weight:600;color:#ffcc00;">환영합니다, ${user.displayName}님</span>
      <img src="${user.photoURL}" style="width:40px;height:40px;border-radius:50%;border:2px solid #ffcc00;">
      <button class="logout-button" onclick="signOutFromGoogle()">로그아웃</button>
    </div>
  `;
}

// ✅ 로그인 상태 감시
onAuthStateChanged(auth, (user) => {
  if (user) {
    renderUserInfo(user);
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.placeholder = "메시지를 입력하세요...";
  } else {
    topRight.innerHTML = `<button onclick="signInWithGoogle()">로그인</button>`;
    chatInput.disabled = true;
    sendBtn.disabled = true;
    chatInput.placeholder = "로그인 후 메시지를 입력하세요...";
  }
});

// ✅ 채팅 전송
sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  const user = auth.currentUser;
  if (!user) return;

  chatMessages.insertAdjacentHTML(
    "beforeend",
    `<div class="chat-message">
      <img src="${user.photoURL}" class="chat-profile" />
      <div><span class="chat-username">${user.displayName}</span> ${text}</div>
    </div>`
  );
  chatInput.value = "";
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
