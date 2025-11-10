// ✅ Firebase SDK import
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyDTJFT5aBr2km6_Z-Q8gXdBvkKGxLVmOyo",
  authDomain: "onedollardrive-3bbee.firebaseapp.com",
  projectId: "onedollardrive-3bbee",
  storageBucket: "onedollardrive-3bbee.firebasestorage.app",
  messagingSenderId: "37980557245",
  appId: "1:37980557245:web:9c752ecf11cdb6ff270cd4",
  measurementId: "G-LWQCX5XZ9D"
};
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const auth = getAuth();
const provider = new GoogleAuthProvider();

async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log("로그인 성공:", user.displayName);
    alert(`Welcome, ${user.displayName}!`);
  } catch (error) {
    console.error("Google 로그인 실패:", error.message);
  }
}
window.signInWithGoogle = signInWithGoogle;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

d0ocument.addEventListener("DOMContentLoaded", () => {

  // ✅ 상수
  const GOAL_AMOUNT = 400000000;
  let currentDisplayedTotal = 0;
  const progressBarEl = document.getElementById("progressBar");
  const rankingListEl = document.getElementById("rankingList");

  // ✅ 실시간 후원 데이터 감시
  const qDonations = query(
    collection(db, "donations"),
    orderBy("amount", "desc"),
    orderBy("timestamp", "desc")
  );

  onSnapshot(qDonations, (snapshot) => {
    const donations = [];
    let totalDonation = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const amount = typeof data.amount === "number"
        ? data.amount
        : Number(String(data.amount).replace(/[^0-9]/g, "")) || 0;

      donations.push({
        name: data.name || "Anonymous",
        amount,
        timestamp: data.timestamp || null
      });
      totalDonation += amount;
    });

    // 정렬
    donations.sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      const ta = a.timestamp ? a.timestamp.seconds || 0 : 0;
      const tb = b.timestamp ? b.timestamp.seconds || 0 : 0;
      return tb - ta;
    });

    animateProgressTo(totalDonation);
    renderRanking(donations);
    renderDonorInfo(donations.length, totalDonation);
  });

  // ✅ 게이지 애니메이션
  function animateProgressTo(targetTotal) {
    if (!progressBarEl) return;
    if (progressBarEl._animInterval) {
      clearInterval(progressBarEl._animInterval);
      progressBarEl._animInterval = null;
    }

    targetTotal = Math.max(0, Number(targetTotal) || 0);
    const durationMs = 1200;
    const tickMs = 30;
    const frames = Math.max(1, Math.round(durationMs / tickMs));
    const delta = (targetTotal - currentDisplayedTotal) / frames;
    let frame = 0;

    progressBarEl._animInterval = setInterval(() => {
      frame++;
      currentDisplayedTotal += delta;

      if (frame >= frames) {
        currentDisplayedTotal = targetTotal;
        clearInterval(progressBarEl._animInterval);
        progressBarEl._animInterval = null;
      }

      const percent = Math.min((currentDisplayedTotal / GOAL_AMOUNT) * 100, 100);
      progressBarEl.style.width = percent + "%";
      progressBarEl.textContent = `₩${Math.floor(currentDisplayedTotal).toLocaleString()} / ₩${GOAL_AMOUNT.toLocaleString()}`;
    }, tickMs);
  }

  // ✅ 랭킹
  function renderRanking(donations) {
    if (!rankingListEl) return;
    rankingListEl.innerHTML = "";
    donations.forEach((donor, i) => {
      const item = document.createElement("div");
      item.className = "ranking-item";
      item.innerHTML = `
        <span class="rank">${i + 1}</span>
        <span class="name">${escapeHtml(donor.name)}</span>
        <span class="amount">₩${donor.amount.toLocaleString()}</span>
      `;
      rankingListEl.appendChild(item);
    });
  }

  // ✅ 후원자 수 + 10% 표시
  function renderDonorInfo(count, total) {
    const donorCountEl = document.getElementById("donorCount");
    const supportAmountEl = document.getElementById("supportAmount");

    if (donorCountEl)
      donorCountEl.textContent = `후원자 수: ${count.toLocaleString()}`;
    if (supportAmountEl) {
      const tenPercent = Math.round(total * 0.1);
      supportAmountEl.textContent = `₩${tenPercent.toLocaleString()}`;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
});
