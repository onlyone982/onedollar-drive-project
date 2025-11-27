// ✅ Firestore - serverTimestamp에 별칭
import {
  getFirestore, collection, addDoc, serverTimestamp as fsServerTimestamp,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ✅ Auth
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// ✅ Realtime Database - serverTimestamp에 별칭
import {
  getDatabase, ref, onDisconnect, set, onValue, serverTimestamp as rtdbServerTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

/* ----------------- 번역 상태 ----------------- */
let currentLang = localStorage.getItem("lang") || "ko";

const translations = {
  en: {
    title: "🔥 Support with just 1$ and complete your dream car! 🔥",
    donateButton: "🔥 Donate Now | Support Dream Car 🔥",
    goalLabel: "Goal Amount: 276262$",
    donorCount: "Donors:",
    greenSupportText: "10% of all donations are given to charity and children’s organizations.",
    popupTitle: "please Become the owner of the future with just 1$.",
    popupClose: "Close",
    chatHeader: "💬 Live Chat",
    sendMessage: "Send",
    rankingHeader: "👑 Donation Ranking 👑",
    onlineLabel: "Users Online: ",
    placeholderBeforeLogin: "Log in first to send a message...",
    placeholderAfterLogin: "Leave your message!",
    accountText: "💳 Account: https://www.paypal.com/ncp/payment/8A53863TW23CA",
    faqTitle: "Frequently Asked Questions (FAQ)",
    faqQ1: "Q: How will the donations be used?",
    faqA1: "10% of your valuable donations will be contributed to charitable organizations such as the Community Chest of Korea. The remaining funds will be used transparently for vehicle purchases and shared driving experiences with donors through a draw — if the donations truly come together, that is😲.",
    faqQ2: "Q: Can I get a refund?",
    faqA2: "If you have a special reason, you may contact us via email. We kindly ask that you log in before making a donation whenever possible. For more details, please refer to our Terms of Service.",
    founderTitle: "Message from the Founder",
    founderMessage: "I've loved cars since childhood. This project is about making our collective dream come true, not just crowdfunding. Thank you for being part of it!",
    googleLoginBtn: "Google Login / Sign Up",
    logoutBtn: "Logout",
    description: `For those who love cars and the thrill of driving, you've probably dreamed of your very own dream car... Just the thought of it makes your heart race.<br><br>
    When I first got my license and drove a car, I felt an indescribable sense of freedom. Since then, I’ve carried that dream car in my heart.<br><br>
    But with part-time jobs and regular work, it’s nearly impossible to buy one in a lifetime. If not now, when passion and youth are alive,<br><br>
    would I ever feel that rush again before I die?<br><br>
    So I thought simply — if we all have that same burning dream car, what if we make it real together?<br><br>
    Let’s create the days when we can all ride our dream cars — together.`,
    videoSpecs: `<strong>Specs Summary:</strong><br />
    - Max Power: 518 hp<br />
    - 0→100 km/h: 3.2 s<br />
    - Top Speed: 312 km/h<br />
    - Weight: approx. 1,450 kg<br />
    - Price: around 241,300$ `
  },
  ko: {
    title: "🔥 천 원만 후원하고 여러분의 드림카를 완성해 주세요! 🔥",
    donateButton: "🔥 지금 후원하기 | Donate Now",
    goalLabel: "목표금액: ₩400,000,000",
    donorCount: "후원자 수: ",
    greenSupportText: "전체 기부금의 10%는 불우이웃 및 어린이 단체에 기부됩니다.",
    popupTitle: "천원으로 미래의 주인공이 되어주세요.",
    popupClose: "닫기",
    chatHeader: "💬 실시간 채팅",
    sendMessage: "보내기",
    rankingHeader: "👑 미래의 오너분들 👑",
    onlineLabel: "현재 접속자수: ",
    placeholderBeforeLogin: "로그인 후 메시지를 입력하세요...",
    placeholderAfterLogin: "메시지를 남겨주세요!",
    accountText: "💳 계좌번호:국민은행:908901-00-042802 (옐로우 호라이즌)",
    faqTitle: "자주 묻는 질문 (FAQ)",
    faqQ1: "Q: 후원은 실제로 어디에 사용되나요?",
    faqA1: "여러분의 소중한 후원금의 10%는 자선단체(사랑의 열매등)에 사용되며 이후 자동차 구매 및 추첨을 통해 후원자분들과 운전경험을 공유하여 투명하게 사용될 예정입니다. (만약 후원금이 진짜 모이면요😲)",
    faqQ2: "Q: 후원은 환불 가능한가요?",
    faqA2: "특별한 사유가 있을 경우 이메일로 문의하실 수 있습니다. 가급적 로그인 후 후원해주실 것을 양해드리며 자세한 사항은 이용약관 참고 부탁드립니다.",
    founderTitle: "창립자의 메시지",
    founderMessage: "저는 어릴때나 지금이나 차를 좋아합니다. 이 사이트는 단순한 크라우드 펀딩이 아니라, 모두의 꿈을 현실로 만들고 싶다는 믿음으로 시작했습니다. 여러분의 소중한 후원 감사드립니다!",
    googleLoginBtn: "구글 로그인 / 회원가입",
    logoutBtn: "로그아웃",
    description: `차를 좋아하고 드라이브를 즐기는 사람들이라면 한번쯤은 생각하셨을 나만의 드림카... 생각만 해도 가슴이 두근거립니다.<br><br>
    면허를 따고 난 후 처음 자동차를 접했을 때, 저는 왠지 모를 해방감과 자유를 느꼈습니다. 그때부터 저는 마음속에 나만의 드림카를 품기 시작했습니다.<br><br>
    하지만 제가 하고 있는 아르바이트와 직장으로는 평생 벌어도 사기 힘듭니다. 그러나 젊음의 피와 열정이 끓는 지금이 아니면,<br><br>
    죽기 전에 타더라도 그때의 두근거림과 짜릿함을 느낄 수 있을까요?<br><br>
    그래서 저는 단순히 생각했습니다. 모두가 똑같이 열망하고 갖고 싶어하는 드림카가 있다면, 조금이라도 후원을 받아서 언젠가 우리 모두가 꿈꿔왔던<br><br>
    드림카를 타볼 수 있는 그런 날들을 만들어보자고 말이죠.`,
    videoSpecs: `<strong>스펙 요약:</strong><br />
    - 최고출력: 518마력<br />
    - 0→100km/h: 3.2초<br />
    - 최고속도: 312km/h<br />
    - 무게: 약 1,450kg<br />
    - 가격: 약 3억 원대 (한화 기준)`
  }
};

/* ----------------- 공통 상태 ----------------- */
const db = getFirestore();
const auth = getAuth();
const provider = new GoogleAuthProvider();
const rtdb = getDatabase();

const loginBtn = document.querySelector(".login-button");
const logoutBtn = document.querySelector(".logout-button");
const chatInput = document.getElementById("chatInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const chatMessages = document.getElementById("chatMessages");

const progressBarEl = document.getElementById("progressBar");
const donorCountEl = document.getElementById("donorCount");
const supportAmountEl = document.getElementById("supportAmount");
const rankingListEl = document.getElementById("rankingList");

const GOAL = 400_000_000;
let displayedTotal = 0;
let animTimer = null;
let donorCountValue = 0;

/* ----------------- 로그인 ----------------- */
window.signInWithGoogle = async () => { await signInWithPopup(auth, provider); };
window.signOutFromGoogle = async () => { await signOut(auth); };

onAuthStateChanged(auth, (user) => {
  const isLoggedIn = !!user;
  localStorage.setItem("isLoggedIn", isLoggedIn ? "true" : "false");

  if (loginBtn) loginBtn.style.display = isLoggedIn ? "none" : "inline-block";
  if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "inline-block" : "none";
  if (chatInput) chatInput.disabled = !isLoggedIn;
  if (sendMessageBtn) sendMessageBtn.disabled = !isLoggedIn;

  const lang = localStorage.getItem("lang") || "ko";
  applyLang(lang);

  // Presence
  const uid = user ? user.uid : "guest_" + Date.now();
  const onlineRef = ref(rtdb, "presence/" + uid);
  set(onlineRef, { online: true, ts: rtdbServerTimestamp() });
  onDisconnect(onlineRef).remove();
});

/* ✅ 실시간 접속자 카운트 표시 */
const presenceListRef = ref(rtdb, "presence");
onValue(presenceListRef, (snap) => {
  const count = snap.exists() ? Object.keys(snap.val()).length : 0;
  const countEl = document.getElementById("onlineCount");
  if (countEl) countEl.textContent = count;
});

/* ----------------- 채팅 ----------------- */
const messagesRef = collection(db, "messages");

async function sendMessage() {
  const user = auth.currentUser;
  const text = chatInput.value.trim();
  if (!user || !text) return;

  const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
  await addDoc(messagesRef, {
    text,
    uid: user.uid,
    name: user.displayName,
    photoURL: user.photoURL,
    color: randomColor,
    timestamp: fsServerTimestamp(),
  });

  chatInput.value = "";
}

chatInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
sendMessageBtn?.addEventListener("click", sendMessage);

const qMessages = query(messagesRef, orderBy("timestamp", "asc"));
onSnapshot(qMessages, (snapshot) => {
  chatMessages.innerHTML = "";
  snapshot.forEach((doc) => {
    const msg = doc.data();
    const wrap = document.createElement("div");
    wrap.className = "chat-message";
    wrap.innerHTML = `
      <img src="${msg.photoURL || 'default.png'}" class="chat-profile" style="border-color:${msg.color}">
      <div>
        <span class="chat-username">${msg.name || 'Anonymous'}</span><br>
        <span>${escapeHtml(msg.text ?? '')}</span>
      </div>`;
    chatMessages.appendChild(wrap);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

/* ----------------- 팝업 ----------------- */
document.addEventListener("DOMContentLoaded", () => {
  const donateBtn = document.getElementById("donateBtn");
  const donatePopup = document.getElementById("donatePopup");
  const closePopup = document.getElementById("closePopup");

  if (donateBtn && donatePopup && closePopup) {
    donateBtn.addEventListener("click", () => {
      donatePopup.style.display = "flex";
      document.body.style.overflow = "hidden";
    });

    closePopup.addEventListener("click", () => {
      donatePopup.style.display = "none";
      document.body.style.overflow = "";
      document.querySelectorAll(".account-text").forEach((acc) => (acc.textContent = ""));
      document.querySelectorAll(".cart-btn").forEach((btn) => btn.classList.remove("active"));
    });
  }


document.querySelectorAll(".cart-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const parent = btn.closest(".donate-card");
    const text = parent.querySelector(".account-text");
    const show = text.style.display === "block";

    text.style.display = show ? "none" : "block";

    if (!show) {
      const raw = btn.dataset.account || "";

      // URL 자동 링크 변환
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const html = raw.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" style="color:#0066ff; text-decoration: underline;">${url}</a>`;
      });

      text.innerHTML = html;   // 링크 활성화
    }

    btn.classList.toggle("active", !show);
  });
 });
});

/* ----------------- 후원 랭킹 & 게이지 ----------------- */
onSnapshot(collection(db, "donations"), (snapshot) => {
  const donations = snapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    amount: Number(doc.data().amount) || 0
  }));

  // ⭐ 후원 총액 계산
  const totalAmount = donations.reduce((a, b) => a + b.amount, 0);

  // ⭐ 게이지 업데이트 (핵심 1)
  animateGauge(totalAmount);

  // 순위 계산
  const sorted = donations
    .sort((a, b) => b.amount - a.amount)
    .map((d, i) => ({ ...d, rank: i + 1 }));

  // 애니메이션 적용된 업데이트 함수 실행
  animateRankingUpdate(sorted);

  // 기존 기능 유지 (progress bar, count 등)
  renderDonorInfo(sorted.length, totalAmount);
});
function animateRankingUpdate(newRankings) {
  const list = document.getElementById("rankingList");
  const items = Array.from(list.children);

  // 1️⃣ 기존 요소 위치 저장
  const oldPositions = {};
  items.forEach(item => {
    oldPositions[item.dataset.id] = item.getBoundingClientRect().top;
  });

  // 2️⃣ 새 순서대로 DOM 재정렬
  newRankings.forEach((donor, index) => {
    let li = list.querySelector(`[data-id="${donor.id}"]`);
    
    // 새 요소가 없다면 생성
    if (!li) {
      li = document.createElement("li");
      li.classList.add("ranking-item");
      li.dataset.id = donor.id;
      list.appendChild(li);
    }

    // 내용 업데이트
    li.innerHTML = `
      <span class="rank">${donor.rank}</span>
      <span class="name">${escapeHtml(donor.name)}</span>
      <span class="amount">₩${donor.amount.toLocaleString()}</span>
    `;

    // 실제 DOM 위치 이동
    list.insertBefore(li, list.children[index]);
  });

  // 3️⃣ 새 위치 계산 → 애니메이션 적용
  Array.from(list.children).forEach(item => {
    const id = item.dataset.id;
    const oldPos = oldPositions[id];
    const newPos = item.getBoundingClientRect().top;

    if (oldPos !== undefined) {
      const delta = oldPos - newPos;

      item.style.transition = "none";
      item.style.transform = `translateY(${delta}px)`;

      requestAnimationFrame(() => {
        item.style.transition = "transform 0.35s ease";
        item.style.transform = "";
      });
    }
  });
}


