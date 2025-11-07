import { auth, provider, db } from "./firebase-config.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// HTML 요소 참조
const loginBtn = document.querySelector(".login-button");
const logoutBtn = document.querySelector(".logout-button");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const chatMessages = document.getElementById("chatMessages");

// ✅ 1. 구글 로그인
window.signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error("로그인 실패:", e);
  }
};

// ✅ 2. 로그아웃
window.signOutFromGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("로그아웃 실패:", e);
  }
};

// ✅ 3. 로그인 상태 감시
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("로그인됨:", user.displayName);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    chatInput.disabled = false;
    sendMessageBtn.disabled = false;
  } else {
    console.log("로그아웃됨");
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    chatInput.disabled = true;
    sendMessageBtn.disabled = true;
  }
});

// ✅ 4. 채팅 전송 기능
const messagesRef = collection(db, "messages");

async function sendMessage() {
  const user = auth.currentUser;
  const text = chatInput.value.trim();
  if (!user || !text) return;

  // 🔥 랜덤 색상 생성
  const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;

  await addDoc(messagesRef, {
    text,
    uid: user.uid,
    name: user.displayName,
    photoURL: user.photoURL,
    color: randomColor,
    timestamp: serverTimestamp(),
  });

  chatInput.value = "";
}

// ✅ Enter 키로도 전송
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// 버튼 클릭으로도 전송
sendMessageBtn.addEventListener("click", sendMessage);

// ✅ 5. Firestore에서 메시지 실시간 수신
const q = query(messagesRef, orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
  chatMessages.innerHTML = "";
  snapshot.forEach((doc) => {
    const msg = doc.data();
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat-message");

    messageDiv.innerHTML = `
      <img src="${msg.photoURL || 'default.png'}"
           class="chat-profile"
           style="border-color: ${msg.color || '#7cfc00'};">
      <div>
        <span class="chat-username">${msg.name || '익명'}</span><br>
        <span>${msg.text}</span>
      </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
});
// ====== 후원 팝업 기능 ======
const donateBtn = document.getElementById('donateBtn');
const donatePopup = document.getElementById('donatePopup');
const closePopup = document.getElementById('closePopup');

// 팝업 열기
donateBtn.addEventListener('click', () => {
  donatePopup.style.display = 'flex';
});

// 팝업 닫기
closePopup.addEventListener('click', () => {
  donatePopup.style.display = 'none';
});

// 장바구니 버튼 클릭 → 계좌번호 표시/숨김
document.querySelectorAll('.cart-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const parent = btn.closest('.donate-card');
    const text = parent.querySelector('.account-text');

    if (text.style.display === 'block') {
      text.style.display = 'none';
    } else {
      text.textContent = btn.dataset.account;
      text.style.display = 'block';
    }
  });
});
// 🛒 cart 버튼 클릭 시 계좌번호 표시 / 숨기기
document.querySelectorAll(".cart-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const accountText = btn.nextElementSibling;

    // 이미 열려 있으면 닫기
    if (btn.classList.contains("active")) {
      btn.classList.remove("active");
      accountText.textContent = "";
    } 
    // 닫혀 있으면 열기
    else {
      // 다른 모든 버튼 닫기 (하나만 열리게)
      document.querySelectorAll(".cart-btn").forEach((b) => {
        b.classList.remove("active");
        b.nextElementSibling.textContent = "";
      });
      // 현재 버튼만 활성화
      btn.classList.add("active");
      accountText.textContent = btn.getAttribute("data-account");
    }
  });
});


// 🚀 팝업 닫기 버튼 클릭 시 모든 cart 초기화
document.querySelector(".close-popup")?.addEventListener("click", () => {
  const popup = document.querySelector(".popup");
  popup.style.display = "none";

  // 모든 cart 버튼 및 계좌번호 초기화
  document.querySelectorAll(".cart-btn").forEach((btn) => {
    btn.classList.remove("active");
    const accountText = btn.nextElementSibling;
    if (accountText) accountText.textContent = "";
  });
});

