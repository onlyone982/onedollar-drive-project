// 모든 페이지 공통 헤더: 스크롤하면 어두운 배경, 모바일 메뉴 열고 닫기
import { t, onLangChange } from "./common.js";

const header = document.getElementById("siteHeader");
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

/* 상단 메뉴: 차고(메인) 위에서는 투명, 그 아래로 내려가면 어두운 배경.
   차고가 없는 페이지(커뮤니티 등)는 조금만 스크롤해도 어두운 배경. */
if (header) {
  const garage = document.getElementById("garage");
  const onScroll = () => {
    const limit = garage ? garage.offsetHeight - header.offsetHeight : 8;
    header.classList.toggle("is-solid", window.scrollY > limit);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
}

/* 모바일 메뉴 */
if (menuToggle && mainNav) {
  const label = () => t(menuToggle.getAttribute("aria-expanded") === "true" ? "aria.menuClose" : "aria.menuOpen");
  const setOpen = (open) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", label());
    mainNav.classList.toggle("is-open", open);
    header?.classList.toggle("menu-open", open);
  };
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mainNav.classList.contains("is-open")) { setOpen(false); menuToggle.focus(); }
  });
  onLangChange(() => menuToggle.setAttribute("aria-label", label()));
  menuToggle.setAttribute("aria-label", label());
}