function animateGauge(targetTotal) {
  if (animTimer) clearInterval(animTimer);
  const duration = 1200;
  const frameRate = 20;
  const frames = duration / frameRate;
  const delta = (targetTotal - displayedTotal) / frames;
  let f = 0;
  animTimer = setInterval(() => {
    f++;
    displayedTotal += delta;
    if (f >= frames) {
      displayedTotal = targetTotal;
      clearInterval(animTimer);
    }
    const percent = Math.min((displayedTotal / GOAL) * 100, 100);
    progressBarEl.style.width = `${percent}%`;
    progressBarEl.textContent = `₩${Math.floor(displayedTotal).toLocaleString()} / ₩${GOAL.toLocaleString()}`;
  }, frameRate);
}

/* ----------------- 번역 적용 ----------------- */
function updateDonorCountUI() {
  const lang = localStorage.getItem("lang") || "ko";
  const t = translations[lang];
  donorCountEl.textContent = `${t.donorCount} ${donorCountValue}`;
}

function renderDonorInfo(count, total) {
  donorCountValue = count;
  updateDonorCountUI();
  supportAmountEl.textContent = `₩${Math.round(total * 0.1).toLocaleString()}`;
}

function applyLang(lang) {
  currentLang = lang;
  const t = translations[lang];

  document.getElementById("title").innerHTML = t.title;
  document.getElementById("donateBtn").innerHTML = t.donateButton;
  document.getElementById("goalLabel").innerHTML = t.goalLabel;
  document.querySelector(".green-support-text").innerHTML = t.greenSupportText;
  document.getElementById("closePopup").innerHTML = t.popupClose;
  document.getElementById("videoSpecs").innerHTML = t.videoSpecs;
  document.getElementById("description").innerHTML = t.description;

  if (loginBtn) loginBtn.innerText = t.googleLoginBtn;
  if (logoutBtn) logoutBtn.innerText = t.logoutBtn;

  // 팝업 제목
  const popupTitle = document.getElementById("popupTitle");
  if (popupTitle) popupTitle.textContent = t.popupTitle;

  // 보내기 버튼
  const sendBtn = document.getElementById("sendMessageBtn");
  if (sendBtn) sendBtn.innerText = t.sendMessage;

  // 채팅 헤더
  const chatHeaderText = document.querySelector(".chat-header-text");
  if (chatHeaderText) chatHeaderText.textContent = t.chatHeader;

  // 랭킹 헤더
  const rankingHeader = document.querySelector(".ranking-header");
  if (rankingHeader) rankingHeader.innerHTML = t.rankingHeader;

  // 계좌 텍스트
  document.querySelectorAll(".cart-btn").forEach((btn) => {
    btn.setAttribute("data-account", t.accountText);
  });

  // 채팅 placeholder
  const chatInputEl = document.querySelector("#chatInput");
  if (chatInputEl) {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    chatInputEl.placeholder = isLoggedIn
      ? t.placeholderAfterLogin
      : t.placeholderBeforeLogin;
  }

  // 실시간 접속자 라벨
  const onlineLabel = document.getElementById("onlineLabel");
  if (onlineLabel) onlineLabel.textContent = t.onlineLabel;

  // FAQ / 창립자
  const faqTitleEl = document.querySelector(".faq h3");
  if (faqTitleEl) faqTitleEl.innerText = t.faqTitle;
  const faqParas = document.querySelectorAll(".faq p");
  if (faqParas[0])
    faqParas[0].innerHTML = `<strong>${t.faqQ1}</strong><br>${t.faqA1}`;
  if (faqParas[1])
    faqParas[1].innerHTML = `<strong>${t.faqQ2}</strong><br>${t.faqA2}`;
  const founderTitleEl = document.querySelector(".founder-message h3");
  const founderMsgEl = document.querySelector(".founder-message p");
  if (founderTitleEl) founderTitleEl.innerText = t.founderTitle;
  if (founderMsgEl) founderMsgEl.innerHTML = t.founderMessage;

  // 후원자 수 라벨 동기화
  updateDonorCountUI();
}

/* ----------------- 언어 토글 ----------------- */
function toggleLang() {
  currentLang = currentLang === "ko" ? "en" : "ko";
  localStorage.setItem("lang", currentLang);
  applyLang(currentLang);
}

// 초기 로드
window.addEventListener("DOMContentLoaded", () => {
  applyLang(currentLang);
});

/* ----------------- 유틸 ----------------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
document.getElementById("copyLinkBtn")?.addEventListener("click", async () => {
  const url = window.location.href;

  try {
    await navigator.clipboard.writeText(url);
    alert("링크가 복사되었습니다.");
  } catch {
    alert("복사 실패. 주소창에서 직접 복사해주세요.");
  }
});

/* ----------------- 전역 노출 (HTML onclick용) ----------------- */
window.toggleLang = toggleLang;
window.applyLang = applyLang;

