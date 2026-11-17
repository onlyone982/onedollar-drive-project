// 메인 페이지: 커뮤니티 최근 게시물 6개 미리보기
// posts 컬렉션을 createdAt 최신순으로 읽습니다. (보안 규칙: posts 는 누구나 읽기 가능)
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { t, onLangChange } from "./common.js";
import { avatarSvg } from "./avatars.js";

const SHOW = 6;
const grid = document.getElementById("cmPreviewGrid");
let posts = null; // null = 아직 안 불러옴

const REV_ICON = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 22a11 11 0 1 1 22 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><line x1="16" y1="22" x2="23" y2="15" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="22" r="2.6" fill="currentColor"/></svg>`;
const OFFICIAL = `<svg class="av" width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#fff"/><text x="32" y="40.5" text-anchor="middle" font-family="Pretendard Variable, Pretendard, sans-serif" font-weight="800" font-size="23" letter-spacing="-1" fill="#000">$1</text></svg>`;

function tile(p) {
  const a = document.createElement("a");
  a.className = "cmp-tile glow";
  a.href = `community.html?p=${encodeURIComponent(p.id)}`;

  const img = document.createElement("img");
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = p.carName || "";
  img.src = p.images?.[0]?.url || "";

  const cap = document.createElement("span");
  cap.className = "cmp-cap";
  if (p.carName) {
    const plate = document.createElement("span");
    plate.className = "cmp-plate";
    plate.textContent = p.carName;
    cap.appendChild(plate);
  }
  const meta = document.createElement("span");
  meta.className = "cmp-meta";
  const who = document.createElement("span");
  who.className = "cmp-who";
  who.innerHTML = p.featured?.nickname ? avatarSvg(p.featured.avatarId, 22) : OFFICIAL;
  const name = document.createElement("span");
  name.textContent = p.featured?.nickname || t("cm.official");
  who.appendChild(name);
  const revs = document.createElement("span");
  revs.className = "cmp-revs";
  revs.innerHTML = REV_ICON;
  revs.append((p.likeCount || 0).toLocaleString());
  meta.append(who, revs);
  cap.appendChild(meta);

  a.append(img, cap);
  return a;
}

function render() {
  if (!posts) return;
  grid.removeAttribute("aria-busy");
  if (!posts.length) {
    const empty = document.createElement("div");
    empty.className = "cmp-empty";
    const p = document.createElement("p");
    p.textContent = t("home.garageEmpty");
    empty.appendChild(p);
    grid.replaceChildren(empty);
    return;
  }
  grid.replaceChildren(...posts.map(tile));
}

async function load() {
  try {
    // 숨김 처리된 글을 빼고도 6개가 남도록 조금 넉넉히 읽음
    const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(SHOW * 2)));
    posts = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.hidden).slice(0, SHOW);
  } catch (e) {
    console.warn("community preview:", e.code || e.message);
    posts = [];
  }
  render();
}

if (grid) {
  onLangChange(render);
  // 화면 가까이 왔을 때 불러오기 (첫 화면의 차고 사진을 먼저 띄우기 위해)
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); load(); }
    }, { rootMargin: "600px 0px" });
    io.observe(grid);
  } else {
    load();
  }
}
