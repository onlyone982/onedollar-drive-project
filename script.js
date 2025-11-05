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

// ✅ DOM 요소
const topRight = document.querySelector(".top-right-buttons");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendMessageBtn");
const chatMessages = document.getElementById("chatMessages");

// ✅ 로그인 함수
window.signInWithGoogle = async function () {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    await saveUserToFirestore(user);
    renderUserInfo(user);
  } catch (e) {
    console.error("로그인 오류:", e);
  }
};

// ✅ 로그아웃 함수
window.signOutFromGoogle = async function () {
  await signOut(auth);
  alert("로그아웃 되었습니다.");
  location.reload();
};

// ✅ Firestore 사용자 정보 저장
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

// ✅ 로그인 상태 감시
onAuthStateChanged(auth, (user) => {
  if (user) {
    renderUserInfo(user);

    // 입력창 활성화
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.placeholder = "메시지를 입력하세요...";

    // 중복 등록 방지 → 기존 이벤트 제거
    chatInput.replaceWith(chatInput.cloneNode(true));
    sendBtn.replaceWith(sendBtn.cloneNode(true));

    const newChatInput = document.getElementById("chatInput");
    const newSendBtn = document.getElementById("sendMessageBtn");

    // ✅ Enter로 전송
    newChatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    // ✅ 버튼 클릭으로 전송
    newSendBtn.addEventListener("click", sendMessage);
  } else {
    topRight.innerHTML = `<button onclick="signInWithGoogle()">로그인</button>`;
    chatInput.disabled = true;
    sendBtn.disabled = true;
    chatInput.placeholder = "로그인 후 메시지를 입력하세요...";
  }
});

// ✅ UI 렌더링
function renderUserInfo(user) {
  topRight.innerHTML = `
    <div class="user-info" style="display:flex;align-items:center;gap:10px;">
      <span style="font-weight:600;color:#ffcc00;">환영합니다, ${user.displayName}님</span>
      <img src="${user.photoURL}" style="width:40px;height:40px;border-radius:50%;border:2px solid #ffcc00;">
      <button class="logout-button" onclick="signOutFromGoogle()" 
        style="background-color:#ffcc00;border:none;color:#000;padding:0.5rem 1rem;border-radius:50px;font-weight:bold;cursor:pointer;">
        로그아웃
      </button>
    </div>
  `;
}

// ✅ 채팅 전송 함수
function sendMessage() {
  const text = document.getElementById("chatInput").value.trim();
  if (text === "") return;

  const user = auth.currentUser;
  if (!user) {
    alert("로그인 후 이용해주세요.");
    return;
  }

  // ✅ 프로필 테두리 랜덤 색상
  const colors = ["#FF4C4C", "#FFB84C", "#4CFF8F", "#4CCAFF", "#B84CFF", "#FFD24C"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const messageHTML = `
    <div class="chat-message" style="display:flex;align-items:center;margin:8px 0;">
      <img src="${user.photoURL}" 
           class="chat-profile" 
           style="width:40px;height:40px;border-radius:50%;border:2px solid ${randomColor};margin-right:8px;">
      <div style="background:#1e1e1e;color:white;padding:6px 10px;border-radius:8px;max-width:80%;">
        <span class="chat-username" style="font-weight:600;color:${randomColor};">${user.displayName}</span><br>
        ${text}
      </div>
    </div>
  `;

  chatMessages.insertAdjacentHTML("beforeend", messageHTML);
  document.getElementById("chatInput").value = "";
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
