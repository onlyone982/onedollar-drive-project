import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { ROUND_ID, FREE_ENTRIES_PER_DAY } from "./config.js";
import { onAccount, requireProfile } from "./account.js";

const $ = (id) => document.getElementById(id);

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
// 공식 규칙에서 제외한 주가 있으면 여기에 넣으세요(예: ["NY","FL","RI"]).
const EXCLUDED_STATES = [];

$("perDay").textContent = FREE_ENTRIES_PER_DAY;
const sel = $("state");
sel.innerHTML = `<option value="">Select…</option>` +
  US_STATES.filter((s) => !EXCLUDED_STATES.includes(s)).map((s) => `<option>${s}</option>`).join("");

$("loginInline").addEventListener("click", () => requireProfile());

function show(kind, text) {
  $("msg").innerHTML = "";
  if (!text) return;
  const n = document.createElement("div");
  n.className = `notice ${kind}`;
  n.textContent = text;
  $("msg").appendChild(n);
}

// UTC 기준 날짜 (보안 규칙과 같은 계산)
function utcDayNumber(d = new Date()) {
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

let user = null;

onAccount(async (acct) => {
  user = acct.user && acct.profile ? acct.user : null;
  $("needLogin").hidden = !!user;
  $("entryForm").hidden = !user;
  $("myEntries").textContent = "";
  show();
  if (!user) return;

  // 경품 응모는 18세 이상만
  if (acct.profile.ageBand !== "adult") {
    $("entryForm").hidden = true;
    show("info", "Sweepstakes entry is for people 18 and older. You can still enjoy the community!");
    return;
  }

  $("email").value = user.email || "";
  if (!$("fullName").value) $("fullName").value = user.displayName || "";

  // 회차 상태 확인
  const roundSnap = await getDoc(doc(db, "rounds", ROUND_ID)).catch(() => null);
  const status = roundSnap?.exists() ? roundSnap.data().status : "upcoming";
  if (status !== "open") {
    show("info", "Entries for this round are not open right now. Please check back when the round opens.");
    $("submitBtn").disabled = true;
  }

  // 오늘 이미 응모했는지
  const today = utcDayNumber();
  const mine = await getDoc(doc(db, "rounds", ROUND_ID, "freeEntries", `${user.uid}_${today}`)).catch(() => null);
  if (mine?.exists()) {
    show("ok", "You're in for today. Come back tomorrow (00:00 UTC) for another free entry.");
    $("submitBtn").disabled = true;
  }

  loadMyEntries();
});

async function loadMyEntries() {
  try {
    const free = await getDocs(query(collection(db, "rounds", ROUND_ID, "freeEntries"), where("uid", "==", user.uid)));
    let paid = 0;
    if (user.email) {
      const p = await getDocs(query(collection(db, "rounds", ROUND_ID, "entries"), where("email", "==", user.email.toLowerCase())));
      p.forEach((d) => { paid += Number(d.data().entries) || 0; });
    }
    const freeCount = free.size * FREE_ENTRIES_PER_DAY;
    $("myEntries").textContent = `Your entries this round: ${freeCount + paid} (free ${freeCount} · with purchase ${paid})`;
  } catch (e) {
    console.warn("entries lookup failed", e.code);
  }
}

$("entryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!user) return;
  const name = $("fullName").value.trim();
  const state = sel.value;
  if (name.length < 2 || !state || !$("adult").checked || !$("agree").checked) {
    show("err", "Please fill in every field and tick both boxes.");
    return;
  }
  const day = utcDayNumber();
  $("submitBtn").disabled = true;
  try {
    await setDoc(doc(db, "rounds", ROUND_ID, "freeEntries", `${user.uid}_${day}`), {
      uid: user.uid,
      name,
      email: (user.email || "").toLowerCase(),
      state,
      day,
      entries: FREE_ENTRIES_PER_DAY,
      createdAt: serverTimestamp(),
    });
    show("ok", "Entry received. Good luck! Come back tomorrow for another free entry.");
    window.gtag?.("event", "free_entry");
    loadMyEntries();
  } catch (err) {
    console.error(err);
    show("err", err.code === "permission-denied"
      ? "We couldn't accept this entry. You may have already entered today, or the round is closed."
      : "Something went wrong. Please try again.");
    $("submitBtn").disabled = false;
  }
});
