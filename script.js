// script.js
import { auth, provider, db } from "./firebase-config.js";
import { signInWithPopup, signOut, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const loginBtn = document.querySelector(".login-button");
const logoutBtn = document.querySelector(".logout-button");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

const messagesRef = collection(db, "live_chat");

// ✅ 로그인
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error("로그인 오류:", e);
  }
});

// ✅ 로그아웃
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// ✅ 로그인 상태 감지
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    chatInput.disabled = false;
    sendMessageBtn.disabled = false;
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    chatInput.disabled = true;
    sendMessageBtn.disabled = true;
  }
});

// ✅ 메시지 전송
sendMessageBtn.addEventListener("click", async () => {
  if (!chatInput.value.trim()) return;
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(messagesRef, {
    name: user.displayName || "익명",
    photoURL: user.photoURL || "https://i.imgur.com/6VBx3io.png",
    message: chatInput.value.trim(),
    timestamp: serverTimestamp(),
  });

  chatInput.value = "";
});

// ✅ 실시간 메시지 수신
const q = query(messagesRef, orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
  chatMessages.innerHTML = "";
  snapshot.forEach((doc) => {
    const data = doc.data();
    const messageEl = document.createElement("div");
    messageEl.classList.add("chat-message");
    messageEl.innerHTML = `
      <div class="chat-item">
        <img src="${data.photoURL}" class="chat-profile">
        <div class="chat-text">
          <strong>${data.name}</strong>
          <p>${data.message}</p>
        </div>
      </div>`;
    chatMessages.appendChild(messageEl);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
