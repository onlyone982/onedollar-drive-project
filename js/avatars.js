// 사이트 기본 아바타 (구글 프로필 사진 대신 사용)
// id는 숫자이며 Firestore 보안 규칙(0~7)과 맞춰야 합니다.
const ICONS = {
  car: `<path d="M14 38h36l-3-9c-1-3-3-5-6-5H23c-3 0-5 2-6 5z" fill="currentColor"/><rect x="11" y="37" width="42" height="9" rx="4" fill="currentColor"/><circle cx="20" cy="47" r="5" fill="#111"/><circle cx="44" cy="47" r="5" fill="#111"/><path d="M22 29h20l2 6H20z" fill="#111" opacity=".35"/>`,
  helmet: `<path d="M14 40c0-12 8-21 19-21 10 0 17 8 17 18v5H22c-4 0-8-1-8-2z" fill="currentColor"/><path d="M33 29h17v8H31z" fill="#111" opacity=".55"/><rect x="18" y="42" width="30" height="4" rx="2" fill="currentColor" opacity=".7"/>`,
  wheel: `<circle cx="32" cy="32" r="17" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="32" cy="32" r="5" fill="currentColor"/><path d="M15 30h12M37 30h12M32 37v12" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`,
  tire: `<circle cx="32" cy="32" r="19" fill="currentColor"/><circle cx="32" cy="32" r="10" fill="#111"/><circle cx="32" cy="32" r="4" fill="currentColor"/><path d="M32 13v5M32 46v5M13 32h5M46 32h5M19 19l3 3M42 42l3 3M45 19l-3 3M22 42l-3 3" stroke="#111" stroke-width="2.5"/>`,
  flag: `<path d="M18 14v38" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M20 15h28v20H20z" fill="currentColor"/><path d="M20 15h7v5h-7zM34 15h7v5h-7zM27 20h7v5h-7zM41 20h7v5h-7zM20 25h7v5h-7zM34 25h7v5h-7zM27 30h7v5h-7zM41 30h7v5h-7z" fill="#111"/>`,
  key: `<circle cx="22" cy="32" r="10" fill="none" stroke="currentColor" stroke-width="6"/><path d="M31 32h21M45 32v7M51 32v5" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>`,
  piston: `<rect x="20" y="13" width="24" height="17" rx="3" fill="currentColor"/><path d="M20 19h24M20 24h24" stroke="#111" stroke-width="2"/><path d="M32 30v14" stroke="currentColor" stroke-width="6"/><circle cx="32" cy="47" r="6" fill="none" stroke="currentColor" stroke-width="4"/>`,
  cone: `<path d="M26 14h12l9 34H17z" fill="currentColor"/><path d="M23 26h18l2 8H21z" fill="#fff" opacity=".9"/><rect x="12" y="47" width="40" height="5" rx="2" fill="currentColor"/>`,
};

export const AVATARS = [
  { id: 0, icon: "car",    bg: "#ffcc00", fg: "#111" },
  { id: 1, icon: "helmet", bg: "#e2232a", fg: "#fff" },
  { id: 2, icon: "wheel",  bg: "#1f6feb", fg: "#fff" },
  { id: 3, icon: "tire",   bg: "#2b2f36", fg: "#ffcc00" },
  { id: 4, icon: "flag",   bg: "#f3f4f6", fg: "#111" },
  { id: 5, icon: "key",    bg: "#3ddc84", fg: "#111" },
  { id: 6, icon: "piston", bg: "#8b5cf6", fg: "#fff" },
  { id: 7, icon: "cone",   bg: "#ff7a1a", fg: "#111" },
];

export function avatarSvg(id, size = 36) {
  const a = AVATARS[Number(id)] || AVATARS[0];
  return `<svg class="av" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" style="color:${a.fg}"><circle cx="32" cy="32" r="32" fill="${a.bg}"/>${ICONS[a.icon]}</svg>`;
}
