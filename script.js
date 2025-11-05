// ✅ Firebase 불러오기
import { 
  getFirestore, collection, addDoc, onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { app } from "./firebase-config.js";

const db = getFirestore(app);
const auth = getAuth(app);

// ✅ DOM 요소
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

// ✅ 랜덤 색상 지정 함수
function randomColor() {
  const colors = ["#ffcc00", "#00ffcc", "#ff6699", "#00ff00", "#66a3ff", "#ff9933", "#cc66ff"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ✅ Firestore 실시간 수신
const messagesRef = collection(db, "live_chat");
onSnapshot(query(messagesRef, orderBy("timestamp", "asc")), (snapshot) => {
  chatMessages.innerHTML = "";
  snapshot.forEach((doc) => {
    const data = doc.data();
    const color = data.color || "#ffcc00"; // 색상 없으면 기본값
    const messageEl = document.createElement("div");
    messageEl.classList.add("chat-message");
    messageEl.innerHTML = `
      <img src="${data.photoURL}" class="chat-profile" style="border-color:${color};">
      <div>
        <span class="chat-username">${data.name}</span>
        <span>${data.message}</span>
      </div>`;
    chatMessages.appendChild(messageEl);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// ✅ 메시지 전송 함수
async function sendMessage() {
  if (!chatInput.value.trim()) return;
  const user = auth.currentUser;
  if (!user) {
    alert("로그인 후 이용해주세요.");
    return;
  }

  const color = randomColor();

  await addDoc(messagesRef, {
    name: user.displayName,
    photoURL: user.photoURL,
    message: chatInput.value.trim(),
    color: color,
    timestamp: new Date()
  });

  chatInput.value = "";
}

// ✅ 클릭으로 전송
sendMessageBtn.addEventListener("click", sendMessage);

// ✅ 엔터키로 전송
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// ✅ 로그인 상태 감시
onAuthStateChanged(auth, (user) => {
  if (user) {
    chatInput.disabled = false;
    sendMessageBtn.disabled = false;
    chatInput.placeholder = "메시지를 입력하세요...";
  } else {
    chatInput.disabled = true;
    sendMessageBtn.disabled = true;
    chatInput.placeholder = "로그인 후 메시지를 입력하세요...";
  }
});
