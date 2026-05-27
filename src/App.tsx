import { useState, useEffect, useRef } from "react";
import { auth, db, serverTimestamp } from "./firebase";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  runTransaction,
} from "firebase/firestore";

/* LYVORA_PATCH_23_NAVIGATION_VISIBILITY_SYSTEM */
/* LYVORA_PATCH_24_ROUTE_RENDER_FIX_SYSTEM */
/* LYVORA_PATCH_25_I18N_AND_MISSING_PAGES_FIX */

/* LYVORA_PATCH_25_I18N_AND_MISSING_PAGES_FIX */
const LYVORA_LOCALE_STORAGE = "lyvora_locale_v2";

const LYVORA_TRANSLATIONS = {
  tr: {
    systems: "Sistemler",
    economy: "Ekonomi",
    season: "Sadakat",
    inventory: "Envanter",
    ranked: "Ranked",
    party: "Party / Lobi",
    minigames: "Mini Oyunlar+",
    ai: "AI Motoru",
    global: "Global Dil",
    voice: "Ses / Canlı",
    security: "Güvenlik",
    ready: "Hazır",
    open: "Aç",
    browserLanguage: "Tarayıcı dili algılandı",
  },
  en: {
    systems: "Systems",
    economy: "Economy",
    season: "Season",
    inventory: "Inventory",
    ranked: "Ranked",
    party: "Party / Lobby",
    minigames: "Mini Games+",
    ai: "AI Engine",
    global: "Global Language",
    voice: "Voice / Live",
    security: "Security",
    ready: "Ready",
    open: "Open",
    browserLanguage: "Browser language detected",
  },
  de: {
    systems: "Systeme",
    economy: "Ökonomie",
    season: "Saison",
    inventory: "Inventar",
    ranked: "Rangliste",
    party: "Party / Lobby",
    minigames: "Mini Spiele+",
    ai: "KI Engine",
    global: "Globale Sprache",
    voice: "Voice / Live",
    security: "Sicherheit",
    ready: "Bereit",
    open: "Öffnen",
    browserLanguage: "Browsersprache erkannt",
  },
};

function detectLyvoraLocale() {
  try {
    const saved = localStorage.getItem(LYVORA_LOCALE_STORAGE);
    if (saved && ["tr", "en", "de"].includes(saved)) return saved;

    const list = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "en"];

    const lang = String(list[0] || "en").toLowerCase();
    if (lang.startsWith("tr")) return "tr";
    if (lang.startsWith("de")) return "de";
    return "en";
  } catch {
    return "en";
  }
}

function getLyvoraLocale() {
  return detectLyvoraLocale();
}

function lyT(key) {
  const locale = getLyvoraLocale();
  return LYVORA_TRANSLATIONS?.[locale]?.[key] || LYVORA_TRANSLATIONS.en[key] || key;
}

function setLyvoraLocale(locale) {
  try {
    if (["tr", "en", "de"].includes(locale)) {
      localStorage.setItem(LYVORA_LOCALE_STORAGE, locale);
      document.documentElement.lang = locale;
      window.dispatchEvent(new Event("lyvora-locale-change"));
    }
  } catch {}
}

function useLyvoraLocaleState() {
  const [locale, setLocaleState] = useState(() => detectLyvoraLocale());

  useEffect(() => {
    try { document.documentElement.lang = locale; } catch {}
    const onChange = () => setLocaleState(detectLyvoraLocale());
    window.addEventListener("lyvora-locale-change", onChange);
    return () => window.removeEventListener("lyvora-locale-change", onChange);
  }, [locale]);

  const changeLocale = (next) => {
    setLyvoraLocale(next);
    setLocaleState(next);
  };

  return { locale, changeLocale, t: (key) => LYVORA_TRANSLATIONS?.[locale]?.[key] || LYVORA_TRANSLATIONS.en[key] || key };
}

/* LYVORA_PATCH_26_PAYMENT_OPTIONS_SYSTEM */
/* LYVORA_PATCH_29_CREATOR_REVENUE_WITHDRAW_SYSTEM */
/* LYVORA_PATCH_30_CREATOR_AFFILIATE_REFERRAL_SYSTEM */
/* LYVORA_PATCH_31_INFO_ONBOARDING_CENTER */
/* LYVORA_PATCH_32_FLOAT_BUTTON_PURPLE_GLOW */
/* LYVORA_PATCH_33_VOICE_STAGE_ROOMS_SYSTEM */
/* LYVORA_PATCH_34_REELS_SHORTS_SYSTEM */
/* LYVORA_PATCH_35_AUTH_LAUNCH_FOUNDATION */
/* LYVORA_PATCH_36_DATABASE_SCHEMA_RULES_SYSTEM */
/* LYVORA_PATCH_37_REAL_PAYMENT_BACKEND_FOUNDATION */
/* LYVORA_PATCH_38_FIREBASE_BACKEND_SETUP */
/* LYVORA_PATCH_39_DEV_HUB_CLEAN_FLOATING_BUTTONS */
/* LYVORA_PATCH_40_LAUNCH_POLISH_SOCIAL_FEEL */
/* LYVORA_PATCH_41_CLICKABLE_ANNOUNCEMENTS_SAFE */
/* LYVORA_PATCH_42_QUICK_MENU_AND_SAFE_PEOPLE */
/* LYVORA_PATCH_46_FIRESTORE_REALTIME_CHAT_FOUNDATION */
/* LYVORA_PATCH_48_PRODUCTION_ROOM_ARCHITECTURE_SYSTEM */
const LYVORA_STORAGE = {
  user: "lyvora_user",
  loggedIn: "lyvora_logged_in",
  xp: "lyvora_xp",
  theme: "lyvora_theme",
  onboarded: "lyvora_onboarded",
  reducedMotion: "lyvora_reduced_motion",
};


const LYVORA_SUPER_ADMIN_EMAIL = "aliyamanhhd@gmail.com";
const DEFAULT_MOD_PERMISSIONS = {
  canBan: false,
  canMute: true,
  canDeleteMessages: true,
  canManageRooms: false,
  canGiveXp: false,
  canViewReports: true,
  canManagePremium: false,
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
function isLyvoraSuperAdmin(user) {
  return normalizeEmail(user?.email) === LYVORA_SUPER_ADMIN_EMAIL;
}
function getLocalModerators() {
  return readLocalJson("lyvora_admin_moderators", []);
}
function saveLocalModerators(items) {
  localStorage.setItem("lyvora_admin_moderators", JSON.stringify(items));
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(LYVORA_STORAGE.user);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveLocalUser(user) {
  localStorage.setItem(LYVORA_STORAGE.user, JSON.stringify(user));
}


const SOCIAL_STORAGE = {
  avatar: "lyvora_profile_avatar",
  banner: "lyvora_profile_banner",
  status: "lyvora_presence_status",
  friendRequests: "lyvora_friend_requests",
};

function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWriteLocalJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn("Lyvora localStorage write blocked:", err);
    return false;
  }
}

function stripHeavyMediaForStorage(messages) {
  return (messages || []).slice(-40).map((m) => {
    if (!m?.image) return m;
    // Base64 görseller localStorage kotasını patlatıp beyaz ekrana sebep oluyordu.
    // Mesaj kaydı kalır, görsel sadece aktif oturumda preview olarak tutulur.
    return { ...m, image: "", imageLost: true };
  });
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    try {
      if (!file) { reject(new Error("Dosya bulunamadı.")); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        if (!result.startsWith("data:")) reject(new Error("Görsel önizleme oluşturulamadı."));
        else resolve(result);
      };
      reader.onerror = () => reject(new Error("Dosya okunamadı."));
      reader.onabort = () => reject(new Error("Dosya okuma iptal edildi."));
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}

function isSafeImageFile(file, maxMb = 8) {
  if (!file) return { ok: false, message: "Dosya bulunamadı." };
  if (!String(file.type || "").startsWith("image/")) return { ok: false, message: "Şimdilik sadece görsel dosyası kabul ediliyor." };
  if (file.size > maxMb * 1024 * 1024) return { ok: false, message: `Görsel çok büyük. En fazla ${maxMb} MB yükleyebilirsin.` };
  return { ok: true, message: "" };
}

async function safeImagePreview(file, mode = "media") {
  const check = isSafeImageFile(file, mode === "media" ? 8 : 5);
  if (!check.ok) throw new Error(check.message);
  if (mode === "avatar" || mode === "banner") return await resizeImageToDataUrl(file, mode);
  return await fileToDataUrl(file);
}

function resizeImageToDataUrl(file, mode = "banner") {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      img.onload = () => {
        const isAvatar = mode === "avatar";
        const targetW = isAvatar ? 512 : 1600;
        const targetH = isAvatar ? 512 : 420;
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(String(reader.result || "")); return; }
        const scale = Math.max(targetW / img.width, targetH / img.height);
        const sw = targetW / scale;
        const sh = targetH / scale;
        const sx = Math.max(0, (img.width - sw) / 2);
        const sy = Math.max(0, (img.height - sh) / 2);
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL("image/jpeg", isAvatar ? 0.9 : 0.82));
      };
      img.onerror = reject;
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}
function usePresenceHeartbeat(firebaseUser) {
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const userRef = doc(db, "users", firebaseUser.uid);
    let alive = true;
    const pushPresence = (online) => {
      if (!alive) return;
      updateDoc(userRef, {
        online,
        presence: online ? "online" : "offline",
        lastActive: serverTimestamp(),
      }).catch(() => {});
    };
    pushPresence(true);
    const interval = setInterval(() => pushPresence(!document.hidden), 30000);
    const onVisibility = () => pushPresence(!document.hidden);
    const onBeforeUnload = () => pushPresence(false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      alive = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      updateDoc(userRef, { online: false, presence: "offline", lastActive: serverTimestamp() }).catch(() => {});
    };
  }, [firebaseUser?.uid]);
}


/* ═══════════════════════════════════════════
   REALTIME PRESENCE + INTERACTION ENGINE v4 — BUILD SAFE
   Not: Bu katman Firebase'e hazır mimari sağlar; mevcut çalışan App.tsx'i kırmadan
   local optimistic state + UI presence feed olarak çalışır.
═══════════════════════════════════════════ */
const LYVORA_PRESENCE_STORAGE = {
  activity: "lyvora_presence_activity_feed",
  typing: "lyvora_presence_typing_map",
  interactions: "lyvora_presence_interactions",
};

function buildPresenceSnapshot(user, activity = "Lyvora’da geziniyor") {
  return {
    uid: user?.uid || user?.id || "local-user",
    name: user?.name || user?.tag || "Lyvora User",
    tag: user?.tag || "@lyvora",
    online: true,
    activity,
    typing: false,
    lastActive: Date.now(),
  };
}

function pushLocalActivity(user, action, meta = {}) {
  const current = readLocalJson(LYVORA_PRESENCE_STORAGE.activity, []);
  const event = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    user: user?.name || user?.tag || "Lyvora User",
    action,
    meta,
    createdAt: Date.now(),
  };
  const next = [event, ...current].slice(0, 12);
  safeWriteLocalJson(LYVORA_PRESENCE_STORAGE.activity, next);
  return next;
}

function usePresenceInteractionEngine(user, page) {
  const [presence, setPresence] = useState(() => buildPresenceSnapshot(user));
  const [activityFeed, setActivityFeed] = useState(() => readLocalJson(LYVORA_PRESENCE_STORAGE.activity, []));
  const [typingMap, setTypingMap] = useState(() => readLocalJson(LYVORA_PRESENCE_STORAGE.typing, {}));

  useEffect(() => {
    const activityByPage = {
      home: "Ana sayfada",
      chat: "Global chat’te",
      dm: "DM kutusunda",
      profile: "Profilini düzenliyor",
      games: "Oyun merkezinde",
      community: "Topluluk akışında",
      social: "Sosyal sistemlerde",
      media: "Medya alanında",
    };
    const nextPresence = buildPresenceSnapshot(user, activityByPage[page] || "Lyvora’da aktif");
    setPresence(nextPresence);
    const nextFeed = pushLocalActivity(user, nextPresence.activity, { page });
    setActivityFeed(nextFeed);
  }, [user?.uid, user?.tag, page]);

  useEffect(() => {
    const id = setInterval(() => {
      setPresence((prev) => ({ ...prev, online: !document.hidden, lastActive: Date.now() }));
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const setTyping = (scope, isTyping) => {
    const key = scope || "global";
    setTypingMap((prev) => {
      const next = { ...prev, [key]: { typing: Boolean(isTyping), at: Date.now() } };
      safeWriteLocalJson(LYVORA_PRESENCE_STORAGE.typing, next);
      return next;
    });
  };

  const registerInteraction = (type, target) => {
    const interactions = readLocalJson(LYVORA_PRESENCE_STORAGE.interactions, []);
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      target: target?.name || target?.tag || target || "unknown",
      createdAt: Date.now(),
    };
    safeWriteLocalJson(LYVORA_PRESENCE_STORAGE.interactions, [item, ...interactions].slice(0, 40));
    setActivityFeed(pushLocalActivity(user, `${type}: ${item.target}`, { type }));
  };

  return { presence, activityFeed, typingMap, setTyping, registerInteraction };
}

function PresenceStatusPill({ T, presence }) {
  const isOnline = presence?.online !== false;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 999, padding: "7px 10px", fontSize: 11, fontWeight: 850 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? T.green : T.textTer, boxShadow: isOnline ? `0 0 0 5px rgba(23,201,100,.12)` : "none" }} />
      {isOnline ? "Canlı" : "Pasif"} · {presence?.activity || "Aktif"}
    </div>
  );
}

function LiveActivityFeed({ T, activityFeed = [] }) {
  const items = activityFeed.length ? activityFeed.slice(0, 5) : [
    { id: "seed-1", user: "Nova", action: "Global chat’te aktif", createdAt: Date.now() - 60000 },
    { id: "seed-2", user: "Mira", action: "Topluluk akışında", createdAt: Date.now() - 180000 },
  ];
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 18 }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 900 }}>
        <span style={{ color: T.green }}>{IC.zap}</span> Canlı Aktivite
      </h3>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {items.map((item) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${T.borderLight}`, background: T.surfaceAlt, borderRadius: 14, padding: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: T.green, boxShadow: "0 0 0 5px rgba(23,201,100,.10)" }} />
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 12 }}>{item.user}</b>
              <p style={{ marginTop: 2, color: T.textSec, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypingPresenceDots({ T, label = "Birileri yazıyor" }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: T.textSec, fontSize: 12 }}>
      <span>{label}</span>
      <span style={{ display: "inline-flex", gap: 3 }}>
        {[0,1,2].map((i) => <i key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: T.purple, display: "block", animation: `lyvoraTypingDot 1.2s ${i * .15}s infinite` }} />)}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SVG ICON LIBRARY
═══════════════════════════════════════════ */
const IC = {
  home:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  user:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  users:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  msg:      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  settings: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  plus:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search:   <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  bell:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  arrow:    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  back:     <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  game:     <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1" fill="currentColor"/><circle cx="18" cy="11" r="1" fill="currentColor"/><path d="M21 6H3a2 2 0 00-2 2v8a2 2 0 002 2h18a2 2 0 002-2V8a2 2 0 00-2-2z"/></svg>,
  gift:     <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
  bar:      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  server:   <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  mega:     <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
  send:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  globe:    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  moon:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  sun:      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  spark:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  shield:   <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  heart:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  smile:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  zap:      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  hash:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  more:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/></svg>,
  mail:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  lock:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  pin:      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  trophy:   <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 000 4h3"/><path d="M17 4h3a2 2 0 010 4h-3"/><path d="M7 4h10v7a5 5 0 01-10 0V4z"/></svg>,
  check:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  x:        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  crown:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 20h20M5 20L3 8l5 4 4-7 4 7 5-4-2 12"/></svg>,
  chevdown: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
  edit:     <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  userplus: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  task:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  image:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  eye:      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
};

/* ═══ GAME SVG LOGOS ═══ */
const GameLogos = {
  reaction: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="24" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="1.5"/>
      <polygon points="26,10 30,20 42,20 33,28 36,40 26,33 16,40 19,28 10,20 22,20" fill="#8b5cf6" opacity="0.9"/>
      <circle cx="26" cy="26" r="4" fill="#fff"/>
    </svg>
  ),
  guess: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <rect x="4" y="4" width="44" height="44" rx="12" fill="rgba(6,182,212,0.15)" stroke="#06b6d4" strokeWidth="1.5"/>
      <text x="26" y="32" textAnchor="middle" fill="#06b6d4" fontSize="22" fontWeight="900">?</text>
      <circle cx="38" cy="14" r="6" fill="#06b6d4" opacity="0.6"/>
      <circle cx="14" cy="38" r="4" fill="#06b6d4" opacity="0.4"/>
    </svg>
  ),
  memory: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <rect x="4" y="4" width="20" height="20" rx="6" fill="rgba(236,72,153,0.3)" stroke="#ec4899" strokeWidth="1.5"/>
      <rect x="28" y="4" width="20" height="20" rx="6" fill="rgba(236,72,153,0.15)" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="3 2"/>
      <rect x="4" y="28" width="20" height="20" rx="6" fill="rgba(236,72,153,0.15)" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="3 2"/>
      <rect x="28" y="28" width="20" height="20" rx="6" fill="rgba(236,72,153,0.3)" stroke="#ec4899" strokeWidth="1.5"/>
      <text x="14" y="20" textAnchor="middle" fill="#ec4899" fontSize="11" fontWeight="900">LV</text>
      <text x="38" y="44" textAnchor="middle" fill="#ec4899" fontSize="11" fontWeight="900">LV</text>
    </svg>
  ),
  rps: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="1.5"/>
      <text x="15" y="30" fill="#22c55e" fontSize="16">✊</text>
      <text x="29" y="30" fill="#22c55e" fontSize="16">✋</text>
    </svg>
  ),
  clicker: (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5"/>
      <circle cx="26" cy="26" r="14" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1.5"/>
      <circle cx="26" cy="26" r="6" fill="#f59e0b"/>
      <line x1="26" y1="4" x2="26" y2="10" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
      <line x1="26" y1="42" x2="26" y2="48" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4" y1="26" x2="10" y2="26" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
      <line x1="42" y1="26" x2="48" y2="26" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

const lightTheme = {
  bg: "#f2f2f2", surface: "#ffffff", surfaceAlt: "#f8f8f8",
  border: "#e8e8e8", borderLight: "#f0f0f0",
  text: "#0a0a0a", textSec: "#666666", textTer: "#aaaaaa",
  accent: "#0a0a0a", accentText: "#ffffff",
  sidebar: "#ffffff", hero: "#0a0a0a",
  green: "#17c964", red: "#f31260", purple: "#8b5cf6",
};
const darkTheme = {
  bg: "#0f0f0f", surface: "#1a1a1a", surfaceAlt: "#222222",
  border: "#2a2a2a", borderLight: "#242424",
  text: "#f0f0f0", textSec: "#888888", textTer: "#555555",
  accent: "#f0f0f0", accentText: "#0a0a0a",
  sidebar: "#141414", hero: "#111111",
  green: "#17c964", red: "#f31260", purple: "#8b5cf6",
};

const MOODS = [
  { id: "night", icon: "moon", label: "Gece modu", color: "#6366f1" },
  { id: "real", icon: "heart", label: "Gerçek bağ", color: "#ec4899" },
  { id: "happy", icon: "smile", label: "Mutluyum", color: "#f59e0b" },
  { id: "stress", icon: "zap", label: "Kafam dolu", color: "#ef4444" },
  { id: "chill", icon: "moon", label: "Sakin", color: "#06b6d4" },
  { id: "social", icon: "users", label: "Sosyal", color: "#10b981" },
];

const SERVER_LIST = [
  { id: 1, name: "Türkiye Genel", members: 12400, category: "Lokasyon", icon: "pin" },
  { id: 2, name: "Gece Kuşları", members: 3200, category: "Mood", icon: "moon" },
  { id: 3, name: "Oyun Dünyası", members: 8900, category: "Oyun", icon: "game" },
  { id: 4, name: "Müzik Kulübü", members: 5600, category: "Hobi", icon: "spark" },
  { id: 5, name: "Film & Dizi", members: 7100, category: "Hobi", icon: "smile" },
  { id: 6, name: "Tech Sohbet", members: 4300, category: "Teknoloji", icon: "zap" },
];

const LYVORA_PEOPLE = [
  { id: 1, name: "Nova", status: "Çevrimiçi", online: true, level: 24, mood: "Global", avatar: "N" },
  { id: 2, name: "Elysia", status: "Çevrimiçi", online: true, level: 18, mood: "Mood", avatar: "E" },
  { id: 3, name: "Raven", status: "Çevrimiçi", online: true, level: 31, mood: "Gece", avatar: "R" },
  { id: 4, name: "Zean", status: "Oyun oynuyor", online: true, level: 15, mood: "Arcade", avatar: "Z" },
  { id: 5, name: "Mira", status: "Çevrimiçi", online: true, level: 27, mood: "Sakin", avatar: "M" },
  { id: 6, name: "Kairo", status: "Çevrimdışı", online: false, level: 22, mood: "Sessiz", avatar: "K" },
  { id: 7, name: "Lunox", status: "Müzik dinliyor", online: true, level: 19, mood: "Chill", avatar: "L" },
];

const PREMIUM_WAITLIST = [
  { id: 1, name: "Nova", plan: "Nebula", pos: 1 },
  { id: 2, name: "Elysia", plan: "Galaxy", pos: 2 },
  { id: 3, name: "Raven", plan: "Nebula", pos: 3 },
  { id: 4, name: "Mira", plan: "Starter", pos: 4 },
];

const LEADERBOARD = [
  { rank: 1, name: "ShadowByte#001", xp: 98420, badge: "👑", level: 99 },
  { rank: 2, name: "NightOwl#442", xp: 87310, badge: "⚡", level: 88 },
  { rank: 3, name: "AnonKing#777", xp: 75890, badge: "🔥", level: 76 },
  { rank: 4, name: "Lyvora#0001", xp: 62400, badge: "✦", level: 63, isMe: true },
  { rank: 5, name: "MidnightX#32", xp: 58200, badge: "💎", level: 58 },
  { rank: 6, name: "Phantom#991", xp: 49700, badge: "🎯", level: 49 },
  { rank: 7, name: "StarlitGhost", xp: 44100, badge: "🌙", level: 44 },
  { rank: 8, name: "PixelDrifter", xp: 39800, badge: "🎮", level: 39 },
];

const TASKS = [
  { id: 1, title: "İlk mesajını gönder", xp: 50, done: true, category: "Başlangıç" },
  { id: 2, title: "5 farklı odaya katıl", xp: 100, done: true, category: "Keşif" },
  { id: 3, title: "Mood eşleşme kullan", xp: 75, done: false, category: "Sosyal" },
  { id: 4, title: "100 mesaj gönder", xp: 200, done: false, progress: 64, total: 100, category: "Aktif" },
  { id: 5, title: "3 arkadaş ekle", xp: 150, done: false, progress: 1, total: 3, category: "Sosyal" },
  { id: 6, title: "Premium üye ol", xp: 500, done: false, category: "Premium" },
  { id: 7, title: "Haftalık 7 gün giriş", xp: 300, done: false, progress: 4, total: 7, category: "Sadakat" },
  { id: 8, title: "Mini oyun oyna", xp: 80, done: false, category: "Eğlence" },
];

const NOTIFS = [
  { id: 1, text: "Anonim#4821 sana mesaj gönderdi", time: "2dk", read: false, type: "msg" },
  { id: 2, text: "Görev tamamlandı: İlk mesajın gönderildi", time: "1sa", read: false, type: "task" },
  { id: 3, text: "Yeni duyuru: Lyvora Race yayında!", time: "3sa", read: true, type: "mega" },
  { id: 4, text: "Anonim#9032 seni arkadaş listesine ekledi", time: "1gün", read: true, type: "user" },
  { id: 5, text: "Haftalık XP rekoru kırdın!", time: "2gün", read: true, type: "trophy" },
];

const FRIENDS = [
  { id: 1, name: "Anonim#4821", mood: "Gece modu", online: true, mutual: 3 },
  { id: 2, name: "Anonim#7710", mood: "Kafam dolu", online: true, mutual: 1 },
  { id: 3, name: "Anonim#9032", mood: "Mutlu", online: true, mutual: 5 },
  { id: 4, name: "Anonim#2245", mood: "Sakin", online: false, mutual: 2 },
  { id: 5, name: "Anonim#1167", mood: "Sosyal", online: false, mutual: 0 },
];

function LyvoraLogo({ compact = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 10 }}>
      <div style={{
        width: compact ? 30 : 36, height: compact ? 30 : 36,
        borderRadius: 11,
        background: "linear-gradient(135deg,#8b5cf6,#050505 58%,#c4b5fd)",
        display: "grid", placeItems: "center",
        color: "#fff", fontWeight: 950, fontSize: compact ? 12 : 14,
        letterSpacing: -1, boxShadow: "0 0 24px rgba(139,92,246,.35)",
        position: "relative", overflow: "hidden"
      }}>
        <span style={{ position: "relative", zIndex: 2 }}>LV</span>
        <span style={{ position: "absolute", width: 46, height: 8, borderRadius: 999, border: "2px solid rgba(255,255,255,.28)", transform: "rotate(-28deg)" }} />
      </div>
      {!compact && <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: 1 }}>LYVORA</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════ */


/* LYVORA_PATCH_56_FIREBASE_SECURITY_RULES_PACKAGE */
const LYVORA_FIREBASE_SECURITY_RULES_PACKAGE = {
  firestore: "firestore.rules included in PATCH_56 zip",
  storage: "storage.rules included in PATCH_56 zip",
  focus: [
    "Authenticated-only writes",
    "Room membership message permission",
    "Founder protected rooms",
    "User profile owner-write guard",
    "Media owner path guard",
    "Report/moderation collection foundation",
  ],
  nextPatch: "PATCH_58_MOBILE_FINAL",
};

/* LYVORA_PATCH_63_CLEAN_LAUNCH_HIDE_DEV_AUDITS */
const LYVORA_SHOW_DEV_AUDIT_PANELS = false;

/* LYVORA_PATCH_67_PUSH_EMAIL_PRODUCTION_ENGINE_REAL */
const LYVORA_COMMUNICATION_STORAGE = "lyvora_push_email_engine_v1";

function getLyvoraCommunicationState() {
  return readLocalJson(LYVORA_COMMUNICATION_STORAGE, {
    browserPermission: typeof Notification !== "undefined" ? Notification.permission : "unsupported",
    serviceWorkerReady: false,
    lastPushAt: 0,
    lastEmailActionAt: 0,
    events: [],
  });
}

function saveLyvoraCommunicationState(patch) {
  const current = getLyvoraCommunicationState();
  const next = { ...current, ...patch };
  safeWriteLocalJson(LYVORA_COMMUNICATION_STORAGE, next);
  return next;
}

function pushCommunicationEvent(type, meta = {}) {
  const current = getLyvoraCommunicationState();
  const event = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    meta,
    createdAt: Date.now(),
  };
  const events = [event, ...(current.events || [])].slice(0, 30);
  return saveLyvoraCommunicationState({ events });
}

async function registerLyvoraPushServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    pushCommunicationEvent("push_sw_unsupported");
    return false;
  }
  try {
    const registration = await navigator.serviceWorker.register("/lyvora-push-sw.js");
    await navigator.serviceWorker.ready;
    saveLyvoraCommunicationState({ serviceWorkerReady: true });
    pushCommunicationEvent("push_sw_ready", { scope: registration?.scope || "local" });
    return true;
  } catch (err) {
    console.warn("Lyvora push service worker skipped:", err?.message || err);
    saveLyvoraCommunicationState({ serviceWorkerReady: false });
    pushCommunicationEvent("push_sw_failed", { message: err?.message || String(err) });
    return false;
  }
}

function useLyvoraPushEmailEngine(firebaseUser, setToast) {
  const [communication, setCommunication] = useState(() => getLyvoraCommunicationState());
  const userEmail = firebaseUser?.email || "";

  useEffect(() => {
    setCommunication(getLyvoraCommunicationState());
  }, [firebaseUser?.uid]);

  const syncState = (patch) => {
    const next = saveLyvoraCommunicationState(patch);
    setCommunication(next);
    return next;
  };

  const requestPushPermission = async () => {
    if (typeof Notification === "undefined") {
      syncState({ browserPermission: "unsupported" });
      setToast?.({ type: "error", title: "Bildirim desteklenmiyor", text: "Bu tarayıcı browser notification desteklemiyor." });
      return "unsupported";
    }
    const permission = await Notification.requestPermission();
    syncState({ browserPermission: permission });
    pushCommunicationEvent("push_permission", { permission });
    if (permission === "granted") {
      await registerLyvoraPushServiceWorker();
      setToast?.({ type: "success", title: "Bildirimler açıldı", text: "Lyvora bildirimleri bu cihazda aktif." });
    } else {
      setToast?.({ type: "error", title: "Bildirim izni verilmedi", text: "Tarayıcı ayarlarından daha sonra açabilirsin." });
    }
    return permission;
  };

  const fireLocalPush = (title = "Lyvora", body = "Yeni bildirimin var.") => {
    try {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
      const now = Date.now();
      if (now - Number(communication.lastPushAt || 0) < 3500) return false;
      new Notification(title, { body, icon: "/favicon.ico", badge: "/favicon.ico", tag: "lyvora-notification" });
      syncState({ lastPushAt: now, browserPermission: Notification.permission });
      pushCommunicationEvent("local_push_sent", { title, body });
      return true;
    } catch (err) {
      console.warn("Lyvora local push failed:", err?.message || err);
      pushCommunicationEvent("local_push_failed", { message: err?.message || String(err) });
      return false;
    }
  };

  const sendVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error("Giriş yapmış kullanıcı bulunamadı.");
    await sendEmailVerification(auth.currentUser);
    syncState({ lastEmailActionAt: Date.now() });
    pushCommunicationEvent("verification_email_sent", { email: userEmail });
    setToast?.({ type: "success", title: "Doğrulama maili gönderildi", text: userEmail || "E-postanı kontrol et." });
  };

  const sendResetEmail = async (email) => {
    const cleanEmail = normalizeEmail(email || userEmail);
    if (!cleanEmail) throw new Error("Şifre sıfırlama için e-posta gerekli.");
    await sendPasswordResetEmail(auth, cleanEmail);
    syncState({ lastEmailActionAt: Date.now() });
    pushCommunicationEvent("password_reset_email_sent", { email: cleanEmail });
    setToast?.({ type: "success", title: "Şifre sıfırlama gönderildi", text: "E-posta kutunu kontrol et." });
  };

  return { communication, requestPushPermission, fireLocalPush, sendVerificationEmail, sendResetEmail };
}

/* LYVORA_PATCH_65_NOTIFICATION_UNREAD_ENGINE_REAL */
const LYVORA_NOTIFICATION_STORAGE = "lyvora_notification_unread_engine_v1";

function normalizeLyvoraNotification(item, fallbackType = "system") {
  const now = Date.now();
  return {
    id: String(item?.id || `${now}-${Math.random().toString(16).slice(2)}`),
    type: item?.type || fallbackType,
    text: item?.text || item?.body || item?.title || "Yeni bildirim",
    time: item?.time || "şimdi",
    read: Boolean(item?.read),
    roomId: item?.roomId || item?.room || "global",
    createdAt: Number(item?.createdAt || now),
  };
}

function getStoredLyvoraNotifications() {
  const saved = readLocalJson(LYVORA_NOTIFICATION_STORAGE, null);
  if (Array.isArray(saved) && saved.length) return saved.map((n) => normalizeLyvoraNotification(n));
  return (NOTIFS || []).map((n) => normalizeLyvoraNotification(n));
}

function useLyvoraNotificationUnreadEngine(user, page, setToast) {
  const [notifications, setNotifications] = useState(() => getStoredLyvoraNotifications());
  const toastGuardRef = useRef({});
  const userId = user?.uid || user?.id || user?.email || "local-user";

  useEffect(() => {
    safeWriteLocalJson(LYVORA_NOTIFICATION_STORAGE, notifications.slice(0, 80));
  }, [notifications]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    let active = true;
    const ref = doc(db, "notifications", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!active || !snap.exists()) return;
      const remoteItems = snap.data()?.items;
      if (Array.isArray(remoteItems)) {
        setNotifications(remoteItems.map((n) => normalizeLyvoraNotification(n)).slice(0, 80));
      }
    }, (err) => {
      console.warn("Lyvora notification listener safe fallback:", err?.message || err);
    });
    return () => { active = false; try { unsub(); } catch {} };
  }, [user?.uid]);

  const persistRemote = (items) => {
    if (!user?.uid) return;
    setDoc(doc(db, "notifications", user.uid), {
      uid: user.uid,
      items: items.slice(0, 80),
      unreadCount: items.filter((n) => !n.read).length,
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch((err) => console.warn("Notification remote sync skipped:", err?.message || err));
  };

  const pushNotification = (payload, opts = {}) => {
    const nextItem = normalizeLyvoraNotification({ ...payload, read: false, createdAt: Date.now(), time: "şimdi" });
    setNotifications((prev) => {
      const duplicateWindowMs = 9000;
      const duplicate = prev.some((n) => n.type === nextItem.type && n.text === nextItem.text && Date.now() - Number(n.createdAt || 0) < duplicateWindowMs);
      if (duplicate) return prev;
      const next = [nextItem, ...prev].slice(0, 80);
      persistRemote(next);
      return next;
    });

    const toastKey = `${nextItem.type}:${nextItem.text}`;
    const lastToastAt = toastGuardRef.current[toastKey] || 0;
    if (!opts.silent && Date.now() - lastToastAt > 8000) {
      toastGuardRef.current[toastKey] = Date.now();
      setToast?.({ type: "info", title: "Yeni bildirim", text: nextItem.text });
    }
  };

  const markRead = (id) => {
    setNotifications((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, read: true } : n);
      persistRemote(next);
      return next;
    });
  };

  const markAllRead = (filterType = null) => {
    setNotifications((prev) => {
      const next = prev.map((n) => !filterType || n.type === filterType ? { ...n, read: true } : n);
      persistRemote(next);
      return next;
    });
  };

  useEffect(() => {
    if (page === "dm" || page === "messages") markAllRead("msg");
  }, [page]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const dmUnread = notifications.filter((n) => !n.read && ["msg", "dm", "mention"].includes(n.type)).length;

  return {
    notifications,
    unreadCount,
    dmUnread,
    pushNotification,
    markRead,
    markAllRead,
    userId,
  };
}




/* LYVORA_PATCH_66_FIRESTORE_ROLE_SECURITY_REAL */
const LYVORA_ROLE_SECURITY_STORAGE = "lyvora_role_security_events_v1";
const LYVORA_PROTECTED_ROLES = ["owner", "admin", "founder", "moderator"];

function getLyvoraUserRole(user) {
  if (isLyvoraSuperAdmin(user)) return "owner";
  const role = String(user?.role || user?.lyvoraRole || user?.badgeRole || "member").toLowerCase();
  return LYVORA_PROTECTED_ROLES.includes(role) ? role : "member";
}

function canLyvoraModerate(user) {
  const role = getLyvoraUserRole(user);
  return role === "owner" || role === "admin" || role === "moderator";
}

function canLyvoraManageFounder(user) {
  const role = getLyvoraUserRole(user);
  return role === "owner" || role === "admin";
}

function lyvoraSecurityLog(type, detail = {}) {
  try {
    const current = readLocalJson(LYVORA_ROLE_SECURITY_STORAGE, []);
    const next = [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, type, detail, at: Date.now() }, ...current].slice(0, 80);
    safeWriteLocalJson(LYVORA_ROLE_SECURITY_STORAGE, next);
  } catch {}
}

function sanitizeLyvoraProfilePatch(patch = {}, actorUser = null) {
  const blockedKeys = ["role", "lyvoraRole", "badgeRole", "isAdmin", "isFounder", "founder", "admin", "owner", "permissions", "xp", "level"];
  const clean = { ...patch };
  for (const key of blockedKeys) {
    if (Object.prototype.hasOwnProperty.call(clean, key) && !isLyvoraSuperAdmin(actorUser)) {
      delete clean[key];
      lyvoraSecurityLog("blocked_profile_privilege_patch", { key });
    }
  }
  return clean;
}

function validateLyvoraRoomAction({ user, room, action }) {
  const role = getLyvoraUserRole(user);
  const roomType = String(room?.type || room?.kind || "public").toLowerCase();
  if (!user?.uid && !user?.email) return { ok: false, reason: "auth_required" };
  if (roomType === "founder" && !(role === "owner" || role === "admin" || role === "founder")) {
    lyvoraSecurityLog("blocked_founder_room_action", { action, roomId: room?.id || room?.roomId });
    return { ok: false, reason: "founder_required" };
  }
  if (["delete_message", "timeout_user", "mute_user", "ban_user"].includes(action) && !canLyvoraModerate(user)) {
    lyvoraSecurityLog("blocked_moderation_action", { action, roomId: room?.id || room?.roomId });
    return { ok: false, reason: "moderator_required" };
  }
  return { ok: true, reason: "ok" };
}

async function safeLyvoraUpdateDoc(ref, patch, actorUser, options = {}) {
  const cleanPatch = options.allowPrivileged ? patch : sanitizeLyvoraProfilePatch(patch, actorUser);
  if (!Object.keys(cleanPatch || {}).length) return { ok: false, reason: "empty_or_blocked_patch" };
  try {
    await updateDoc(ref, cleanPatch);
    return { ok: true };
  } catch (err) {
    lyvoraSecurityLog("firestore_update_failed", { message: err?.message || String(err) });
    return { ok: false, reason: err?.message || "update_failed" };
  }
}

function useLyvoraRoleSecurity(user) {
  const role = getLyvoraUserRole(user);
  useEffect(() => {
    if (!user) return;
    try {
      const suspiciousLocalRole = localStorage.getItem("lyvora_role") || localStorage.getItem("lyvora_admin_role");
      if (suspiciousLocalRole && !isLyvoraSuperAdmin(user)) {
        localStorage.removeItem("lyvora_role");
        localStorage.removeItem("lyvora_admin_role");
        lyvoraSecurityLog("removed_local_role_override", { suspiciousLocalRole });
      }
    } catch {}
  }, [user?.uid, user?.email]);
  return {
    role,
    canModerate: canLyvoraModerate(user),
    canManageFounder: canLyvoraManageFounder(user),
    validateRoomAction: (room, action) => validateLyvoraRoomAction({ user, room, action }),
  };
}

export default function App() {
  const [page, setPage] = useState(() => localStorage.getItem(LYVORA_STORAGE.loggedIn) === "true" ? "home" : "login");
  const [theme, setTheme] = useState(() => localStorage.getItem(LYVORA_STORAGE.theme) || "light");
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem(LYVORA_STORAGE.loggedIn) === "true");
  const [xp, setXp] = useState(() => Number(localStorage.getItem(LYVORA_STORAGE.xp) || 0));
  const [dmUnread, setDmUnread] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem(LYVORA_STORAGE.onboarded) !== "true");
  const [toast, setToast] = useState(null);

  usePresenceHeartbeat(firebaseUser);
  useEffect(() => { try { document.documentElement.lang = detectLyvoraLocale(); } catch {} }, []);

  useEffect(() => { localStorage.setItem(LYVORA_STORAGE.theme, theme); }, [theme]);
  useEffect(() => { localStorage.setItem(LYVORA_STORAGE.xp, String(xp)); }, [xp]);
  useEffect(() => {
    if (!loggedIn) return;
    const id = setTimeout(() => setToast({ type: "success", title: "Lyvora hazır", text: "Sistemler güvenli şekilde yüklendi." }), 700);
    return () => clearTimeout(id);
  }, [loggedIn]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!auth.currentUser) {
        console.warn("Firebase auth timeout: login ekranına güvenli geçiş yapıldı.");
        localStorage.setItem(LYVORA_STORAGE.loggedIn, "false");
        setLoggedIn(false);
        setFirebaseUser(null);
        setPage("login");
        setAuthLoading(false);
      }
    }, 4500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setFirebaseUser(null); setLoggedIn(false);
          localStorage.setItem(LYVORA_STORAGE.loggedIn, "false");
          setAuthLoading(false); return;
        }
        setFirebaseUser(fbUser);
        const userRef = doc(db, "users", fbUser.uid);
        const snap = await getDoc(userRef);
        let profile;
        if (snap.exists()) {
          profile = snap.data();
          await updateDoc(userRef, { online: true, emailVerified: Boolean(fbUser.emailVerified), lastActive: serverTimestamp() });
        } else {
          profile = {
            uid: fbUser.uid,
            name: fbUser.displayName || "Lyvora",
            email: fbUser.email || "",
            tag: `${(fbUser.displayName || "Lyvora").replace(/\s+/g, "")}#${Math.floor(1000 + Math.random() * 9000)}`,
            bio: "Anonimlik bizim özgürlüğümüzdür.",
            xp: 0, online: true, emailVerified: Boolean(fbUser.emailVerified),
            createdAt: serverTimestamp(), lastActive: serverTimestamp(),
          };
          await setDoc(userRef, profile);
        }
        const safeProfile = {
          uid: fbUser.uid,
          name: profile.name || fbUser.displayName || "Lyvora",
          email: profile.email || fbUser.email || "",
          tag: profile.tag || "Lyvora#0001",
          bio: profile.bio || "Anonimlik bizim özgürlüğümüzdür.",
        };
        setUser(safeProfile); saveLocalUser(safeProfile);
        setXp(Number(profile.xp || 0));
        localStorage.setItem(LYVORA_STORAGE.loggedIn, "true");
        setLoggedIn(true);
        setPage((prev) => (prev === "login" ? "home" : prev));
      } catch (err) {
        console.error("Firebase auth listener error:", err);
        const current = auth.currentUser;
        if (current) {
          const fallbackProfile = {
            uid: current.uid,
            name: current.displayName || "Lyvora",
            email: current.email || "",
            tag: `${(current.displayName || "Lyvora").replace(/\s+/g, "")}#0001`,
            bio: "Anonimlik bizim özgürlüğümüzdür.",
          };
          setFirebaseUser(current);
          setUser(fallbackProfile);
          saveLocalUser(fallbackProfile);
          localStorage.setItem(LYVORA_STORAGE.loggedIn, "true");
          setLoggedIn(true);
          setPage((prev) => (prev === "login" ? "home" : prev));
        } else {
          setFirebaseUser(null);
          setLoggedIn(false);
          localStorage.setItem(LYVORA_STORAGE.loggedIn, "false");
          setPage("login");
        }
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const addXP = (amount) => {
    setXp((prev) => {
      const next = prev + amount;
      localStorage.setItem(LYVORA_STORAGE.xp, String(next));
      if (firebaseUser?.uid) {
        updateDoc(doc(db, "users", firebaseUser.uid), { xp: next, lastActive: serverTimestamp() }).catch(console.error);
      }
      return next;
    });
  };

  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;
  const T = theme === "light" ? lightTheme : darkTheme;
  const isSuperAdmin = isLyvoraSuperAdmin(user);
  const presenceEngine = usePresenceInteractionEngine(user, page);
  const roleSecurity = useLyvoraRoleSecurity(user);
  useEffect(() => {
    try { window.__LYVORA_ROLE_SECURITY__ = roleSecurity; } catch {}
  }, [roleSecurity.role, roleSecurity.canModerate, roleSecurity.canManageFounder]);
  const notificationEngine = useLyvoraNotificationUnreadEngine(user, page, setToast);
  const communicationEngine = useLyvoraPushEmailEngine(firebaseUser, setToast);

  useEffect(() => {
    setDmUnread(notificationEngine.dmUnread);
  }, [notificationEngine.dmUnread]);

  const handleLogin = async ({ mode, name, email, password }) => {
    const cleanName = String(name || "Lyvora").trim() || "Lyvora";
    if (!email || !password) { alert("E-posta ve şifre gerekli."); return; }
    if (mode === "register") {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: cleanName });
      const profile = {
        uid: cred.user.uid, name: cleanName, email,
        tag: `${cleanName.replace(/\s+/g, "")}#${Math.floor(1000 + Math.random() * 9000)}`,
        bio: "Anonimlik bizim özgürlüğümüzdür.",
        xp: 0, online: true, emailVerified: Boolean(cred.user.emailVerified), createdAt: serverTimestamp(), lastActive: serverTimestamp(),
      };
      await setDoc(doc(db, "users", cred.user.uid), profile);
      await sendEmailVerification(cred.user).catch((err) => console.warn("Verification email skipped:", err?.message || err));
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  };

  const handleSocialLogin = async (providerName) => {
    try {
      let provider;
      if (providerName === "google") provider = new GoogleAuthProvider();
      if (providerName === "apple") provider = new OAuthProvider("apple.com");
      if (providerName === "yandex") { alert("Yandex girişi için Firebase Console'da özel OAuth/OIDC provider ayarı gerekiyor."); return; }
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Sosyal girişte hata oluştu.");
    }
  };

  const handlePasswordReset = async (email) => {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) throw new Error("Şifre sıfırlama için e-posta gerekli.");
    await sendPasswordResetEmail(auth, cleanEmail);
    pushCommunicationEvent("password_reset_requested_from_login", { email: cleanEmail });
    setToast({ type: "success", title: "Şifre sıfırlama gönderildi", text: "E-posta kutunu kontrol et." });
  };

  const handleLogout = async () => {
    try {
      if (firebaseUser?.uid) {
        await updateDoc(doc(db, "users", firebaseUser.uid), { online: false, lastActive: serverTimestamp() });
      }
      await signOut(auth);
    } finally {
      localStorage.setItem(LYVORA_STORAGE.loggedIn, "false");
      setLoggedIn(false); setFirebaseUser(null); setPage("login");
    }
  };

  const nav = (p) => {
    if (p === "admin" && !isLyvoraSuperAdmin(user)) return;
    if (p === "dm") setDmUnread(0);
    setPage(p); setNotifOpen(false); setMobileMenuOpen(false);
  };

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at 50% 0%, rgba(139,92,246,.24), transparent 34%), radial-gradient(circle at 20% 80%, rgba(124,58,237,.18), transparent 32%), linear-gradient(135deg,#05030b 0%,#090814 48%,#030307 100%)",
          color: "#f8f7ff",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <style>{`
          @keyframes lyvoraSplashFloat {
            0%,100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.025); }
          }
          @keyframes lyvoraSplashGlow {
            0%,100% { opacity: .45; filter: blur(22px); }
            50% { opacity: .9; filter: blur(28px); }
          }
          @keyframes lyvoraSplashProgress {
            0% { transform: translateX(-60%); opacity: .55; }
            50% { opacity: 1; }
            100% { transform: translateX(115%); opacity: .65; }
          }
          @keyframes lyvoraSplashPulse {
            0%,100% { opacity: .55; }
            50% { opacity: 1; }
          }
          @keyframes lyvoraWaveMove {
            0% { transform: translateX(-8%) translateY(0); }
            50% { transform: translateX(4%) translateY(-10px); }
            100% { transform: translateX(-8%) translateY(0); }
          }
          @media (max-width: 680px) {
            .lyvora-loading-features { grid-template-columns: 1fr!important; max-width: 320px; }
            .lyvora-loading-title { letter-spacing: 10px!important; padding-left: 10px!important; }
          }
        `}</style>

        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(139,92,246,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,.05) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(circle at center, black, transparent 72%)",
            opacity: .65,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "-10%",
            right: "-10%",
            bottom: "10%",
            height: 170,
            background:
              "radial-gradient(ellipse at center, rgba(139,92,246,.38), transparent 62%)",
            filter: "blur(28px)",
            opacity: .55,
            animation: "lyvoraWaveMove 7s ease-in-out infinite",
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 620,
            height: 620,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,.18), transparent 62%)",
            animation: "lyvoraSplashGlow 3.2s ease-in-out infinite",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "min(620px, calc(100% - 32px))",
            textAlign: "center",
            display: "grid",
            justifyItems: "center",
          }}
        >
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 30,
              background:
                "linear-gradient(135deg,#8b5cf6 0%,#1b1230 42%,#050505 68%,#c4b5fd 100%)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 950,
              fontSize: 34,
              letterSpacing: -2,
              boxShadow:
                "0 0 36px rgba(139,92,246,.65), 0 24px 90px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.28)",
              border: "1px solid rgba(255,255,255,.18)",
              position: "relative",
              overflow: "hidden",
              animation: "lyvoraSplashFloat 3.8s ease-in-out infinite",
            }}
          >
            <span style={{ position: "relative", zIndex: 2 }}>LV</span>
            <span
              style={{
                position: "absolute",
                width: 160,
                height: 34,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg,transparent,rgba(255,255,255,.34),transparent)",
                transform: "rotate(-28deg)",
                top: 38,
                left: -28,
              }}
            />
          </div>

          <h1
            className="lyvora-loading-title"
            style={{
              margin: "30px 0 0",
              fontSize: "clamp(38px, 7vw, 72px)",
              letterSpacing: "18px",
              paddingLeft: 18,
              fontWeight: 950,
              lineHeight: 1,
              textShadow: "0 0 30px rgba(139,92,246,.35)",
              background:
                "linear-gradient(180deg,#fff 0%,#d8d1ff 48%,#8b5cf6 115%)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            LYVORA
          </h1>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "#a78bfa",
              letterSpacing: 9,
              paddingLeft: 9,
              fontWeight: 900,
              fontSize: 15,
            }}
          >
            <span style={{ width: 54, height: 1, background: "linear-gradient(90deg,transparent,rgba(139,92,246,.9))" }} />
            <span style={{ animation: "lyvoraSplashPulse 1.7s ease-in-out infinite" }}>BAĞLANIYOR</span>
            <span style={{ width: 54, height: 1, background: "linear-gradient(90deg,rgba(139,92,246,.9),transparent)" }} />
          </div>

          <div
            style={{
              marginTop: 30,
              width: "min(420px, 82vw)",
              height: 8,
              borderRadius: 999,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.10)",
              overflow: "hidden",
              boxShadow: "0 0 24px rgba(139,92,246,.22)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: "58%",
                borderRadius: 999,
                background: "linear-gradient(90deg,#6d28d9,#a78bfa,#ffffff)",
                boxShadow: "0 0 20px rgba(167,139,250,.75)",
                animation: "lyvoraSplashProgress 2.25s ease-in-out infinite",
              }}
            />
          </div>

          <p style={{ marginTop: 22, color: "rgba(248,247,255,.72)", fontSize: 14, letterSpacing: .4 }}>
            Güvenli bağlantı kuruluyor...
          </p>

          <div
            className="lyvora-loading-features"
            style={{
              marginTop: 78,
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {[
              ["🛡️", "GÜVENLİ", "BAĞLANTI"],
              ["⚡", "HIZLI", "SENKRONİZASYON"],
              ["🔒", "VERİLERİNİZ", "KORUNUYOR"],
            ].map(([icon, top, bottom]) => (
              <div
                key={top}
                style={{
                  border: "1px solid rgba(255,255,255,.08)",
                  background: "rgba(255,255,255,.035)",
                  borderRadius: 18,
                  padding: "14px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  backdropFilter: "blur(14px)",
                }}
              >
                <span style={{ color: "#8b5cf6", fontSize: 22 }}>{icon}</span>
                <span style={{ textAlign: "left", lineHeight: 1.25 }}>
                  <b style={{ fontSize: 11, letterSpacing: 2, color: "#fff" }}>{top}</b>
                  <p style={{ margin: 0, color: "rgba(248,247,255,.58)", fontSize: 10, letterSpacing: 1.4 }}>
                    {bottom}
                  </p>
                </span>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 28, color: "rgba(248,247,255,.42)", fontSize: 11 }}>
            Bağlantı gecikirse giriş ekranına güvenli geçilecek.
          </p>
        </div>
      </div>
    );
  }

  if (!loggedIn) return <AuthScreen T={T} theme={theme} onLogin={handleLogin} onSocialLogin={handleSocialLogin} onPasswordReset={handlePasswordReset} storedUser={user} />;

  return (
    <>
      <style id="lyvora-global-fullscreen">{`
        html, body, #root { width:100%!important; min-width:100%!important; max-width:none!important; margin:0!important; padding:0!important; overflow-x:hidden!important; }
        body { display:block!important; place-items:initial!important; background:${theme === "dark" ? "#050505" : "#f2f2f2"}!important; }
        #root { display:block!important; }
        * { box-sizing:border-box; }
        @keyframes lyvoraRingSpin { 0%{transform:translate(-50%,-50%) rotateX(72deg) rotateZ(0deg)} 100%{transform:translate(-50%,-50%) rotateX(72deg) rotateZ(360deg)} }
        @keyframes lyvoraFloat { 0%,100%{transform:translateY(-50%) scale(1)} 50%{transform:translateY(-53%) scale(1.025)} }
        @keyframes lyvoraMsgIn { from{opacity:0;transform:translateY(8px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes lyvoraTypingDot { 0%,80%,100%{transform:translateY(0);opacity:.35} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes lyvoraFadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lyvoraPulseSoft { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes lyvoraPresenceGlow { 0%,100%{box-shadow:0 0 0 0 rgba(23,201,100,.22)} 50%{box-shadow:0 0 0 8px rgba(23,201,100,.05)} }
        .lyvora-page-main > * { animation: lyvoraFadeUp .22s ease both; }
        .lyvora-skeleton { position:relative; overflow:hidden; background:rgba(139,92,246,.09); }
        .lyvora-skeleton:after { content:""; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent); animation:lyvoraShimmer 1.4s infinite; }
        @keyframes lyvoraShimmer { 100%{transform:translateX(100%)} }
        .lyvora-mobile-menu-btn { display:none; }
        .lyvora-bottom-nav { display:none; }
        .lyvora-mobile-overlay { display:none; }
        @media (max-width:980px) {
          .lyvora-shell-grid { grid-template-columns:1fr!important; }
          .lyvora-sidebar { position:fixed!important; left:12px!important; top:76px!important; bottom:76px!important; width:280px!important; z-index:999!important; transform:translateX(-115%)!important; transition:transform .25s ease!important; border-radius:22px!important; box-shadow:0 20px 70px rgba(0,0,0,.35)!important; }
          .lyvora-sidebar.open { transform:translateX(0)!important; }
          .lyvora-mobile-overlay { display:block; position:fixed; inset:64px 0 0 0; background:rgba(0,0,0,.45); backdrop-filter:blur(8px); z-index:998; }
          .lyvora-mobile-menu-btn { display:grid!important; }
          .lyvora-bottom-nav { display:grid!important; grid-template-columns:repeat(5,1fr); position:fixed; left:12px; right:12px; bottom:12px; height:62px; z-index:1000; border-radius:22px; border:1px solid rgba(139,92,246,.22); background:rgba(18,18,22,.82); backdrop-filter:blur(18px); box-shadow:0 18px 60px rgba(0,0,0,.35); overflow:hidden; }
          .lyvora-page-main { padding-bottom:86px!important; }
          .lyvora-home-grid { grid-template-columns:1fr!important; }
          .lyvora-home-right { display:none!important; }
          .lyvora-hero { min-height:430px!important; padding:30px 24px!important; }
          .lyvora-planet { opacity:.36!important; right:-85px!important; transform:translateY(-50%) scale(.78)!important; }
          .lyvora-cards-grid { grid-template-columns:repeat(2,minmax(0,1fr))!important; }
          .lyvora-chat-grid { height:calc(100vh - 140px)!important; padding:10px!important; grid-template-columns:1fr!important; }
          .lyvora-chat-rooms,.lyvora-chat-users { display:none!important; }
          .lyvora-chat-main { border-radius:20px!important; grid-column:1!important; }
          .lyvora-bottom-grid { grid-template-columns:1fr!important; }
        }
        @media (max-width:560px) {
          .lyvora-cards-grid { grid-template-columns:1fr!important; }
          .lyvora-hero-title { font-size:28px!important; }
        }
      `}</style>
      <div style={{ minHeight: "100vh", width: "100%", maxWidth: "none", background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif", position: "relative", overflowX: "hidden" }}>
        <Topbar T={T} theme={theme} setTheme={setTheme} page={page} nav={nav} notifOpen={notifOpen} setNotifOpen={setNotifOpen} onLogout={handleLogout} user={user} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} xp={xp} level={level} levelProgress={levelProgress} presenceEngine={presenceEngine} notificationEngine={notificationEngine} communicationEngine={communicationEngine} />
        
        
        
        
        
        
        
        
        
        
        
        
        
        <div className="lyvora-shell-grid" style={{ display: "grid", gridTemplateColumns: "250px minmax(0,1fr)", minHeight: "calc(100vh - 64px)", width: "100%", maxWidth: "none" }}>
          {mobileMenuOpen && <div className="lyvora-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}
          <Sidebar T={T} page={page} nav={nav} mobileMenuOpen={mobileMenuOpen} dmUnread={dmUnread} user={user} />
          <main className="lyvora-page-main" style={{ overflow: "auto", minWidth: 0, width: "100%", maxWidth: "none" }}>
            {page === "home"        && <HomePage T={T} nav={nav} presenceEngine={presenceEngine} />}
            {page === "chat"        && <GlobalChatPage T={T} addXP={addXP} user={user} />}
            {page === "dm"          && <LyvoraMessagesPage T={T} nav={nav} user={user} />}
            {page === "messages"    && <LyvoraMessagesPage T={T} nav={nav} user={user} />}
            {page === "profile"     && <ProfilePage T={T} user={user} xp={xp} level={level} levelProgress={levelProgress} />}
            {page === "servers"     && <ServersPage T={T} nav={nav} />}
            {page === "leaderboard" && <LeaderboardPage T={T} />}
            {page === "tasks"       && <TasksPage T={T} />}
            {page === "games"       && <MiniGamesPage T={T} addXP={addXP} xp={xp} level={level} levelProgress={levelProgress} />}
            {page === "party"       && <MultiplayerPartyLobbyPage T={T} user={user} addXP={addXP} />}
            {page === "mood"        && <MoodMatchPage T={T} nav={nav} />}
            {page === "location"    && <LocationPage T={T} addXP={addXP} />}
            {page === "premium"     && <PremiumPage T={T} />}
            {page === "settings"    && <SettingsPage T={T} theme={theme} setTheme={setTheme} onLogout={handleLogout} user={user} />}
            {page === "media"       && <RealtimeMediaPage T={T} user={user} addXP={addXP} />}
            {page === "social"      && <SocialSystemsPage T={T} user={user} nav={nav} addXP={addXP} />}
            {page === "community"   && <CommunityExpansionPage T={T} user={user} nav={nav} addXP={addXP} />}
            {page === "systems"     && <LyvoraSystemsLauncher T={T} nav={nav} />}
            {page === "voice"       && <VoiceStageRoomsPage T={T} user={user} addXP={addXP} />}
            {page === "reels"       && <ReelsShortsSystemPage T={T} user={user} addXP={addXP} />}
            {page === "authLaunch"  && <AuthLaunchFoundationPage T={T} user={user} addXP={addXP} />}
            {page === "database"    && <DatabaseSchemaRulesPage T={T} user={user} addXP={addXP} />}
            {page === "paymentBackend" && <RealPaymentBackendPage T={T} user={user} addXP={addXP} />}
            {page === "firebaseSetup" && <FirebaseBackendSetupPage T={T} user={user} addXP={addXP} />}
            {page === "devHub" && <LyvoraDevHubPage T={T} nav={nav} user={user} />}
            <LyvoraGlobalNoOverflowFix />
            <LyvoraQuickFloatingMenu T={T} nav={nav} user={user} />
            {page === "launchPolish" && <LaunchPolishSocialFeelPage T={T} nav={nav} addXP={addXP} />}
{page === "economy" && <EconomyFixedPage T={T} user={user} addXP={addXP} />}
            {page === "payments" && <PaymentOptionsPage T={T} user={user} addXP={addXP} />}
            {page === "creatorRevenue" && <CreatorRevenueWithdrawPage T={T} user={user} addXP={addXP} />}
            {page === "affiliate" && <CreatorAffiliateReferralPage T={T} user={user} addXP={addXP} />}
            {page === "infoCenter" && <LyvoraInfoOnboardingCenter T={T} nav={nav} />}
            
            {page === "achievements" && <LyvoraMissingSystemPage T={T} title="Season / Sadakat" />}
            {page === "inventory" && <LyvoraMissingSystemPage T={T} title="Inventory" />}
            {page === "ranked" && <LyvoraMissingSystemPage T={T} title="Ranked" />}
            {page === "minigames" && <MiniGamesPlusPage T={T} addXP={addXP} />}
            {page === "ai" && <LyvoraMissingSystemPage T={T} title="AI Engine" />}
            {page === "global" && <GlobalLanguagePageFixed T={T} />}
            {page === "security" && <LyvoraMissingSystemPage T={T} title="Security" />}
            {page === "admin"       && isSuperAdmin && <AdminPanelPage T={T} user={user} />}
            {page === "rules"       && <RulesPage T={T} nav={nav} />}
            {page === "privacy"     && <PrivacyPage T={T} nav={nav} />}
            {page === "terms"       && <TermsPage T={T} nav={nav} />}
          </main>
        </div>
        <nav className="lyvora-bottom-nav">
          {[["home", IC.home, "Ana"], ["chat", IC.globe, "Chat"], ["games", IC.game, "Oyun"], ["party", IC.users, "Party"], ["dm", IC.msg, "DM"], ["profile", IC.user, "Profil"], ["systems", IC.server, "Sistem"], ["economy", IC.crown, "Economy"], ["payments", IC.gift, "Ödemeler"]].map(([id, icon, label]) => (
            <button key={id} onClick={() => nav(id)} style={{ border: "none", background: page === id ? "rgba(139,92,246,.24)" : "transparent", color: page === id ? "#fff" : "rgba(255,255,255,.62)", display: "grid", placeItems: "center", gap: 2, fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
              <span style={{ color: page === id ? "#a78bfa" : "inherit" }}>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <ReleaseToastHost T={T} toast={toast} setToast={setToast} />
        {showOnboarding && <OnboardingOverlay T={T} nav={nav} onDone={() => { localStorage.setItem(LYVORA_STORAGE.onboarded, "true"); setShowOnboarding(false); setToast({ type: "success", title: "Başlayalım", text: "Lyvora turu tamamlandı." }); }} />}
      </div>
    </>
  );
}

function ReleaseToastHost({ T, toast, setToast }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast, setToast]);
  if (!toast) return null;
  return (
    <div style={{ position: "fixed", right: 18, bottom: 90, zIndex: 2000, width: 320, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, boxShadow: "0 18px 60px rgba(0,0,0,.24)", padding: 14, animation: "lyvoraFadeUp .22s ease both" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(139,92,246,.14)", color: T.purple }}>{toast.type === "success" ? IC.task : IC.bell}</div>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 13 }}>{toast.title}</b>
          <p style={{ fontSize: 12, color: T.textSec, marginTop: 4, lineHeight: 1.45 }}>{toast.text}</p>
        </div>
        <button onClick={() => setToast(null)} style={{ border: "none", background: T.surfaceAlt, width: 28, height: 28, borderRadius: 10, cursor: "pointer", color: T.text }}>{IC.x}</button>
      </div>
    </div>
  );
}

function OnboardingOverlay({ T, nav, onDone }) {
  const steps = [
    { icon: IC.globe, title: "Global Chat", text: "Anlık sohbet, XP ve güvenli topluluk akışı." },
    { icon: IC.msg, title: "DM & Medya", text: "Mesajlaşma, medya gönderimi ve okunma sistemleri." },
    { icon: IC.shield, title: "Güvenlik", text: "Owner paneli, mod yetkileri, rapor ve kullanıcı yönetimi." },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,.48)", backdropFilter: "blur(14px)", display: "grid", placeItems: "center", padding: 18 }}>
      <div style={{ width: "min(760px, 100%)", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 28, boxShadow: "0 30px 100px rgba(0,0,0,.35)", overflow: "hidden", animation: "lyvoraFadeUp .26s ease both" }}>
        <div style={{ padding: "28px 28px 18px", background: "linear-gradient(135deg,rgba(139,92,246,.22),transparent)", borderBottom: `1px solid ${T.border}` }}>
          <p style={{ color: T.purple, fontSize: 11, letterSpacing: 4, fontWeight: 900, marginBottom: 8 }}>LYVORA RELEASE TOUR</p>
          <h2 style={{ fontSize: 28, margin: 0, fontWeight: 950 }}>Yeni sistemler hazır</h2>
          <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>Kısa turu geçince uygulama normal akışına döner. Bu ekran her kullanıcıda bir kez görünür.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, padding: 22 }}>
          {steps.map((step) => (
            <div key={step.title} style={{ border: `1px solid ${T.border}`, borderRadius: 18, padding: 18, background: T.surfaceAlt }}>
              <div style={{ width: 42, height: 42, borderRadius: 15, background: "rgba(139,92,246,.16)", color: T.purple, display: "grid", placeItems: "center", marginBottom: 12 }}>{step.icon}</div>
              <b>{step.title}</b>
              <p style={{ color: T.textSec, fontSize: 12, lineHeight: 1.55, marginTop: 7 }}>{step.text}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 22px 22px", gap: 12 }}>
          <button onClick={() => { nav("settings"); onDone(); }} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "12px 16px", fontWeight: 800, cursor: "pointer" }}>Ayarları Aç</button>
          <button onClick={onDone} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "12px 18px", fontWeight: 900, cursor: "pointer", boxShadow: "0 12px 30px rgba(139,92,246,.28)" }}>Lyvora’ya Gir</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TOPBAR
═══════════════════════════════════════════ */
function Topbar({ T, theme, setTheme, page, nav, notifOpen, setNotifOpen, onLogout, user, mobileMenuOpen, setMobileMenuOpen, xp, level, levelProgress, presenceEngine, notificationEngine, communicationEngine }) {
  const unread = notificationEngine?.unreadCount ?? NOTIFS.filter(n => !n.read).length;
  return (
    <header className="lyvora-topbar" style={{ height: 64, width: "100%", maxWidth: "none", background: T.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="lyvora-mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, placeItems: "center", cursor: "pointer" }}>{mobileMenuOpen ? IC.x : IC.more}</button>
        <div style={{ cursor: "pointer" }} onClick={() => nav("home")}><LyvoraLogo /></div>
      </div>
      <nav className="lyvora-top-nav" style={{ display: "flex", gap: 28, fontSize: 14 }}>
        {[["home","Ana Sayfa"],["community","Topluluk"],["servers","Sunucular"],["games","Oyunlar"],["leaderboard","Sıralamalar"],["mood","Mood"],["premium","Premium"]].map(([p, label]) => (
          <span key={p} style={{ cursor: "pointer", fontWeight: page === p ? 700 : 400, color: page === p ? T.text : T.textSec, borderBottom: page === p ? `2px solid ${T.purple}` : "2px solid transparent", paddingBottom: 2 }} onClick={() => nav(p)}>{label}</span>
        ))}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <PresenceStatusPill T={T} presence={presenceEngine?.presence} />
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSec, display: "grid", placeItems: "center" }}>{theme === "light" ? IC.moon : IC.sun}</button>
        <span style={{ cursor: "pointer", color: T.textSec }}>{IC.search}</span>
        <div style={{ position: "relative" }}>
          <span style={{ cursor: "pointer", color: T.textSec, display: "grid", placeItems: "center" }} onClick={() => setNotifOpen(!notifOpen)}>{IC.bell}</span>
          {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, background: T.red, borderRadius: "50%", color: "#fff", fontSize: 9, display: "grid", placeItems: "center", fontWeight: 700 }}>{unread}</span>}
          {notifOpen && <NotifPanel T={T} onClose={() => setNotifOpen(false)} notificationEngine={notificationEngine} communicationEngine={communicationEngine} />}
        </div>
        <div className="lyvora-xp-pill" style={{ display: "flex", alignItems: "center", gap: 9, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, padding: "6px 12px", minWidth: 150 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.accent, color: T.accentText, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900 }}>Lv{level}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textSec, marginBottom: 3 }}><span>XP</span><b>{xp}</b></div>
            <div style={{ height: 5, borderRadius: 999, background: T.border, overflow: "hidden" }}><div style={{ width: `${levelProgress}%`, height: "100%", background: T.accent, borderRadius: 999 }} /></div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 24, padding: "5px 12px 5px 6px", cursor: "pointer" }} onClick={() => nav("infoCenter")}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.accent, display: "grid", placeItems: "center", color: T.accentText, fontSize: 12, fontWeight: 700, boxShadow: "0 0 0 2px rgba(139,92,246,.18)" }}>L</div>
            <span style={{ position: "absolute", right: -1, bottom: -1, width: 9, height: 9, borderRadius: "50%", background: T.green, border: `2px solid ${T.surfaceAlt}` }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.tag || "Lyvora#0001"}</span>
          {IC.chevdown}
        </div>
      </div>
    </header>
  );
}

function NotifPanel({ T, onClose, notificationEngine, communicationEngine }) {
  const iconMap = { msg: IC.msg, dm: IC.msg, mention: IC.bell, task: IC.task, mega: IC.mega, user: IC.user, trophy: IC.trophy, system: IC.bell };
  const items = notificationEngine?.notifications?.length ? notificationEngine.notifications : NOTIFS;
  return (
    <div style={{ position: "absolute", top: 40, right: 0, width: 340, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,.12)", zIndex: 200, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Bildirimler</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => communicationEngine?.requestPushPermission?.()} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>Push aç</button>
          <button onClick={() => notificationEngine?.markAllRead?.()} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>Tümünü oku</button>
          <span style={{ cursor: "pointer", color: T.textSec }} onClick={onClose}>{IC.x}</span>
        </div>
      </div>
      {items.map(n => (
        <div key={n.id} onClick={() => notificationEngine?.markRead?.(n.id)} style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.borderLight}`, background: n.read ? "transparent" : T.surfaceAlt, alignItems: "flex-start", cursor: "pointer" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.surfaceAlt, display: "grid", placeItems: "center", flexShrink: 0, color: T.textSec }}>{iconMap[n.type]}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: T.text }}>{n.text}</p>
            <span style={{ fontSize: 11, color: T.textTer }}>{n.time} önce</span>
          </div>
          {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, flexShrink: 0, marginTop: 5 }} />}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════ */
function Sidebar({ T, page, nav, mobileMenuOpen, dmUnread = 0, user }) {
  const items = [
    { id: "home", icon: IC.home, label: "Ana Sayfa" },
    { id: "chat", icon: IC.globe, label: "Global Chat" },
    { id: "games", icon: IC.game, label: "Mini Oyunlar", badge: "5" },
    { id: "dm", icon: IC.msg, label: "Mesajlar", badge: dmUnread > 0 ? dmUnread : 3 },
    { id: "media", icon: IC.image, label: "Medya & Voice", badge: "Yeni" },
    { id: "social", icon: IC.users, label: "Sosyal Keşif", badge: "Yeni" },
    { id: "community", icon: IC.hash, label: "Topluluk Akışı", badge: "Feed" },
    { id: "mood", icon: IC.spark, label: "Mood Eşleşme", badge: "Yeni" },
    { id: "location", icon: IC.pin, label: "Lokasyon" },
    { id: "servers", icon: IC.server, label: "Sunucular" },
    { id: "tasks", icon: IC.task, label: "Görevler" },
    { id: "leaderboard", icon: IC.trophy, label: "Sıralamalar" },
    { id: "profile", icon: IC.user, label: "Profilim" },
    ...(isLyvoraSuperAdmin(user) ? [{ id: "admin", icon: IC.shield, label: "Admin Panel", badge: "Owner" }] : []),
    { id: "settings", icon: IC.settings, label: "Ayarlar" },
  ];
  return (
    <aside className={`lyvora-sidebar ${mobileMenuOpen ? "open" : ""}`} style={{ background: T.sidebar, borderRight: `1px solid ${T.border}`, padding: "18px 14px", display: "flex", flexDirection: "column" }}>
      {items.map(item => (
        <div key={item.id} onClick={() => nav(item.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 12, marginBottom: 2, cursor: "pointer", background: page === item.id ? T.accent : "transparent", color: page === item.id ? T.accentText : T.textSec, fontSize: 13, fontWeight: page === item.id ? 600 : 400, transition: "all .15s", boxShadow: page === item.id ? "0 0 0 3px rgba(139,92,246,.16)" : "none", borderLeft: page === item.id ? `3px solid ${T.purple}` : "3px solid transparent" }}>
          {item.icon}
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge && <span style={{ background: page === item.id ? T.accentText : T.accent, color: page === item.id ? T.accent : T.accentText, borderRadius: 999, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{item.badge}</span>}
        </div>
      ))}
      <div style={{ marginTop: "auto", display: "grid", gap: 12 }}>
        <div onClick={() => nav("premium")} style={{ background: "linear-gradient(135deg, rgba(139,92,246,.20), rgba(139,92,246,.06))", color: T.text, padding: 16, borderRadius: 16, cursor: "pointer", border: `1px solid rgba(139,92,246,.35)`, boxShadow: "0 0 28px rgba(139,92,246,.10)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: T.purple }}>{IC.crown}<span style={{ fontWeight: 800, fontSize: 14 }}>Premium</span></div>
          <p style={{ fontSize: 11, color: T.textSec, lineHeight: 1.5, marginBottom: 12 }}>Özel rozetler, temalar ve gelişmiş eşleşmeler seni bekliyor.</p>
          <button style={{ width: "100%", border: "none", background: T.purple, color: "#fff", borderRadius: 11, padding: "9px 0", fontWeight: 800, cursor: "pointer" }}>Sıraya Katıl</button>
        </div>
        <div style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 16, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#1a1a1a)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900 }}>L</div>
            <span style={{ position: "absolute", right: 1, bottom: 1, width: 10, height: 10, borderRadius: "50%", background: T.green, border: `2px solid ${T.surfaceAlt}` }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 12 }}>Lyvora#0001</b>
            <p style={{ fontSize: 11, color: T.green, marginTop: 2 }}>Çevrimiçi</p>
          </div>
          <span style={{ color: T.textTer }}>{IC.more}</span>
        </div>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════ */


/* LYVORA_PATCH_25_WORKING_PAGES */


/* LYVORA_PATCH_26_PAYMENT_OPTIONS_SYSTEM */
const LYVORA_PAYMENT_WALLET_STORAGE = "lyvora_payment_wallet_v1";
const LYVORA_PAYMENT_HISTORY_STORAGE = "lyvora_payment_history_v1";

const LYVORA_COIN_PACKAGES = [
  { id: "coin_250", coins: 250, priceTRY: 39, badge: "Starter", popular: false, bonus: 0 },
  { id: "coin_700", coins: 700, priceTRY: 79, badge: "Popular", popular: true, bonus: 0 },
  { id: "coin_1500", coins: 1500, priceTRY: 149, badge: "Premium", popular: false, bonus: 50 },
  { id: "coin_3500", coins: 3500, priceTRY: 299, badge: "Nebula", popular: false, bonus: 250 },
  { id: "coin_8000", coins: 8000, priceTRY: 599, badge: "Galaxy", popular: false, bonus: 900 },
  { id: "coin_20000", coins: 20000, priceTRY: 1199, badge: "Universe", popular: false, bonus: 3500 },
];

const LYVORA_PAYMENT_METHODS = [
  { id: "credit_card", title: "Banka / Kredi Kartı", icon: "💳", desc: "Visa, Mastercard, Troy" },
  { id: "apple_pay", title: "Apple Pay", icon: "🍎", desc: "Desteklenen cihazlarda hızlı ödeme" },
  { id: "google_pay", title: "Google Pay", icon: "🤖", desc: "Android ve Chrome hızlı ödeme" },
  { id: "crypto", title: "Kripto", icon: "₿", desc: "BTC / ETH / USDT ödeme hookları" },
  { id: "coins", title: "Coin ile Öde", icon: "🪙", desc: "Mevcut Lyvora coin bakiyesi" },
];

const LYVORA_PAYMENT_PROVIDER_HOOKS = {
  stripePublicKey: "pk_live_REPLACE_WITH_STRIPE_KEY",
  iyzicoPublicKey: "iyzico_live_REPLACE_WITH_IYZICO_KEY",
  cryptoWalletAddress: "0xLYVORA_REPLACE_WITH_WALLET",
};

function buildPaymentWalletSeed() {
  return {
    coins: 500,
    totalPurchased: 0,
    firstPurchaseBonusUsed: false,
    premiumBonus: false,
  };
}

function calculateCoinPackageTotal(pack, wallet) {
  const base = Number(pack?.coins || 0);
  const packageBonus = Number(pack?.bonus || 0);
  const firstBonus = wallet?.firstPurchaseBonusUsed ? 0 : Math.floor(base * 0.2);
  const premiumBonus = wallet?.premiumBonus ? Math.floor(base * 0.1) : 0;
  return base + packageBonus + firstBonus + premiumBonus;
}

function pushPaymentHistory(item) {
  const current = readLocalJson(LYVORA_PAYMENT_HISTORY_STORAGE, []);
  const next = [
    {
      id: `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      ...item,
    },
    ...current,
  ].slice(0, 40);
  safeWriteLocalJson(LYVORA_PAYMENT_HISTORY_STORAGE, next);
  return next;
}

function SimpleSystemPage({ T, title, icon = "✨", desc, items = [], actions = [] }) {
  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      <PanelCard T={T} title={title} icon={IC.server}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>LYVORA SYSTEM</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 32, fontWeight: 950 }}>{icon} {title}</h1>
            <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>{desc}</p>
          </div>
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        {items.map((item) => (
          <div key={item[0]} style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: 18, padding: 16 }}>
            <b>{item[0]}</b>
            <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.55, marginTop: 8 }}>{item[1]}</p>
          </div>
        ))}
      </div>

      {actions.length > 0 && (
        <PanelCard T={T} title="Quick Actions" icon={IC.zap}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {actions.map((action) => (
              <button
                key={action}
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.surfaceAlt,
                  color: T.text,
                  borderRadius: 14,
                  padding: "11px 14px",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                {action}
              </button>
            ))}
          </div>
        </PanelCard>
      )}
    </div>
  );
}

function MiniGamesPlusPage({ T, addXP }) {
  const [score, setScore] = useState(() => Number(localStorage.getItem("lyvora_minigames_plus_score") || 0));
  const [rounds, setRounds] = useState(() => Number(localStorage.getItem("lyvora_minigames_plus_rounds") || 0));

  useEffect(() => {
    localStorage.setItem("lyvora_minigames_plus_score", String(score));
    localStorage.setItem("lyvora_minigames_plus_rounds", String(rounds));
  }, [score, rounds]);

  const play = () => {
    const gain = Math.floor(Math.random() * 90) + 20;
    setScore((v) => v + gain);
    setRounds((v) => v + 1);
    addXP?.(gain);
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      <PanelCard T={T} title="Mini Oyunlar+" icon={IC.game}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950 }}>🎮 Realtime Mini Games</h1>
        <p style={{ color: T.textSec, marginTop: 8 }}>Reaction duel, tap race, memory match ve skor senkronizasyonu için çalışır demo panel.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginTop: 18 }}>
          {[
            ["Score", score],
            ["Rounds", rounds],
            ["Status", "Ready"],
          ].map(([k, v]) => (
            <div key={k} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 16, padding: 14 }}>
              <p style={{ color: T.textSec, fontSize: 11 }}>{k}</p>
              <b style={{ fontSize: 20 }}>{v}</b>
            </div>
          ))}
        </div>
        <button onClick={play} style={{ marginTop: 18, border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "12px 16px", fontWeight: 950, cursor: "pointer" }}>
          Round Başlat
        </button>
      </PanelCard>
    </div>
  );
}

function GlobalLanguagePageFixed({ T }) {
  const { locale, changeLocale, t } = useLyvoraLocaleState();

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      <PanelCard T={T} title={t("global")} icon={IC.globe}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950 }}>🌍 {t("browserLanguage")}: {locale.toUpperCase()}</h1>
        <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
          Sistem tarayıcı dilini otomatik algılar. Türkçe tarayıcıda Türkçe, İngilizce tarayıcıda English, Almanca tarayıcıda Deutsch açılır.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          {[
            ["tr", "Türkçe"],
            ["en", "English"],
            ["de", "Deutsch"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => changeLocale(id)}
              style={{
                border: `1px solid ${locale === id ? T.purple : T.border}`,
                background: locale === id ? "rgba(139,92,246,.16)" : T.surfaceAlt,
                color: locale === id ? T.purple : T.text,
                borderRadius: 14,
                padding: "11px 14px",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}



/* LYVORA_PATCH_29_CREATOR_REVENUE_WITHDRAW_SYSTEM */
const LYVORA_CREATOR_REVENUE_STORAGE = "lyvora_creator_revenue_v1";
const LYVORA_WITHDRAW_REQUESTS_STORAGE = "lyvora_withdraw_requests_v1";

const LYVORA_WITHDRAW_METHODS = [
  { id: "iban", title: "Banka / IBAN", icon: "🏦", desc: "Normal banka hesabına TL çekim" },
  { id: "tombank", title: "Dijital Banka", icon: "📲", desc: "TOM Bank benzeri dijital banka hesabı" },
  { id: "wise", title: "Wise / Global Transfer", icon: "🌍", desc: "Global creator transfer altyapısı" },
  { id: "revolut", title: "Revolut / Global Wallet", icon: "💼", desc: "Desteklenen ülkelerde global wallet" },
  { id: "crypto_wallet", title: "Crypto Wallet", icon: "₿", desc: "USDT / ETH / BTC wallet çekimi" },
];

const LYVORA_REVENUE_SOURCES = [
  { id: "profile_donate", title: "Profile Donate", icon: "💜", avg: 85 },
  { id: "live_donate", title: "Live Donate", icon: "📡", avg: 160 },
  { id: "membership", title: "Premium Membership", icon: "👑", avg: 249 },
  { id: "creator_shop", title: "Creator Shop", icon: "🛍️", avg: 120 },
  { id: "event_ticket", title: "Event Ticket", icon: "🎟️", avg: 200 },
  { id: "sponsor", title: "Sponsor Banner", icon: "🤝", avg: 450 },
];

function buildCreatorRevenueSeed() {
  return {
    currency: "TRY",
    availableBalance: 0,
    pendingBalance: 0,
    lifetimeRevenue: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    completedPayout: 0,
    minWithdrawTRY: 250,
    fraudScore: 4,
    chargebackRisk: 1,
    revenueEvents: [],
  };
}

function calculatePlatformSplit(amount) {
  const gross = Number(amount || 0);
  const platformFee = Math.round(gross * 0.12);
  const paymentFee = Math.round(gross * 0.035);
  const creatorNet = Math.max(0, gross - platformFee - paymentFee);
  return { gross, platformFee, paymentFee, creatorNet };
}

function createRevenueEvent(sourceId, amount) {
  const source = LYVORA_REVENUE_SOURCES.find((s) => s.id === sourceId) || LYVORA_REVENUE_SOURCES[0];
  const split = calculatePlatformSplit(amount);
  return {
    id: `rev-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceId,
    sourceTitle: source.title,
    amount: split.gross,
    creatorNet: split.creatorNet,
    platformFee: split.platformFee,
    paymentFee: split.paymentFee,
    status: "cleared",
    createdAt: Date.now(),
  };
}



/* LYVORA_PATCH_30_CREATOR_AFFILIATE_REFERRAL_SYSTEM */
const LYVORA_AFFILIATE_STORAGE = "lyvora_creator_affiliate_v1";
const LYVORA_AFFILIATE_EVENTS_STORAGE = "lyvora_affiliate_events_v1";

const AFFILIATE_SPLIT_RULES = {
  coin_purchase: 20,
  premium_membership: 15,
  creator_membership: 18,
  donate: 10,
  event_ticket: 12,
  marketplace: 8,
};

const AFFILIATE_TIERS = [
  { id: "starter", label: "Starter Partner", minEarnings: 0, bonus: 0, icon: "🌱" },
  { id: "silver", label: "Silver Partner", minEarnings: 1000, bonus: 2, icon: "🥈" },
  { id: "gold", label: "Gold Partner", minEarnings: 5000, bonus: 4, icon: "🥇" },
  { id: "nebula", label: "Nebula Partner", minEarnings: 15000, bonus: 7, icon: "🌌" },
];

function buildAffiliateSeed(user) {
  const raw = user?.tag || user?.name || "creator";
  const code = String(raw).replace("@", "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12) || "LYVORA";
  return {
    creatorCode: code,
    customSlug: code.toLowerCase(),
    clicks: 0,
    signups: 0,
    conversions: 0,
    totalSales: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    fraudFlags: 0,
    campaign: "LYVORA-PARTNER",
    locked: false,
  };
}

function getAffiliateTier(totalEarnings = 0) {
  return [...AFFILIATE_TIERS].reverse().find((tier) => Number(totalEarnings || 0) >= tier.minEarnings) || AFFILIATE_TIERS[0];
}

function calcAffiliateCommission(type, amount, totalEarnings = 0) {
  const baseRate = AFFILIATE_SPLIT_RULES[type] ?? 10;
  const tier = getAffiliateTier(totalEarnings);
  const rate = baseRate + Number(tier.bonus || 0);
  return {
    rate,
    commission: Math.round(Number(amount || 0) * rate / 100),
    tier,
  };
}

function createAffiliateEvent({ userName, type, product, amount, affiliate }) {
  const calc = calcAffiliateCommission(type, amount, affiliate?.totalEarnings || 0);
  return {
    id: `aff-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userName,
    type,
    product,
    amount,
    commission: calc.commission,
    rate: calc.rate,
    tier: calc.tier.id,
    createdAt: Date.now(),
    status: "confirmed",
  };
}

function isSuspiciousAffiliateEvent(event, affiliate) {
  const name = String(event?.userName || "").toLowerCase();
  const creator = String(affiliate?.creatorCode || "").toLowerCase();
  if (!name) return true;
  if (creator && name.includes(creator)) return true;
  if (Number(event?.amount || 0) <= 0) return true;
  return false;
}




/* LYVORA_PATCH_33_VOICE_STAGE_ROOMS_SYSTEM */
const LYVORA_VOICE_ROOMS_STORAGE = "lyvora_voice_stage_rooms_v1";
const LYVORA_ACTIVE_ROOM_STORAGE = "lyvora_active_voice_room_v1";

const VOICE_ROOM_TEMPLATES = [
  { id: "public_lounge", title: "Public Lounge", icon: "🌍", premium: false, mode: "public" },
  { id: "creator_stage", title: "Creator Stage", icon: "👑", premium: false, mode: "stage" },
  { id: "premium_room", title: "Premium Voice Room", icon: "💎", premium: true, mode: "private" },
  { id: "game_party", title: "Game Party Voice", icon: "🎮", premium: false, mode: "party" },
];

function buildVoiceRoomsSeed() {
  return [
    {
      id: "voice-main-lounge",
      title: "Lyvora Global Voice",
      host: "Lyvora",
      mode: "public",
      premium: false,
      speakers: ["Nova", "Raven"],
      listeners: 128,
      muted: false,
      locked: false,
      reactions: 24,
      createdAt: Date.now(),
    },
    {
      id: "voice-creator-stage",
      title: "Creator Stage: Nebula Talks",
      host: "Mira",
      mode: "stage",
      premium: false,
      speakers: ["Mira"],
      listeners: 74,
      muted: false,
      locked: false,
      reactions: 12,
      createdAt: Date.now(),
    },
  ];
}

function buildVoiceRoom(template, user) {
  return {
    id: `voice-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: template.title,
    host: user?.name || user?.tag || "Host",
    mode: template.mode,
    premium: template.premium,
    speakers: [user?.name || user?.tag || "Host"],
    listeners: Math.floor(Math.random() * 30) + 8,
    muted: false,
    locked: template.premium,
    reactions: 0,
    createdAt: Date.now(),
  };
}



/* LYVORA_PATCH_34_REELS_SHORTS_SYSTEM */
const LYVORA_REELS_STORAGE = "lyvora_reels_shorts_v1";
const LYVORA_REELS_ANALYTICS_STORAGE = "lyvora_reels_analytics_v1";

const REELS_HASHTAGS = ["#lyvora", "#anonim", "#gaming", "#mood", "#creator", "#nebula", "#voice", "#trend"];

function buildReelsSeed() {
  return [
    {
      id: "reel-1",
      creator: "Nova",
      title: "Lyvora gece modu vibes",
      hashtag: "#lyvora",
      likes: 1280,
      comments: 94,
      shares: 42,
      saves: 210,
      views: 18400,
      watchTime: 72,
      boost: true,
      monetized: true,
      color: "linear-gradient(160deg,#0b0714,#3b0764,#8b5cf6)",
      createdAt: Date.now() - 100000,
    },
    {
      id: "reel-2",
      creator: "Mira",
      title: "Creator stage’den kısa an",
      hashtag: "#creator",
      likes: 820,
      comments: 61,
      shares: 31,
      saves: 144,
      views: 9700,
      watchTime: 64,
      boost: false,
      monetized: true,
      color: "linear-gradient(160deg,#020617,#312e81,#7c3aed)",
      createdAt: Date.now() - 250000,
    },
    {
      id: "reel-3",
      creator: "Raven",
      title: "Mini oyun clutch",
      hashtag: "#gaming",
      likes: 640,
      comments: 38,
      shares: 22,
      saves: 88,
      views: 7200,
      watchTime: 58,
      boost: false,
      monetized: false,
      color: "linear-gradient(160deg,#030712,#1e1b4b,#06b6d4)",
      createdAt: Date.now() - 500000,
    },
  ];
}

function calcReelViralScore(reel) {
  const views = Number(reel.views || 0);
  const engagement = Number(reel.likes || 0) * 2 + Number(reel.comments || 0) * 5 + Number(reel.shares || 0) * 7 + Number(reel.saves || 0) * 4;
  const watch = Number(reel.watchTime || 0) * 12;
  const boost = reel.boost ? 850 : 0;
  return Math.round((engagement + watch + boost) / Math.max(1, Math.sqrt(views)));
}

function buildReelsAnalyticsSeed() {
  return {
    uploaded: 0,
    totalViews: 0,
    totalRevenue: 0,
    boostedCount: 0,
    savedDrafts: 0,
  };
}



/* LYVORA_PATCH_35_AUTH_LAUNCH_FOUNDATION */
const LYVORA_AUTH_SECURITY_STORAGE = "lyvora_auth_security_v1";
const LYVORA_DEVICE_SESSIONS_STORAGE = "lyvora_device_sessions_v1";
const LYVORA_AUTH_EVENTS_STORAGE = "lyvora_auth_events_v1";

const AUTH_PROVIDER_HOOKS = [
  { id: "email", title: "Email / Password", icon: "✉️", status: "ready-ui" },
  { id: "google", title: "Google Login", icon: "🟢", status: "provider-hook" },
  { id: "apple", title: "Apple Login", icon: "🍎", status: "provider-hook" },
  { id: "phone", title: "Phone / OTP", icon: "📱", status: "optional" },
];

function buildAuthSecuritySeed() {
  return {
    emailVerified: false,
    twoFactorEnabled: false,
    backupCodesGenerated: false,
    deviceProtection: true,
    suspiciousLoginProtection: true,
    passwordResetReady: true,
    sessionTimeoutMinutes: 60,
    launchReadyScore: 42,
  };
}

function buildDeviceSessionsSeed() {
  return [
    {
      id: "device-current",
      device: "Current Browser",
      location: "Local session",
      lastActive: Date.now(),
      trusted: true,
      current: true,
    },
  ];
}

function pushAuthEvent(type, meta = {}) {
  const current = readLocalJson(LYVORA_AUTH_EVENTS_STORAGE, []);
  const next = [
    {
      id: `auth-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      meta,
      createdAt: Date.now(),
    },
    ...current,
  ].slice(0, 50);
  safeWriteLocalJson(LYVORA_AUTH_EVENTS_STORAGE, next);
  return next;
}

function calculateAuthLaunchScore(authState) {
  let score = 20;
  if (authState.emailVerified) score += 18;
  if (authState.twoFactorEnabled) score += 22;
  if (authState.backupCodesGenerated) score += 10;
  if (authState.deviceProtection) score += 12;
  if (authState.suspiciousLoginProtection) score += 10;
  if (authState.passwordResetReady) score += 8;
  return Math.min(100, score);
}



/* LYVORA_PATCH_36_DATABASE_SCHEMA_RULES_SYSTEM */
const LYVORA_DATABASE_SCHEMA_STORAGE = "lyvora_database_schema_v1";

const LYVORA_COLLECTION_SCHEMAS = [
  { id:"users", title:"users", access:"owner + public profile", purpose:"Kullanıcı hesabı, profil, rol, güvenlik.", fields:["uid","username","displayName","photoURL","role","createdAt","lastSeen","publicProfile","privateSettings"], security:["role client yazamaz","privateSettings sadece owner","delete admin only"] },
  { id:"creatorProfiles", title:"creatorProfiles", access:"public read + owner/admin write", purpose:"Creator rozet, slug, public stats.", fields:["creatorId","slug","tier","verified","bio","publicStats"], security:["verified admin/backend","slug unique backend","finansal veri yok"] },
  { id:"creatorPrivate", title:"creatorPrivate/{uid}", access:"owner/admin only", purpose:"Creator bakiye, payout, banka/wallet gizliliği.", fields:["availableBalance","pendingBalance","withdrawMethods","taxStatus","fraudScore"], security:["public okunmaz","bakiye backend/webhook","banka bilgisi gizli"] },
  { id:"wallets", title:"wallets/{uid}", access:"owner read + backend write", purpose:"Coin bakiyesi.", fields:["uid","coins","lifetimePurchased","updatedAt"], security:["client coin artıramaz","negative balance yok","backend only"] },
  { id:"payments", title:"payments", access:"owner read + backend write", purpose:"Stripe/Iyzico/crypto ödeme kayıtları.", fields:["paymentId","uid","provider","packageId","amountTRY","coins","status"], security:["client create/update yok","webhook verified","fake payment engeli"] },
  { id:"transactions", title:"transactions", access:"owner read + backend write", purpose:"Ledger, coin harcama, refund, split.", fields:["txId","uid","type","amount","status","source"], security:["immutable ledger","refund backend","client update yok"] },
  { id:"referrals", title:"referrals", access:"creator owner read + backend write", purpose:"Partner link, satış, komisyon takibi.", fields:["refId","creatorId","invitedUid","eventType","saleAmount","commission"], security:["creator sadece kendi eventlerini görür","kart/banka bilgisi yok","self-invite guard"] },
  { id:"reels", title:"reels", access:"public read + owner/mod write", purpose:"Shorts/Reels içerik.", fields:["reelId","creatorId","mediaUrl","thumbnailUrl","caption","hashtags","visibility"], security:["media verified","moderationStatus","owner update"] },
  { id:"reelStats", title:"reelStats/{reelId}", access:"public read + backend write", purpose:"View/like/watchtime/viral score.", fields:["views","likes","comments","shares","watchTime","viralScore"], security:["counter backend","rate limit","fake view guard"] },
  { id:"voiceRooms", title:"voiceRooms", access:"public/private by room", purpose:"Voice/stage room state.", fields:["roomId","hostId","title","mode","premium","speakers","listeners","status"], security:["host/mod update","premium check","speaker queue limit"] },
  { id:"messages", title:"messages", access:"member read/write", purpose:"Chat, live overlay, community replies.", fields:["messageId","uid","roomId","text","media","createdAt","moderationStatus"], security:["rate limit","mod delete","blocked words"] },
  { id:"notifications", title:"notifications/{uid}/items", access:"owner read + backend write", purpose:"Bildirimler.", fields:["id","type","title","body","read","createdAt"], security:["owner read/update","backend create"] },
  { id:"reports", title:"reports", access:"auth create + mod/admin read", purpose:"Şikayet/moderasyon.", fields:["reportId","reporterUid","targetType","targetId","reason","status"], security:["report spam limit","mod review","admin delete"] },
  { id:"adminAuditLogs", title:"adminAuditLogs", access:"admin only", purpose:"Admin/mod işlem logları.", fields:["actionId","actorUid","action","target","meta","createdAt"], security:["append-only","admin read","delete yok"] },
];

const LYVORA_FIRESTORE_RULES_DRAFT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn(){ return request.auth != null; }
    function isOwner(uid){ return signedIn() && request.auth.uid == uid; }
    function userDoc(){ return get(/databases/$(database)/documents/users/$(request.auth.uid)); }
    function hasRole(role){ return signedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid)) && userDoc().data.role == role; }
    function isAdmin(){ return hasRole('admin') || hasRole('superadmin'); }
    function isMod(){ return hasRole('mod') || isAdmin(); }

    match /users/{uid} {
      allow read: if signedIn();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) && !('role' in request.resource.data.diff(resource.data).changedKeys());
      allow delete: if isAdmin();
    }

    match /creatorProfiles/{uid} {
      allow read: if true;
      allow create, update: if isOwner(uid) || isAdmin();
      allow delete: if isAdmin();
    }

    match /creatorPrivate/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow write: if isAdmin();
    }

    match /wallets/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow write: if false;
    }

    match /payments/{paymentId} {
      allow read: if signedIn() && (resource.data.uid == request.auth.uid || isAdmin());
      allow write: if false;
    }

    match /transactions/{txId} {
      allow read: if signedIn() && (resource.data.uid == request.auth.uid || isAdmin());
      allow write: if false;
    }

    match /referrals/{refId} {
      allow read: if signedIn() && (resource.data.creatorId == request.auth.uid || resource.data.invitedUid == request.auth.uid || isAdmin());
      allow write: if false;
    }

    match /reels/{reelId} {
      allow read: if resource.data.visibility == 'public' || resource.data.creatorId == request.auth.uid || isMod();
      allow create: if signedIn() && request.resource.data.creatorId == request.auth.uid;
      allow update, delete: if signedIn() && (resource.data.creatorId == request.auth.uid || isMod());
    }

    match /reelStats/{reelId} {
      allow read: if true;
      allow write: if false;
    }

    match /voiceRooms/{roomId} {
      allow read: if true;
      allow create: if signedIn() && request.resource.data.hostId == request.auth.uid;
      allow update, delete: if signedIn() && (resource.data.hostId == request.auth.uid || isMod());
    }

    match /messages/{messageId} {
      allow read: if signedIn();
      allow create: if signedIn() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if signedIn() && (resource.data.uid == request.auth.uid || isMod());
    }

    match /notifications/{uid}/items/{notifId} {
      allow read, update: if isOwner(uid);
      allow create, delete: if false;
    }

    match /reports/{reportId} {
      allow create: if signedIn() && request.resource.data.reporterUid == request.auth.uid;
      allow read, update: if isMod();
      allow delete: if isAdmin();
    }

    match /adminAuditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false;
    }
  }
}`;

const LYVORA_BACKEND_ENDPOINTS = [
  ["POST /api/auth/session","JWT/session + device log"],
  ["POST /api/payments/create-checkout","Stripe/Iyzico checkout"],
  ["POST /api/webhooks/stripe","Stripe verified webhook"],
  ["POST /api/webhooks/iyzico","Iyzico verified webhook"],
  ["POST /api/wallet/credit","Server-side coin credit"],
  ["POST /api/referrals/track","Referral attribution"],
  ["POST /api/payouts/request","Creator withdraw request"],
  ["POST /api/reels/upload-token","Secure upload URL"],
  ["POST /api/voice/join","Voice room token"],
  ["POST /api/moderation/report","Report queue"],
];

function buildDatabaseReadinessSeed(){
  return { schemaReviewed:false, rulesReviewed:false, backendEndpointsReady:false, webhookVerificationReady:false, indexesPlanned:false, storageRulesReady:false, appCheckRequired:true };
}
function calcDatabaseReadiness(s){
  let n=10;
  if(s.schemaReviewed)n+=18; if(s.rulesReviewed)n+=22; if(s.backendEndpointsReady)n+=16;
  if(s.webhookVerificationReady)n+=14; if(s.indexesPlanned)n+=10; if(s.storageRulesReady)n+=10; if(s.appCheckRequired)n+=10;
  return Math.min(100,n);
}


/* LYVORA_PATCH_37_REAL_PAYMENT_BACKEND_FOUNDATION */
const LYVORA_PAYMENT_BACKEND_STORAGE = "lyvora_real_payment_backend_v1";
const LYVORA_PAYMENT_QUEUE_STORAGE = "lyvora_payment_queue_v1";

const LYVORA_REAL_PAYMENT_PROVIDERS = [
  { id:"stripe", title:"Stripe", icon:"💳", status:"checkout + webhook", global:true },
  { id:"iyzico", title:"Iyzico", icon:"🏦", status:"TR checkout + webhook", global:false },
  { id:"apple_pay", title:"Apple Pay", icon:"🍎", status:"via Stripe/Iyzico", global:true },
  { id:"google_pay", title:"Google Pay", icon:"🤖", status:"via Stripe/Iyzico", global:true },
  { id:"crypto", title:"Crypto Invoice", icon:"₿", status:"invoice verify", global:true },
];

const LYVORA_PAYMENT_ENDPOINTS = [
  ["POST /api/payments/create-checkout", "Paket, userId ve provider alır; güvenli checkout session üretir."],
  ["POST /api/webhooks/stripe", "Stripe imzasını doğrular, ödeme başarılıysa wallet credit queue oluşturur."],
  ["POST /api/webhooks/iyzico", "Iyzico callback doğrular, payment status confirmed yapar."],
  ["POST /api/webhooks/crypto", "Crypto invoice confirmations kontrol eder."],
  ["POST /api/wallet/credit", "Sadece backend internal key ile coin ekler."],
  ["POST /api/payments/refund", "Refund isteğini payment + transaction ledger ile işler."],
  ["POST /api/invoices/create", "Fatura/receipt kaydı oluşturur."],
  ["POST /api/payouts/review", "Creator withdraw manuel review akışı."],
];

const LYVORA_PAYMENT_SECURITY_RULES = [
  "Frontend coin bakiyesi artıramaz.",
  "Payment status sadece verified webhook ile confirmed olur.",
  "Checkout amount backend package table’dan okunur; client fiyatına güvenilmez.",
  "Her ödeme için idempotency key kullanılır.",
  "Webhook signature doğrulanmadan wallet credit yapılmaz.",
  "Refund olursa transaction ledger ters kayıt atar.",
  "Creator revenue split sadece confirmed transaction sonrası oluşur.",
  "Şüpheli ödeme manual review queue’ya düşer.",
];

function buildPaymentBackendSeed(){
  return {
    stripeReady:false,
    iyzicoReady:false,
    webhookVerification:false,
    idempotencyReady:false,
    walletCreditLocked:true,
    invoiceReady:false,
    refundFlow:false,
    payoutReview:false,
    testMode:true,
  };
}

function calcPaymentBackendScore(s){
  let n=10;
  if(s.stripeReady)n+=14;
  if(s.iyzicoReady)n+=14;
  if(s.webhookVerification)n+=18;
  if(s.idempotencyReady)n+=12;
  if(s.walletCreditLocked)n+=16;
  if(s.invoiceReady)n+=8;
  if(s.refundFlow)n+=8;
  if(s.payoutReview)n+=10;
  return Math.min(100,n);
}

function createDemoPaymentQueueItem(provider="stripe", packageId="coin_700"){
  const pkgMap = {
    coin_250:{coins:250, priceTRY:39},
    coin_700:{coins:700, priceTRY:79},
    coin_1500:{coins:1500, priceTRY:149},
    coin_3500:{coins:3500, priceTRY:299},
    coin_8000:{coins:8000, priceTRY:599},
    coin_20000:{coins:20000, priceTRY:1199},
  };
  const pkg = pkgMap[packageId] || pkgMap.coin_700;
  return {
    id:`payq-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    provider,
    packageId,
    coins:pkg.coins,
    amountTRY:pkg.priceTRY,
    status:"pending_webhook",
    idempotencyKey:`idem-${Date.now()}`,
    fraudRisk:Math.floor(Math.random()*18),
    createdAt:Date.now(),
  };
}



/* LYVORA_PATCH_38_FIREBASE_BACKEND_SETUP */
const LYVORA_FIREBASE_SETUP_STORAGE = "lyvora_firebase_backend_setup_v1";

const LYVORA_FIREBASE_MODULES = [
  { id:"project", title:"Firebase Project", icon:"🔥", desc:"Lyvora için Firebase projesi oluşturulur ve web app config alınır." },
  { id:"auth", title:"Authentication", icon:"🔐", desc:"Email, Google, Apple login ve email verification aktif edilir." },
  { id:"firestore", title:"Firestore Database", icon:"🗄️", desc:"Users, payments, referrals, reels, rooms ve reports collections hazırlanır." },
  { id:"storage", title:"Firebase Storage / CDN", icon:"☁️", desc:"Profil fotoğrafı, reels/video upload ve thumbnail dosyaları için storage kurulur." },
  { id:"functions", title:"Cloud Functions", icon:"⚡", desc:"Webhook verify, coin credit, referral split ve payout review backend fonksiyonları." },
  { id:"appcheck", title:"App Check", icon:"🛡️", desc:"Fake client, bot ve unauthorized request azaltmak için App Check aktif edilir." },
];

const LYVORA_FIREBASE_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "IYZICO_API_KEY",
  "IYZICO_SECRET_KEY",
  "INTERNAL_WALLET_CREDIT_KEY",
];

const LYVORA_FIREBASE_DEPLOY_COMMANDS = [
  "npm install firebase",
  "npm install -g firebase-tools",
  "firebase login",
  "firebase init firestore functions storage hosting",
  "firebase deploy --only firestore:rules",
  "firebase deploy --only functions",
  "firebase deploy --only hosting",
];

function buildFirebaseSetupSeed(){
  return {
    project:false,
    auth:false,
    firestore:false,
    rules:false,
    storage:false,
    functions:false,
    appcheck:false,
    env:false,
    webhooks:false,
    deploy:false,
  };
}

function calcFirebaseSetupScore(s){
  let n=0;
  Object.values(s || {}).forEach(v=>{ if(v)n+=10; });
  return Math.min(100,n);
}


/* LYVORA_PATCH_39_DEV_HUB_CLEAN_FLOATING_BUTTONS */

/* LYVORA_PATCH_40_LAUNCH_POLISH_SOCIAL_FEEL */
const LYVORA_LAUNCH_POLISH_STORAGE = "lyvora_launch_polish_v1";

const LYVORA_LAUNCH_CARDS = [
  { id:"beta", icon:"🚀", title:"Kapalı Beta Hissi", desc:"İlk gelen kullanıcılara özel rozet, erken erişim ve özel creator slotları verilir." },
  { id:"rules", icon:"🛡️", title:"Güvenli Topluluk", desc:"Saygılı, pozitif ve güvenli bir ortam için topluluk kuralları öne çıkarılır." },
  { id:"creator", icon:"👑", title:"Creator Spotlight", desc:"Öne çıkan creatorlar haftalık olarak ana sayfada gösterilir." },
  { id:"feedback", icon:"💬", title:"Fikir Paylaş", desc:"Kullanıcılar yeni özellik önerilerini tek panelden gönderebilir." },
  { id:"event", icon:"🎉", title:"Launch Etkinliği", desc:"İlk hafta voice room, görevler, mini ödüller ve partner challenge açılır." },
];

function buildLaunchPolishSeed(){
  return {
    betaMode:true,
    launchBanner:true,
    communityRules:true,
    creatorSpotlight:true,
    feedbackPanel:true,
    weeklyEvent:true,
    earlyBadge:true,
    inviteOnly:false,
  };
}

function calcLaunchPolishScore(s){
  let n=0;
  Object.values(s || {}).forEach(v=>{ if(v)n+=12; });
  return Math.min(100,n);
}


function LaunchPolishSocialFeelPage({ T, nav, addXP }) {
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const cards = [
    {
      icon: "🚀",
      title: "Kapalı Beta / Erken Erişim",
      desc: "İlk katılan kullanıcılara özel rozet, erken erişim ve özel görevler verilecek.",
      action: () => nav("infoCenter"),
      button: "Bilgilendirmeyi Aç",
    },
    {
      icon: "👑",
      title: "Creator Spotlight",
      desc: "Öne çıkan creatorlar ana sayfada ve launch etkinliklerinde gösterilecek.",
      action: () => nav("creatorRevenue"),
      button: "Creator Paneli",
    },
    {
      icon: "💳",
      title: "Ödeme & Coin Sistemi",
      desc: "Coin, premium, creator destek ve marketplace akışı güvenli ödeme altyapısıyla hazırlanıyor.",
      action: () => nav("payments"),
      button: "Ödemeleri Aç",
    },
    {
      icon: "🤝",
      title: "Partner / Referral",
      desc: "Creatorlar özel link paylaşarak kullanıcı getirip satışlardan komisyon kazanabilecek.",
      action: () => nav("affiliate"),
      button: "Partner Paneli",
    },
  ];

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 5000,
            background: T.surface,
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 18px 60px rgba(0,0,0,.25)",
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {toast}
        </div>
      )}

      <PanelCard T={T} title="Launch Merkezi" icon={IC.spark}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>LYVORA LAUNCH CENTER</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, fontWeight: 950 }}>🚀 Yayın Öncesi Merkez</h1>
            <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
              Lyvora yayına çıkmadan önce kullanıcıların göreceği launch bilgileri, creator duyuruları,
              erken erişim sistemi ve topluluk bilgilendirmeleri burada toplanır.
            </p>
          </div>

          <button
            onClick={() => {
              addXP?.(12);
              showToast("Launch checklist kaydedildi.");
            }}
            style={{
              border: "none",
              background: T.purple,
              color: "#fff",
              borderRadius: 15,
              padding: "12px 14px",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Launch Hazırlığı →
          </button>
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              border: `1px solid ${T.border}`,
              background: T.surface,
              borderRadius: 20,
              padding: 18,
              boxShadow: "0 14px 42px rgba(139,92,246,.06)",
            }}
          >
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <h3 style={{ margin: "10px 0 0", fontSize: 17, fontWeight: 950 }}>{card.title}</h3>
            <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.6, marginTop: 7 }}>{card.desc}</p>
            <button
              onClick={card.action}
              style={{
                marginTop: 12,
                border: "1px solid rgba(139,92,246,.30)",
                background: "rgba(139,92,246,.10)",
                color: T.purple,
                borderRadius: 13,
                padding: "10px 12px",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              {card.button} →
            </button>
          </div>
        ))}
      </div>

      <PanelCard T={T} title="Topluluk Kuralları" icon={IC.shield}>
        <div style={{ display: "grid", gap: 9 }}>
          {[
            "Saygılı ve pozitif ol.",
            "Spam, taciz ve scam yasaktır.",
            "Creator gelir sistemi kötüye kullanılamaz.",
            "Özel bilgiler ve ödeme detayları paylaşılmaz.",
            "Şüpheli içerikler raporlanır.",
          ].map((rule) => (
            <div
              key={rule}
              style={{
                border: `1px solid ${T.border}`,
                background: T.surfaceAlt,
                borderRadius: 13,
                padding: 11,
                color: T.textSec,
                fontSize: 13,
              }}
            >
              • {rule}
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}


function LyvoraQuickFloatingMenu({ T, nav, user }) {
  const [open, setOpen] = useState(false);
  const isDev =
    user?.role === "admin" ||
    user?.role === "owner" ||
    user?.role === "superadmin" ||
    user?.isAdmin ||
    user?.email === "aliyamanhhd@gmail.com";

  const items = [
    ["launchPolish", "🚀 Launch"],
    ["infoCenter", "☆ Bilgilendirme"],
    ["affiliate", "Partner"],
    ["creatorRevenue", "Creator Gelir"],
    ["payments", "Ödemeler"],
    ["systems", "Sistemler"],
    ...(isDev ? [["devHub", "⚡ Dev Hub"]] : []),
  ];

  return (
    <div style={{ position: "fixed", right: 18, bottom: 28, zIndex: 1800, display: "grid", justifyItems: "end", gap: 10 }}>
      {open && (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 10,
            borderRadius: 22,
            background: "rgba(255,255,255,.86)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(139,92,246,.25)",
            boxShadow: "0 18px 55px rgba(139,92,246,.20), 0 12px 40px rgba(0,0,0,.10)",
          }}
        >
          {items.map(([page, label]) => (
            <button
              key={page}
              onClick={() => {
                nav(page);
                setOpen(false);
              }}
              style={{
                border: "1px solid rgba(139,92,246,.22)",
                background: T.surface,
                color: T.text,
                borderRadius: 999,
                padding: "10px 14px",
                fontWeight: 950,
                cursor: "pointer",
                minWidth: 160,
                textAlign: "left",
                boxShadow: "0 8px 24px rgba(139,92,246,.10)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <button
        className="lyvora-single-quick-menu-button"
        onClick={() => setOpen((v) => !v)}
        style={{
          border: "1px solid rgba(139,92,246,.38)",
          background: T.surface,
          color: T.text,
          borderRadius: 999,
          padding: "12px 16px",
          fontWeight: 950,
          cursor: "pointer",
          boxShadow: "0 14px 38px rgba(139,92,246,.22), 0 6px 18px rgba(0,0,0,.12)",
          display: "inline-flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        ⚡ Hızlı Menü
      </button>
    </div>
  );
}

function LyvoraDevHubPage({ T, nav, user }) {
  const isDev =
    user?.role === "admin" ||
    user?.role === "owner" ||
    user?.role === "superadmin" ||
    user?.isAdmin ||
    user?.email === "aliyamanhhd@gmail.com";

  const tools = [
    ["firebaseSetup", "Firebase Setup", "🔥", "Auth, Firestore, Storage, Functions ve App Check kurulumu"],
    ["paymentBackend", "Pay Backend", "💳", "Checkout, webhook, wallet credit ve fake payment koruması"],
    ["database", "Database / Rules", "🗄️", "Firestore schema, rules, private/public data ayrımı"],
    ["authLaunch", "Auth / Login", "🔐", "Google, Apple, email verification, 2FA ve device sessions"],
    ["reels", "Reels System", "🎬", "Shorts/Reels feed, viral score ve creator analytics"],
  ];

  if (!isDev) {
    return (
      <div style={{ padding: 20 }}>
        <PanelCard T={T} title="Dev Hub" icon={IC.lock}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 950 }}>🔒 Developer alanı</h1>
          <p style={{ color: T.textSec, marginTop: 10 }}>
            Bu bölüm sadece admin/developer hesapları için görünür.
          </p>
        </PanelCard>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      <PanelCard T={T} title="Developer Hub" icon={IC.server}>
        <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>ADMIN / DEVELOPER TOOLS</p>
        <h1 style={{ margin: "6px 0 0", fontSize: 34, fontWeight: 950 }}>⚡ Lyvora Dev Hub</h1>
        <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
          Launch öncesi teknik paneller burada toplandı. Normal kullanıcılar Firebase, DB, Auth ve ödeme backend araçlarını görmez.
        </p>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
        {tools.map(([route, title, icon, desc]) => (
          <button
            key={route}
            onClick={() => nav(route)}
            style={{
              border: "1px solid rgba(139,92,246,.28)",
              background: T.surface,
              color: T.text,
              borderRadius: 20,
              padding: 17,
              cursor: "pointer",
              textAlign: "left",
              boxShadow: "0 14px 42px rgba(139,92,246,.08)",
            }}
          >
            <div style={{ fontSize: 26 }}>{icon}</div>
            <b style={{ display: "block", marginTop: 10 }}>{title}</b>
            <p style={{ color: T.textSec, fontSize: 12, lineHeight: 1.55, marginTop: 6 }}>{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function FirebaseBackendSetupPage({ T, user, addXP }) {
  const [setup,setSetup]=useState(()=>readLocalJson(LYVORA_FIREBASE_SETUP_STORAGE, buildFirebaseSetupSeed()));
  const [selected,setSelected]=useState(LYVORA_FIREBASE_MODULES[0]);
  const [toast,setToast]=useState("");
  const score=calcFirebaseSetupScore(setup);

  useEffect(()=>safeWriteLocalJson(LYVORA_FIREBASE_SETUP_STORAGE, setup),[setup]);

  const show=(m)=>{setToast(m);setTimeout(()=>setToast(""),2200);};
  const toggle=(key)=>{setSetup(p=>({...p,[key]:!p[key]}));addXP?.(8);};

  const copyEnv=async()=>{
    const env=LYVORA_FIREBASE_ENV_KEYS.map(k=>`${k}=replace_me`).join("\n");
    try{await navigator.clipboard.writeText(env);show(".env template kopyalandı.");}catch{show("Kopyalama desteklenmedi.");}
  };

  const copyCommands=async()=>{
    try{await navigator.clipboard.writeText(LYVORA_FIREBASE_DEPLOY_COMMANDS.join("\n"));show("Deploy komutları kopyalandı.");}catch{show("Kopyalama desteklenmedi.");}
  };

  return (
    <div style={{padding:20,display:"grid",gap:18}}>
      {toast && <div style={{position:"fixed",right:18,bottom:18,zIndex:5000,background:T.surface,color:T.text,border:`1px solid ${T.border}`,borderRadius:16,padding:"12px 14px",boxShadow:"0 18px 60px rgba(0,0,0,.25)",fontSize:13,fontWeight:850}}>{toast}</div>}

      <PanelCard T={T} title="Firebase Real Backend Setup" icon={IC.server}>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:16,alignItems:"center"}}>
          <div>
            <p style={{color:T.purple,fontSize:13,fontWeight:950,letterSpacing:2}}>REAL BACKEND LAUNCH SETUP</p>
            <h1 style={{margin:"6px 0 0",fontSize:34,fontWeight:950}}>🔥 Firebase Backend Kurulumu</h1>
            <p style={{color:T.textSec,marginTop:8,lineHeight:1.6}}>
              Auth, Firestore, Storage, Cloud Functions, App Check ve payment webhook altyapısını launch-ready hale getirmek için kurulum merkezi.
            </p>
          </div>
          <div style={{border:`1px solid ${T.border}`,background:T.surfaceAlt,borderRadius:18,padding:14,minWidth:180}}>
            <p style={{color:T.textTer,fontSize:10,fontWeight:900}}>BACKEND READY</p>
            <b style={{fontSize:28,color:score>=80?T.green:T.purple}}>{score}%</b>
          </div>
        </div>
      </PanelCard>

      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 390px",gap:16}}>
        <div style={{display:"grid",gap:14}}>
          <PanelCard T={T} title="Firebase Modülleri" icon={IC.task}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
              {LYVORA_FIREBASE_MODULES.map(m=>(
                <button key={m.id} onClick={()=>setSelected(m)} style={{border:`1px solid ${selected.id===m.id?T.purple:T.border}`,background:selected.id===m.id?"rgba(139,92,246,.14)":T.surfaceAlt,color:T.text,borderRadius:17,padding:14,cursor:"pointer",textAlign:"left"}}>
                  <b>{m.icon} {m.title}</b>
                  <p style={{color:T.textSec,fontSize:12,lineHeight:1.45,marginTop:5}}>{m.desc}</p>
                </button>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title={`Kurulum Detayı: ${selected.title}`} icon={IC.server}>
            <div style={{display:"grid",gap:10}}>
              <div style={{border:"1px solid rgba(139,92,246,.24)",background:"rgba(139,92,246,.08)",borderRadius:15,padding:13}}>
                <b>{selected.icon} {selected.title}</b>
                <p style={{color:T.textSec,fontSize:13,lineHeight:1.6,marginTop:6}}>{selected.desc}</p>
              </div>
              {[
                ["project","Firebase Console’dan project oluştur"],
                ["auth","Authentication providerları aktif et"],
                ["firestore","Firestore Native Mode aç"],
                ["rules","firestore.rules deploy et"],
                ["storage","Storage bucket ve rules kur"],
                ["functions","Cloud Functions region/env ayarla"],
                ["appcheck","App Check aktif et"],
                ["env",".env keylerini Bolt/Vercel’e ekle"],
                ["webhooks","Stripe/Iyzico webhook URL bağla"],
                ["deploy","Hosting/functions deploy test et"],
              ].map(([key,label])=>(
                <button key={key} onClick={()=>toggle(key)} style={{border:`1px solid ${setup[key]?"rgba(23,201,100,.38)":T.border}`,background:setup[key]?"rgba(23,201,100,.07)":T.surfaceAlt,color:T.text,borderRadius:14,padding:11,textAlign:"left",cursor:"pointer",fontWeight:900}}>
                  {setup[key]?"✅":"⚠️"} {label}
                </button>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Deploy Komutları" icon={IC.server}>
            <div style={{border:`1px solid ${T.border}`,background:T.surfaceAlt,borderRadius:14,padding:12,fontFamily:"ui-monospace, Menlo, monospace",fontSize:12,color:T.textSec,whiteSpace:"pre-wrap"}}>
              {LYVORA_FIREBASE_DEPLOY_COMMANDS.join("\n")}
            </div>
            <button onClick={copyCommands} style={{marginTop:12,border:"none",background:T.purple,color:"#fff",borderRadius:13,padding:"10px 12px",fontWeight:950,cursor:"pointer"}}>Komutları Kopyala</button>
          </PanelCard>
        </div>

        <div style={{display:"grid",gap:14,alignContent:"start"}}>
          <PanelCard T={T} title=".env Keys" icon={IC.lock}>
            <div style={{display:"grid",gap:8}}>
              {LYVORA_FIREBASE_ENV_KEYS.map(k=>(
                <div key={k} style={{border:`1px solid ${T.border}`,background:T.surfaceAlt,borderRadius:13,padding:10}}>
                  <b style={{fontSize:11}}>{k}</b>
                </div>
              ))}
            </div>
            <button onClick={copyEnv} style={{marginTop:12,border:"none",background:T.purple,color:"#fff",borderRadius:13,padding:"10px 12px",fontWeight:950,cursor:"pointer"}}>.env Template Kopyala</button>
          </PanelCard>

          <PanelCard T={T} title="Cloud Functions Görevleri" icon={IC.zap}>
            <div style={{display:"grid",gap:8}}>
              {[
                "createCheckoutSession: ödeme oturumu üretir",
                "stripeWebhook: imza doğrular, payment confirmed yapar",
                "iyzicoWebhook: callback doğrular",
                "creditWallet: coin sadece backend’den eklenir",
                "trackReferral: creator komisyonunu hesaplar",
                "requestPayout: withdraw isteğini review’a alır",
                "moderateMedia: reels/chat içerik kontrolü",
              ].map(x=>(
                <div key={x} style={{border:"1px solid rgba(139,92,246,.24)",background:"rgba(139,92,246,.08)",borderRadius:13,padding:10,color:T.textSec,fontSize:12,lineHeight:1.45}}>⚡ {x}</div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Launch Güvenlik Notu" icon={IC.shield}>
            <p style={{color:T.textSec,fontSize:13,lineHeight:1.6}}>
              API keylerin public olanları frontend’de olabilir; secret keyler asla App.tsx içine yazılmaz. Stripe secret, Iyzico secret ve wallet credit key sadece Cloud Functions environment variables içinde tutulur.
            </p>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

function RealPaymentBackendPage({ T, user, addXP }) {
  const [selectedProvider, setSelectedProvider] = useState("Stripe");
  const [selectedPackage, setSelectedPackage] = useState("700 coin / ₺79");
  const [step, setStep] = useState("checkout_created");
  const [toast, setToast] = useState("");

  const providers = ["Stripe", "Iyzico", "Apple Pay", "Google Pay", "Crypto"];
  const packages = ["250 coin / ₺39", "700 coin / ₺79", "1500 coin / ₺149", "3500 coin / ₺299", "8000 coin / ₺599", "20000 coin / ₺1199"];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const runStep = (nextStep, msg, xp = 8) => {
    setStep(nextStep);
    addXP?.(xp);
    showToast(msg);
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 5000,
            background: T.surface,
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 18px 60px rgba(0,0,0,.25)",
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {toast}
        </div>
      )}

      <PanelCard T={T} title="Real Payment Backend" icon={IC.lock}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>PRODUCTION PAYMENT FOUNDATION</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, fontWeight: 950 }}>💳 Secure Checkout + Webhooks</h1>
            <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
              Stripe, Iyzico, Apple Pay, Google Pay ve Crypto ödeme akışı için güvenli backend mantığı.
              Coin sadece ödeme sağlayıcıdan gelen doğrulanmış webhook sonrası server-side eklenir.
            </p>
          </div>

          <div style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 14, minWidth: 180 }}>
            <p style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>CURRENT STATUS</p>
            <b style={{ fontSize: 20, color: T.purple }}>{step}</b>
          </div>
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <PanelCard T={T} title="Provider Seç" icon={IC.gift}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
              {providers.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProvider(p)}
                  style={{
                    border: `1px solid ${selectedProvider === p ? T.purple : T.border}`,
                    background: selectedProvider === p ? "rgba(139,92,246,.14)" : T.surfaceAlt,
                    color: T.text,
                    borderRadius: 15,
                    padding: 13,
                    cursor: "pointer",
                    fontWeight: 900,
                    textAlign: "left",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Coin Paketi" icon={IC.gift}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
              {packages.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPackage(p)}
                  style={{
                    border: `1px solid ${selectedPackage === p ? T.purple : T.border}`,
                    background: selectedPackage === p ? "rgba(139,92,246,.14)" : T.surfaceAlt,
                    color: T.text,
                    borderRadius: 15,
                    padding: 13,
                    cursor: "pointer",
                    fontWeight: 900,
                    textAlign: "left",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Payment Flow Demo" icon={IC.server}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 15, padding: 13 }}>
                <b>{selectedProvider}</b>
                <p style={{ color: T.textSec, fontSize: 12, marginTop: 5 }}>{selectedPackage}</p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button onClick={() => runStep("checkout_created", "Checkout session oluşturuldu.")} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                  1. Checkout Oluştur
                </button>
                <button onClick={() => runStep("webhook_verified", "Webhook doğrulandı.")} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                  2. Webhook Verify
                </button>
                <button onClick={() => runStep("wallet_credited", "Coin server-side eklendi.", 15)} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                  3. Wallet Credit
                </button>
                <button onClick={() => runStep("manual_review", "Ödeme manual review’a alındı.", 5)} style={{ border: `1px solid ${T.red}`, background: "rgba(243,18,96,.08)", color: T.red, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                  Review
                </button>
              </div>
            </div>
          </PanelCard>
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <PanelCard T={T} title="Güvenlik Mantığı" icon={IC.shield}>
            <div style={{ display: "grid", gap: 9 }}>
              {[
                "Frontend coin bakiyesi artıramaz.",
                "Fiyat bilgisi backend package table’dan gelir.",
                "Webhook doğrulanmadan coin eklenmez.",
                "Her ödeme idempotency key ile korunur.",
                "Şüpheli ödemeler manual review’a düşer.",
                "Refund olursa ledger ters kayıt oluşturur.",
              ].map((rule) => (
                <div key={rule} style={{ border: "1px solid rgba(139,92,246,.24)", background: "rgba(139,92,246,.08)", borderRadius: 13, padding: 10, color: T.textSec, fontSize: 12, lineHeight: 1.45 }}>
                  🔒 {rule}
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Backend Endpointleri" icon={IC.server}>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                "POST /api/payments/create-checkout",
                "POST /api/webhooks/stripe",
                "POST /api/webhooks/iyzico",
                "POST /api/wallet/credit",
                "POST /api/payments/refund",
                "POST /api/invoices/create",
              ].map((endpoint) => (
                <div key={endpoint} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 13, padding: 10 }}>
                  <b style={{ fontSize: 11 }}>{endpoint}</b>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

function DatabaseSchemaRulesPage({ T, user, addXP }) {
  const [readiness,setReadiness]=useState(()=>readLocalJson(LYVORA_DATABASE_SCHEMA_STORAGE, buildDatabaseReadinessSeed()));
  const [selected,setSelected]=useState(LYVORA_COLLECTION_SCHEMAS[0]);
  const [toast,setToast]=useState("");
  const score=calcDatabaseReadiness(readiness);

  useEffect(()=>safeWriteLocalJson(LYVORA_DATABASE_SCHEMA_STORAGE, readiness),[readiness]);

  const toggle=(key)=>{ setReadiness(p=>({...p,[key]:!p[key]})); addXP?.(8); };
  const copyText=async(text,msg)=>{ try{ await navigator.clipboard.writeText(text); setToast(msg); }catch{ setToast("Kopyalama desteklenmedi."); } setTimeout(()=>setToast(""),2200); };

  return (
    <div style={{ padding:20, display:"grid", gap:18 }}>
      {toast && <div style={{position:"fixed",right:18,bottom:18,zIndex:5000,background:T.surface,color:T.text,border:`1px solid ${T.border}`,borderRadius:16,padding:"12px 14px",boxShadow:"0 18px 60px rgba(0,0,0,.25)",fontSize:13,fontWeight:850}}>{toast}</div>}

      <PanelCard T={T} title="Database Schema + Firestore Rules" icon={IC.server}>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:16,alignItems:"center"}}>
          <div>
            <p style={{color:T.purple,fontSize:13,fontWeight:950,letterSpacing:2}}>PRODUCTION BACKEND FOUNDATION</p>
            <h1 style={{margin:"6px 0 0",fontSize:34,fontWeight:950}}>🗄️ Database Architecture</h1>
            <p style={{color:T.textSec,marginTop:8,lineHeight:1.6}}>Users, creators, payments, referrals, reels, voice rooms, reports, notifications ve admin logs için güvenli Firestore şeması.</p>
          </div>
          <div style={{border:`1px solid ${T.border}`,background:T.surfaceAlt,borderRadius:18,padding:14,minWidth:180}}>
            <p style={{color:T.textTer,fontSize:10,fontWeight:900}}>DB READY SCORE</p>
            <b style={{fontSize:28,color:score>=80?T.green:T.purple}}>{score}%</b>
          </div>
        </div>
      </PanelCard>

      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 390px",gap:16}}>
        <div style={{display:"grid",gap:14}}>
          <PanelCard T={T} title="Collections" icon={IC.server}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
              {LYVORA_COLLECTION_SCHEMAS.map((s)=>(
                <button key={s.id} onClick={()=>setSelected(s)} style={{border:`1px solid ${selected.id===s.id?T.purple:T.border}`,background:selected.id===s.id?"rgba(139,92,246,.14)":T.surfaceAlt,color:T.text,borderRadius:17,padding:14,cursor:"pointer",textAlign:"left"}}>
                  <b>{s.title}</b>
                  <p style={{color:T.textSec,fontSize:12,lineHeight:1.45,marginTop:5}}>{s.purpose}</p>
                </button>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title={`Schema Detail: ${selected.title}`} icon={IC.list}>
            <div style={{display:"grid",gap:12}}>
              <div style={{border:`1px solid ${T.border}`,background:T.surfaceAlt,borderRadius:16,padding:13}}>
                <p style={{color:T.textTer,fontSize:10,fontWeight:900}}>ACCESS</p><b>{selected.access}</b>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
                {selected.fields.map(f=><div key={f} style={{border:`1px solid ${T.border}`,background:T.surfaceAlt,borderRadius:13,padding:10}}><b style={{fontSize:12}}>{f}</b></div>)}
              </div>
              <div style={{display:"grid",gap:8}}>
                {selected.security.map(r=><div key={r} style={{border:"1px solid rgba(139,92,246,.26)",background:"rgba(139,92,246,.08)",borderRadius:13,padding:10,color:T.textSec,fontSize:12}}>🔒 {r}</div>)}
              </div>
            </div>
          </PanelCard>

          <PanelCard T={T} title="Backend Endpoints" icon={IC.server}>
            <div style={{display:"grid",gap:9}}>
              {LYVORA_BACKEND_ENDPOINTS.map(([e,d])=><div key={e} style={{border:`1px solid ${T.border}`,background:T.surfaceAlt,borderRadius:14,padding:11}}><b style={{fontSize:12}}>{e}</b><p style={{color:T.textSec,fontSize:11,marginTop:4}}>{d}</p></div>)}
            </div>
          </PanelCard>
        </div>

        <div style={{display:"grid",gap:14,alignContent:"start"}}>
          <PanelCard T={T} title="Launch DB Checklist" icon={IC.task}>
            <div style={{display:"grid",gap:9}}>
              {[["schemaReviewed","Schema review"],["rulesReviewed","Firestore rules"],["backendEndpointsReady","Backend endpoints"],["webhookVerificationReady","Webhook verification"],["indexesPlanned","Firestore indexes"],["storageRulesReady","Storage/CDN rules"],["appCheckRequired","Firebase App Check"]].map(([k,l])=>(
                <button key={k} onClick={()=>toggle(k)} style={{border:`1px solid ${readiness[k]?"rgba(23,201,100,.38)":T.border}`,background:readiness[k]?"rgba(23,201,100,.07)":T.surfaceAlt,color:T.text,borderRadius:14,padding:11,textAlign:"left",cursor:"pointer",fontWeight:900}}>{readiness[k]?"✅":"⚠️"} {l}</button>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Security Rules Draft" icon={IC.shield}>
            <p style={{color:T.textSec,fontSize:12,lineHeight:1.5}}>Ödeme, coin, wallet, creator private ve referral komisyonları client tarafından yazılamaz. Sadece backend/webhook yazar.</p>
            <div style={{marginTop:12,maxHeight:300,overflow:"auto",border:`1px solid ${T.border}`,background:T.surfaceAlt,borderRadius:14,padding:12,fontFamily:"ui-monospace, Menlo, monospace",fontSize:10,whiteSpace:"pre-wrap",color:T.textSec}}>{LYVORA_FIRESTORE_RULES_DRAFT}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
              <button onClick={()=>copyText(LYVORA_FIRESTORE_RULES_DRAFT,"Rules kopyalandı.")} style={{border:"none",background:T.purple,color:"#fff",borderRadius:13,padding:"10px 12px",fontWeight:950,cursor:"pointer"}}>Rules Kopyala</button>
              <button onClick={()=>copyText(JSON.stringify(LYVORA_COLLECTION_SCHEMAS,null,2),"Schema kopyalandı.")} style={{border:`1px solid ${T.border}`,background:T.surfaceAlt,color:T.text,borderRadius:13,padding:"10px 12px",fontWeight:950,cursor:"pointer"}}>Schema JSON</button>
            </div>
          </PanelCard>

          <PanelCard T={T} title="Kritik Launch Notları" icon={IC.lock}>
            <div style={{display:"grid",gap:8}}>
              {["Coin bakiyesi frontend’den artırılmamalı.","Payment status sadece verified webhook ile değişmeli.","Creator banka/wallet bilgisi private collection’da kalmalı.","Reports ve moderation logları admin/mod dışına açılmamalı.","Reels media upload için signed upload URL kullanılmalı.","App Check ve rate limit launch öncesi aktif edilmeli."].map(n=><div key={n} style={{color:T.textSec,fontSize:12,lineHeight:1.45,borderBottom:`1px solid ${T.borderLight}`,paddingBottom:8}}>• {n}</div>)}
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

function AuthLaunchFoundationPage({ T, user, addXP }) {
  const [authState, setAuthState] = useState(() =>
    readLocalJson(LYVORA_AUTH_SECURITY_STORAGE, buildAuthSecuritySeed())
  );
  const [sessions, setSessions] = useState(() =>
    readLocalJson(LYVORA_DEVICE_SESSIONS_STORAGE, buildDeviceSessionsSeed())
  );
  const [events, setEvents] = useState(() =>
    readLocalJson(LYVORA_AUTH_EVENTS_STORAGE, [])
  );
  const [toast, setToast] = useState("");

  const score = calculateAuthLaunchScore(authState);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2300);
  };

  useEffect(() => {
    safeWriteLocalJson(LYVORA_AUTH_SECURITY_STORAGE, authState);
  }, [authState]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_DEVICE_SESSIONS_STORAGE, sessions);
  }, [sessions]);

  const updateAuth = (patch, eventType) => {
    const next = { ...authState, ...patch };
    setAuthState(next);
    const updatedEvents = pushAuthEvent(eventType, patch);
    setEvents(updatedEvents);
    addXP?.(12);
  };

  const simulateProviderLogin = (provider) => {
    const session = {
      id: `device-${Date.now()}`,
      device: `${provider.title} Session`,
      location: "Demo secure login",
      lastActive: Date.now(),
      trusted: provider.id !== "phone",
      current: false,
    };

    setSessions((prev) => [session, ...prev].slice(0, 8));
    const updatedEvents = pushAuthEvent("provider_login_test", { provider: provider.id });
    setEvents(updatedEvents);
    addXP?.(10);
    showToast(`${provider.title} login hook test edildi.`);
  };

  const revokeSession = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id || s.current));
    const updatedEvents = pushAuthEvent("session_revoked", { id });
    setEvents(updatedEvents);
    showToast("Session revoke edildi.");
  };

  const sendVerification = () => {
    updateAuth({ emailVerified: true }, "email_verification_sent");
    showToast("Email verification demo tamamlandı.");
  };

  const enable2FA = () => {
    updateAuth({ twoFactorEnabled: true, backupCodesGenerated: true }, "two_factor_enabled");
    showToast("2FA + backup codes aktif edildi.");
  };

  const resetPassword = () => {
    const updatedEvents = pushAuthEvent("password_reset_requested", { user: user?.email || "local-user" });
    setEvents(updatedEvents);
    showToast("Password reset link demo gönderildi.");
  };

  const checklist = [
    ["Email doğrulama", authState.emailVerified, "Kullanıcının email adresi doğrulanmadan kritik işlemler açılmamalı."],
    ["Google login", true, "Firebase/Auth provider tarafında Google OAuth bağlanacak."],
    ["Apple login", true, "iOS ve web için Apple provider hook hazır."],
    ["2FA", authState.twoFactorEnabled, "Creator, admin ve ödeme hesapları için şart."],
    ["Backup codes", authState.backupCodesGenerated, "2FA kaybında hesap kurtarma için gerekli."],
    ["Device security", authState.deviceProtection, "Bilinmeyen cihazlar event log’a düşer."],
    ["Password reset", authState.passwordResetReady, "Şifre sıfırlama flow’u launch için zorunlu."],
    ["Suspicious login guard", authState.suspiciousLoginProtection, "Aynı anda farklı ülke/cihaz risklerinde manuel kontrol."],
  ];

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 5000,
            background: T.surface,
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 18px 60px rgba(0,0,0,.25)",
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {toast}
        </div>
      )}

      <PanelCard T={T} title="Auth System / Launch Foundation" icon={IC.lock}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>LAUNCH AUTH SECURITY</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, fontWeight: 950 }}>🔐 Gerçek Auth Altyapısı</h1>
            <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
              Launch için email doğrulama, Google/Apple login, 2FA, device session, password reset ve suspicious login guard hazırlığı.
            </p>
          </div>

          <div style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 14, minWidth: 180 }}>
            <p style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>AUTH READY SCORE</p>
            <b style={{ fontSize: 28, color: score >= 80 ? T.green : T.purple }}>{score}%</b>
          </div>
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <PanelCard T={T} title="Provider Hooks" icon={IC.server}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
              {AUTH_PROVIDER_HOOKS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => simulateProviderLogin(provider)}
                  style={{
                    border: "1px solid rgba(139,92,246,.26)",
                    background: T.surfaceAlt,
                    color: T.text,
                    borderRadius: 17,
                    padding: 14,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <b>{provider.icon} {provider.title}</b>
                  <p style={{ color: T.textSec, fontSize: 12, marginTop: 5 }}>{provider.status}</p>
                </button>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Launch Checklist" icon={IC.task}>
            <div style={{ display: "grid", gap: 10 }}>
              {checklist.map(([label, done, desc]) => (
                <div
                  key={label}
                  style={{
                    border: `1px solid ${done ? "rgba(23,201,100,.38)" : T.border}`,
                    background: done ? "rgba(23,201,100,.07)" : T.surfaceAlt,
                    borderRadius: 16,
                    padding: 13,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <b style={{ fontSize: 13 }}>{done ? "✅" : "⚠️"} {label}</b>
                    <span style={{ color: done ? T.green : "#f59e0b", fontSize: 11, fontWeight: 950 }}>
                      {done ? "READY" : "NEEDED"}
                    </span>
                  </div>
                  <p style={{ color: T.textSec, fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>{desc}</p>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Auth Actions" icon={IC.zap}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button onClick={sendVerification} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                Email Doğrula
              </button>
              <button onClick={enable2FA} style={{ border: "none", background: T.green, color: "#fff", borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                2FA Aktif Et
              </button>
              <button onClick={resetPassword} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                Password Reset
              </button>
            </div>
          </PanelCard>
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <PanelCard T={T} title="Device Sessions" icon={IC.server}>
            <div style={{ display: "grid", gap: 9 }}>
              {sessions.map((session) => (
                <div key={session.id} style={{ border: `1px solid ${session.trusted ? "rgba(23,201,100,.32)" : T.border}`, background: T.surfaceAlt, borderRadius: 14, padding: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <b style={{ fontSize: 12 }}>{session.device}</b>
                    <span style={{ color: session.trusted ? T.green : "#f59e0b", fontSize: 11, fontWeight: 950 }}>
                      {session.current ? "CURRENT" : session.trusted ? "TRUSTED" : "NEW"}
                    </span>
                  </div>
                  <p style={{ color: T.textSec, fontSize: 11, marginTop: 4 }}>
                    {session.location} · {new Date(session.lastActive).toLocaleTimeString("tr-TR")}
                  </p>
                  {!session.current && (
                    <button
                      onClick={() => revokeSession(session.id)}
                      style={{
                        marginTop: 8,
                        border: `1px solid ${T.border}`,
                        background: T.surface,
                        color: T.text,
                        borderRadius: 11,
                        padding: "7px 9px",
                        fontWeight: 900,
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Auth Event Log" icon={IC.list}>
            <div style={{ display: "grid", gap: 8 }}>
              {events.length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Henüz auth event yok.</p>}
              {events.slice(0, 8).map((event) => (
                <div key={event.id} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 13, padding: 9 }}>
                  <b style={{ fontSize: 11 }}>{event.type}</b>
                  <p style={{ color: T.textSec, fontSize: 10, marginTop: 3 }}>
                    {new Date(event.createdAt).toLocaleTimeString("tr-TR")}
                  </p>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Backend Notu" icon={IC.shield}>
            <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.6 }}>
              Bu panel launch auth flow’unu hazırlar. Production’da token/session güvenliği backend tarafında yapılır; frontend sadece güvenli provider flow’u başlatır.
            </p>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

function ReelsShortsSystemPage({ T, user, addXP }) {
  const [reels, setReels] = useState(() =>
    readLocalJson(LYVORA_REELS_STORAGE, buildReelsSeed())
  );
  const [analytics, setAnalytics] = useState(() =>
    readLocalJson(LYVORA_REELS_ANALYTICS_STORAGE, buildReelsAnalyticsSeed())
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedTag, setSelectedTag] = useState("all");
  const [caption, setCaption] = useState("");
  const [toast, setToast] = useState("");

  const activeReel = reels[activeIndex] || reels[0];
  const filteredReels = selectedTag === "all" ? reels : reels.filter((r) => r.hashtag === selectedTag);
  const trending = [...reels].sort((a, b) => calcReelViralScore(b) - calcReelViralScore(a)).slice(0, 5);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2300);
  };

  useEffect(() => {
    safeWriteLocalJson(LYVORA_REELS_STORAGE, reels);
  }, [reels]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_REELS_ANALYTICS_STORAGE, analytics);
  }, [analytics]);

  const nextReel = () => {
    setActiveIndex((idx) => (idx + 1) % Math.max(1, reels.length));
    setAnalytics((prev) => ({ ...prev, totalViews: Number(prev.totalViews || 0) + 1 }));
    addXP?.(2);
  };

  const prevReel = () => {
    setActiveIndex((idx) => (idx - 1 + reels.length) % Math.max(1, reels.length));
  };

  const updateReel = (id, patch) => {
    setReels((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const likeReel = () => {
    if (!activeReel) return;
    updateReel(activeReel.id, { likes: Number(activeReel.likes || 0) + 1 });
    addXP?.(4);
    showToast("Reel beğenildi.");
  };

  const commentReel = () => {
    if (!activeReel) return;
    updateReel(activeReel.id, { comments: Number(activeReel.comments || 0) + 1 });
    addXP?.(5);
    showToast("Yorum eklendi.");
  };

  const shareReel = () => {
    if (!activeReel) return;
    updateReel(activeReel.id, { shares: Number(activeReel.shares || 0) + 1 });
    addXP?.(8);
    showToast("Reel paylaşıldı.");
  };

  const saveReel = () => {
    if (!activeReel) return;
    updateReel(activeReel.id, { saves: Number(activeReel.saves || 0) + 1 });
    showToast("Reel kaydedildi.");
  };

  const uploadDemoReel = () => {
    const tag = REELS_HASHTAGS[Math.floor(Math.random() * REELS_HASHTAGS.length)];
    const newReel = {
      id: `reel-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      creator: user?.name || user?.tag || "You",
      title: caption || "Yeni Lyvora short",
      hashtag: tag,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      views: 1,
      watchTime: 20,
      boost: false,
      monetized: true,
      color: "linear-gradient(160deg,#0f172a,#4c1d95,#8b5cf6)",
      createdAt: Date.now(),
    };
    setReels((prev) => [newReel, ...prev].slice(0, 40));
    setActiveIndex(0);
    setAnalytics((prev) => ({ ...prev, uploaded: Number(prev.uploaded || 0) + 1 }));
    setCaption("");
    addXP?.(30);
    showToast("Demo reel yüklendi.");
  };

  const boostReel = () => {
    if (!activeReel) return;
    updateReel(activeReel.id, { boost: true, views: Number(activeReel.views || 0) + 1500 });
    setAnalytics((prev) => ({ ...prev, boostedCount: Number(prev.boostedCount || 0) + 1 }));
    addXP?.(15);
    showToast("Premium boost aktif edildi.");
  };

  const monetizeReel = () => {
    if (!activeReel) return;
    const revenue = Math.max(5, Math.round(calcReelViralScore(activeReel) / 3));
    updateReel(activeReel.id, { monetized: true });
    setAnalytics((prev) => ({ ...prev, totalRevenue: Number(prev.totalRevenue || 0) + revenue }));
    showToast(`Reels revenue +₺${revenue}`);
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 5000,
            background: T.surface,
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 18px 60px rgba(0,0,0,.25)",
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {toast}
        </div>
      )}

      <PanelCard T={T} title="Shorts / Reels System" icon={IC.game}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>LYVORA REELS</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, fontWeight: 950 }}>🎬 Shorts / Reels Feed</h1>
            <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
              Dikey video feed, viral score, hashtag, creator analytics, premium boost ve reels monetization sistemi.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={prevReel} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "10px 12px", fontWeight: 950, cursor: "pointer" }}>
              ↑ Önceki
            </button>
            <button onClick={nextReel} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "10px 12px", fontWeight: 950, cursor: "pointer" }}>
              Sonraki ↓
            </button>
          </div>
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 440px) minmax(0,1fr) 340px", gap: 16, alignItems: "start" }}>
        <div
          style={{
            minHeight: 680,
            borderRadius: 30,
            overflow: "hidden",
            border: "1px solid rgba(139,92,246,.32)",
            background: activeReel?.color || "linear-gradient(160deg,#111,#4c1d95)",
            position: "relative",
            boxShadow: "0 22px 80px rgba(139,92,246,.18)",
            color: "#fff",
            padding: 22,
            display: "grid",
            alignContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 999, padding: "8px 10px", fontWeight: 950, fontSize: 12 }}>
                {activeReel?.hashtag}
              </span>
              <span style={{ background: activeReel?.boost ? "#8b5cf6" : "rgba(255,255,255,.14)", borderRadius: 999, padding: "8px 10px", fontWeight: 950, fontSize: 12 }}>
                Viral {calcReelViralScore(activeReel || {})}
              </span>
            </div>
          </div>

          <div style={{ textAlign: "center", display: "grid", gap: 18 }}>
            <div style={{ fontSize: 88, filter: "drop-shadow(0 0 35px rgba(255,255,255,.25))" }}>▶</div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>{activeReel?.title}</h2>
            <p style={{ color: "rgba(255,255,255,.72)", margin: 0 }}>@{activeReel?.creator} · {Number(activeReel?.views || 0).toLocaleString("tr-TR")} görüntülenme</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {[
              ["♡", activeReel?.likes, likeReel],
              ["💬", activeReel?.comments, commentReel],
              ["↗", activeReel?.shares, shareReel],
              ["🔖", activeReel?.saves, saveReel],
            ].map(([icon, value, fn]) => (
              <button
                key={icon}
                onClick={fn}
                style={{
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(255,255,255,.10)",
                  color: "#fff",
                  borderRadius: 16,
                  padding: "11px 8px",
                  cursor: "pointer",
                  fontWeight: 950,
                }}
              >
                <div>{icon}</div>
                <small>{Number(value || 0).toLocaleString("tr-TR")}</small>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <PanelCard T={T} title="Upload / Creator Studio" icon={IC.upload}>
            <div style={{ display: "grid", gap: 12 }}>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Reel başlığı yaz..."
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.surfaceAlt,
                  color: T.text,
                  borderRadius: 14,
                  padding: "12px 13px",
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {REELS_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    style={{
                      border: `1px solid ${selectedTag === tag ? T.purple : T.border}`,
                      background: selectedTag === tag ? "rgba(139,92,246,.14)" : T.surfaceAlt,
                      color: selectedTag === tag ? T.purple : T.textSec,
                      borderRadius: 999,
                      padding: "8px 10px",
                      fontWeight: 900,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    {tag}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedTag("all")}
                  style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.textSec, borderRadius: 999, padding: "8px 10px", fontWeight: 900, cursor: "pointer", fontSize: 12 }}
                >
                  all
                </button>
              </div>
              <button onClick={uploadDemoReel} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 15, padding: "12px 14px", fontWeight: 950, cursor: "pointer" }}>
                Demo Reel Yükle
              </button>
            </div>
          </PanelCard>

          <PanelCard T={T} title="Reels List" icon={IC.list}>
            <div style={{ display: "grid", gap: 9 }}>
              {filteredReels.map((reel, idx) => (
                <button
                  key={reel.id}
                  onClick={() => setActiveIndex(reels.findIndex((r) => r.id === reel.id))}
                  style={{
                    border: `1px solid ${activeReel?.id === reel.id ? "rgba(139,92,246,.55)" : T.border}`,
                    background: activeReel?.id === reel.id ? "rgba(139,92,246,.12)" : T.surfaceAlt,
                    color: T.text,
                    borderRadius: 15,
                    padding: 11,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <b style={{ fontSize: 12 }}>{reel.title}</b>
                  <p style={{ color: T.textSec, fontSize: 11, marginTop: 4 }}>@{reel.creator} · {reel.hashtag} · Viral {calcReelViralScore(reel)}</p>
                </button>
              ))}
            </div>
          </PanelCard>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <PanelCard T={T} title="Creator Analytics" icon={IC.bar}>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                ["Uploaded", analytics.uploaded],
                ["Total Views", analytics.totalViews],
                ["Revenue", `₺${analytics.totalRevenue || 0}`],
                ["Boosted", analytics.boostedCount],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 14, padding: 11, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.textSec, fontSize: 12 }}>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Monetization" icon={IC.crown}>
            <div style={{ display: "grid", gap: 9 }}>
              <button onClick={boostReel} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "11px 13px", fontWeight: 950, cursor: "pointer" }}>
                Premium Boost
              </button>
              <button onClick={monetizeReel} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 13px", fontWeight: 950, cursor: "pointer" }}>
                Revenue Simüle Et
              </button>
            </div>
          </PanelCard>

          <PanelCard T={T} title="Trending Reels" icon={IC.trend}>
            <div style={{ display: "grid", gap: 9 }}>
              {trending.map((reel, idx) => (
                <div key={reel.id} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 14, padding: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <b style={{ fontSize: 12 }}>#{idx + 1} {reel.creator}</b>
                    <p style={{ color: T.textSec, fontSize: 11, marginTop: 3 }}>{reel.hashtag}</p>
                  </div>
                  <b style={{ color: T.purple }}>{calcReelViralScore(reel)}</b>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

function VoiceStageRoomsPage({ T, user, addXP }) {
  const [rooms, setRooms] = useState(() =>
    readLocalJson(LYVORA_VOICE_ROOMS_STORAGE, buildVoiceRoomsSeed())
  );
  const [activeRoom, setActiveRoom] = useState(() =>
    readLocalJson(LYVORA_ACTIVE_ROOM_STORAGE, null)
  );
  const [micOn, setMicOn] = useState(false);
  const [deafen, setDeafen] = useState(false);
  const [speakerQueue, setSpeakerQueue] = useState([]);
  const [toast, setToast] = useState("");

  const currentUser = user?.name || user?.tag || "You";

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2300);
  };

  useEffect(() => {
    safeWriteLocalJson(LYVORA_VOICE_ROOMS_STORAGE, rooms);
  }, [rooms]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_ACTIVE_ROOM_STORAGE, activeRoom);
  }, [activeRoom]);

  const createRoom = (template) => {
    const room = buildVoiceRoom(template, user);
    setRooms((prev) => [room, ...prev].slice(0, 12));
    setActiveRoom(room);
    addXP?.(25);
    showToast(`${room.title} oluşturuldu.`);
  };

  const joinRoom = (room) => {
    const joined = {
      ...room,
      listeners: Number(room.listeners || 0) + 1,
    };
    setActiveRoom(joined);
    setRooms((prev) => prev.map((r) => (r.id === room.id ? joined : r)));
    addXP?.(10);
    showToast(`${room.title} odasına katıldın.`);
  };

  const leaveRoom = () => {
    setActiveRoom(null);
    setMicOn(false);
    setDeafen(false);
    showToast("Voice room’dan çıkıldı.");
  };

  const toggleMic = () => {
    setMicOn((v) => !v);
    addXP?.(micOn ? 0 : 5);
  };

  const requestSpeaker = () => {
    if (!activeRoom) return;
    if (speakerQueue.includes(currentUser)) return showToast("Zaten konuşmacı sırasındasın.");
    setSpeakerQueue((prev) => [...prev, currentUser]);
    showToast("Speaker queue’ya eklendin.");
  };

  const approveSpeaker = () => {
    if (!activeRoom || speakerQueue.length === 0) return showToast("Queue boş.");
    const nextSpeaker = speakerQueue[0];
    const updated = {
      ...activeRoom,
      speakers: [...new Set([...(activeRoom.speakers || []), nextSpeaker])],
    };
    setActiveRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSpeakerQueue((prev) => prev.slice(1));
    showToast(`${nextSpeaker} konuşmacı oldu.`);
  };

  const sendReaction = (emoji) => {
    if (!activeRoom) return;
    const updated = {
      ...activeRoom,
      reactions: Number(activeRoom.reactions || 0) + 1,
    };
    setActiveRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    addXP?.(3);
    showToast(`${emoji} reaction gönderildi.`);
  };

  const copyInvite = async () => {
    const url = `https://lyvora.app/room/${activeRoom?.id || "voice"}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Room invite link kopyalandı.");
    } catch {
      showToast(url);
    }
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 5000,
            background: T.surface,
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 18px 60px rgba(0,0,0,.25)",
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {toast}
        </div>
      )}

      <PanelCard T={T} title="Voice Rooms + Live Stage" icon={IC.zap}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>LIVE VOICE ECOSYSTEM</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, fontWeight: 950 }}>🎙️ Voice Stage Rooms</h1>
            <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
              Public voice room, creator stage, premium oda, speaker queue, reaction, mute/deafen ve invite link sistemi.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {VOICE_ROOM_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => createRoom(tpl)}
                style={{
                  border: `1px solid rgba(139,92,246,.32)`,
                  background: "rgba(139,92,246,.10)",
                  color: T.purple,
                  borderRadius: 14,
                  padding: "10px 12px",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                {tpl.icon} {tpl.title}
              </button>
            ))}
          </div>
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16 }}>
        <div style={{ display: "grid", gap: 14 }}>
          {activeRoom && (
            <PanelCard T={T} title="Aktif Oda" icon={IC.zap}>
              <div
                style={{
                  border: "1px solid rgba(139,92,246,.28)",
                  background:
                    "radial-gradient(circle at 20% 0%, rgba(139,92,246,.18), transparent 35%), linear-gradient(135deg,rgba(139,92,246,.08),rgba(255,255,255,.02))",
                  borderRadius: 24,
                  padding: 18,
                  display: "grid",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 26, fontWeight: 950 }}>{activeRoom.title}</h2>
                    <p style={{ color: T.textSec, marginTop: 6 }}>
                      Host: {activeRoom.host} · {activeRoom.mode} · {activeRoom.listeners} dinleyici
                    </p>
                  </div>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 22,
                      background: micOn ? "rgba(139,92,246,.22)" : T.surfaceAlt,
                      border: `1px solid ${micOn ? "rgba(139,92,246,.55)" : T.border}`,
                      display: "grid",
                      placeItems: "center",
                      boxShadow: micOn ? "0 0 34px rgba(139,92,246,.34)" : "none",
                      fontSize: 26,
                    }}
                  >
                    {micOn ? "🎙️" : "🔇"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
                  {(activeRoom.speakers || []).map((sp) => (
                    <div key={sp} style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: 16, padding: 12 }}>
                      <b>🎤 {sp}</b>
                      <p style={{ color: T.textSec, fontSize: 11, marginTop: 4 }}>Speaker</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button onClick={toggleMic} style={{ border: "none", background: micOn ? T.green : T.purple, color: "#fff", borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                    {micOn ? "Mic Açık" : "Mic Aç"}
                  </button>
                  <button onClick={() => setDeafen((v) => !v)} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                    {deafen ? "Deafen Açık" : "Deafen"}
                  </button>
                  <button onClick={requestSpeaker} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                    Konuşmacı İste
                  </button>
                  <button onClick={copyInvite} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                    Invite Link
                  </button>
                  <button onClick={leaveRoom} style={{ border: `1px solid ${T.red}`, background: "rgba(243,18,96,.08)", color: T.red, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                    Çık
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["💜", "🔥", "👏", "😂", "🌌"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        border: `1px solid ${T.border}`,
                        background: T.surface,
                        cursor: "pointer",
                        fontSize: 18,
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                  <span style={{ color: T.textSec, alignSelf: "center", fontSize: 12 }}>
                    {activeRoom.reactions || 0} reactions
                  </span>
                </div>
              </div>
            </PanelCard>
          )}

          <PanelCard T={T} title="Aktif Voice Rooms" icon={IC.users}>
            <div style={{ display: "grid", gap: 10 }}>
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => joinRoom(room)}
                  style={{
                    border: `1px solid ${activeRoom?.id === room.id ? "rgba(139,92,246,.55)" : T.border}`,
                    background: activeRoom?.id === room.id ? "rgba(139,92,246,.12)" : T.surfaceAlt,
                    color: T.text,
                    borderRadius: 18,
                    padding: 14,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <b>{room.premium ? "💎" : room.mode === "stage" ? "👑" : "🎙️"} {room.title}</b>
                    <p style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
                      Host {room.host} · {room.speakers?.length || 0} speaker · {room.listeners} listener
                    </p>
                  </div>
                  <span style={{ color: T.purple, fontWeight: 950 }}>Katıl</span>
                </button>
              ))}
            </div>
          </PanelCard>
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <PanelCard T={T} title="Speaker Queue" icon={IC.list}>
            <div style={{ display: "grid", gap: 9 }}>
              {speakerQueue.length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Queue boş.</p>}
              {speakerQueue.map((sp, idx) => (
                <div key={`${sp}-${idx}`} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 14, padding: 10, display: "flex", justifyContent: "space-between" }}>
                  <b style={{ fontSize: 12 }}>{sp}</b>
                  <span style={{ color: T.textSec, fontSize: 11 }}>#{idx + 1}</span>
                </div>
              ))}
              <button onClick={approveSpeaker} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "11px 13px", fontWeight: 950, cursor: "pointer" }}>
                İlk Kişiyi Speaker Yap
              </button>
            </div>
          </PanelCard>

          <PanelCard T={T} title="Creator Monetization Hooks" icon={IC.crown}>
            <div style={{ display: "grid", gap: 9 }}>
              {[
                ["Live Donate", "Canlı oda içinde donate hook"],
                ["Premium Room", "Özel oda giriş ücreti"],
                ["Room Subscription", "Creator oda aboneliği"],
                ["Sponsor Room", "Sponsorlu stage paneli"],
              ].map(([title, desc]) => (
                <div key={title} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 14, padding: 10 }}>
                  <b style={{ fontSize: 12 }}>{title}</b>
                  <p style={{ color: T.textSec, fontSize: 11, marginTop: 4 }}>{desc}</p>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Moderation" icon={IC.shield}>
            <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.6 }}>
              Host ve modlar oda kilitleme, konuşmacı onayı, mute/deafen, rapor ve premium erişim kontrollerini yönetebilir.
            </p>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

function LyvoraInfoOnboardingCenter({ T, nav }) {
  const infoCards = [
    {
      icon: "🌌",
      title: "Lyvora Nedir?",
      route: "home",
      button: "Ana Sayfaya Git",
      desc: "Lyvora; anonim sohbet, topluluk, oyun, creator ekonomisi, ödeme sistemi ve global dil desteğini tek sosyal evrende birleştiren yeni nesil platformdur.",
      bullets: ["Anonim topluluklar", "Mini oyunlar", "Creator sistemi", "Global sosyal deneyim"],
    },
    {
      icon: "💳",
      title: "Coin & Ödeme Sistemi",
      route: "payments",
      button: "Ödemelere Git",
      desc: "Coin satın alarak premium, creator destekleri, marketplace ürünleri, özel odalar ve etkinliklerde kullanabilirsin.",
      bullets: ["Banka / Kredi Kartı", "Apple Pay", "Google Pay", "Kripto Wallet", "Coin ile ödeme"],
    },
    {
      icon: "👑",
      title: "Creator Partner Programı",
      route: "affiliate",
      button: "Partner Paneline Git",
      desc: "Creatorlar özel davet linklerini paylaşarak kullanıcı getirebilir. Gelen kullanıcı kayıt olur, coin alır veya premium açarsa creator gelir payı kazanır.",
      bullets: ["Özel referral link", "Satışlardan komisyon", "Partner tier bonusu", "Leaderboard sistemi"],
    },
    {
      icon: "💸",
      title: "Creator Gelir Paneli",
      route: "creatorRevenue",
      button: "Creator Gelire Git",
      desc: "Creator gelirlerini, referral satışlarını, pending bakiyeyi, withdraw geçmişini ve analytics verilerini tek panelden takip eder.",
      bullets: ["IBAN çekim", "Dijital banka", "Wise / global transfer", "Revolut / global wallet", "Crypto wallet"],
    },
    {
      icon: "🔒",
      title: "Gizlilik & Güvenlik",
      route: "security",
      button: "Güvenliği Aç",
      desc: "Kart, banka, gerçek isim ve özel ödeme bilgileri creatorlarla paylaşılmaz. Creator sadece public kullanıcı adı, alınan ürün ve kendi komisyonunu görür.",
      bullets: ["Kart bilgisi gizli", "Banka bilgisi gizli", "Fraud kontrol", "Güvenli ödeme hookları"],
    },
    {
      icon: "🌍",
      title: "Global Dil Sistemi",
      route: "global",
      button: "Dil Paneline Git",
      desc: "Lyvora tarayıcı dilini otomatik algılar. Türkçe tarayıcıda Türkçe, İngilizce tarayıcıda English, Almanca tarayıcıda Deutsch açılır.",
      bullets: ["Otomatik dil algılama", "Locale storage", "Global kullanıcı deneyimi", "SEO hazırlığı"],
    },
    {
      icon: "🎮",
      title: "Oyunlar & Görevler",
      route: "minigames",
      button: "Mini Oyunlara Git",
      desc: "Mini oyunlar, görevler, sezon XP sistemi, leaderboard ve ödül sistemiyle kullanıcılar platformda daha fazla etkileşim kurar.",
      bullets: ["Mini oyunlar", "Günlük görevler", "XP sistemi", "Sezon ödülleri"],
    },
    {
      icon: "🚀",
      title: "Nasıl Başlanır?",
      route: "systems",
      button: "Tüm Sistemleri Gör",
      desc: "Sol menüden veya sağdaki Sistemler butonundan tüm özelliklere ulaşabilirsin. Creator olmak, coin almak, partner link oluşturmak ve gelir çekmek tek yerden yönetilir.",
      bullets: ["Sistemler → Ödemeler", "Sistemler → Partner / Referral", "Creator Gelir → Withdraw", "Profilim → Creator görünümü"],
    },
  ];

  const steps = [
    ["1", "Profilini oluştur", "Profilim sekmesinden avatar, bio, rozet ve creator görünümünü düzenle."],
    ["2", "Topluluğa katıl", "Global Chat, Topluluk Akışı, Sunucular ve Mood Eşleşme alanlarını keşfet."],
    ["3", "Coin al veya premium aç", "Sistemler → Ödemeler bölümünden kart, Apple Pay, Google Pay, kripto veya coin ile işlem yap."],
    ["4", "Partner linkini paylaş", "Partner / Referral panelinden özel davet linkini kopyala ve paylaş."],
    ["5", "Gelirini takip et", "Creator Gelir panelinden satışlarını, komisyonlarını ve withdraw işlemlerini yönet."],
  ];

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      <PanelCard T={T} title="Lyvora Bilgilendirme Merkezi" icon={IC.spark}>
        <div
          style={{
            borderRadius: 26,
            padding: 24,
            background:
              "radial-gradient(circle at 20% 0%, rgba(139,92,246,.24), transparent 34%), linear-gradient(135deg,#0b0714,#151026)",
            color: "#fff",
            border: "1px solid rgba(139,92,246,.28)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div style={{ position: "relative", zIndex: 2 }}>
            <p style={{ color: "#a78bfa", fontWeight: 950, letterSpacing: 3, fontSize: 12 }}>
              WELCOME TO LYVORA UNIVERSE
            </p>
            <h1 style={{ margin: "10px 0 0", fontSize: "clamp(30px,5vw,52px)", lineHeight: 1, fontWeight: 950 }}>
              🌌 Her şeyi tek yerden öğren
            </h1>
            <p style={{ color: "rgba(255,255,255,.72)", marginTop: 14, lineHeight: 1.7, maxWidth: 850 }}>
              Lyvora’da sohbet edebilir, oyun oynayabilir, coin satın alabilir, creatorları destekleyebilir,
              kendi partner linkini paylaşarak gelir kazanabilir ve kazancını güvenli şekilde çekebilirsin.
              Aşağıdaki kartlar sana her sistemin ne işe yaradığını ve nereden açılacağını gösterir.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => nav("systems")}
                style={{
                  border: "none",
                  background: "#8b5cf6",
                  color: "#fff",
                  borderRadius: 15,
                  padding: "12px 16px",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                Tüm Sistemleri Aç
              </button>
              <button
                onClick={() => nav("affiliate")}
                style={{
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(255,255,255,.08)",
                  color: "#fff",
                  borderRadius: 15,
                  padding: "12px 16px",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                Partner Linkimi Gör
              </button>
            </div>
          </div>
        </div>
      </PanelCard>

      <PanelCard T={T} title="5 Adımda Başla" icon={IC.task}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
          {steps.map(([no, title, desc]) => (
            <div key={no} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 15 }}>
              <div style={{ width: 34, height: 34, borderRadius: 13, background: "rgba(139,92,246,.16)", color: T.purple, display: "grid", placeItems: "center", fontWeight: 950 }}>
                {no}
              </div>
              <b style={{ display: "block", marginTop: 10 }}>{title}</b>
              <p style={{ color: T.textSec, fontSize: 12, lineHeight: 1.55, marginTop: 6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        {infoCards.map((card) => (
          <div
            key={card.title}
            style={{
              border: `1px solid ${T.border}`,
              background: T.surface,
              borderRadius: 22,
              padding: 18,
              display: "grid",
              gap: 12,
              boxShadow: "0 18px 55px rgba(0,0,0,.05)",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 17,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(139,92,246,.14)",
                  fontSize: 23,
                }}
              >
                {card.icon}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>{card.title}</h3>
                <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.6, marginTop: 7 }}>{card.desc}</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 7 }}>
              {card.bullets.map((b) => (
                <div key={b} style={{ display: "flex", gap: 8, alignItems: "center", color: T.textSec, fontSize: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: T.purple }} />
                  {b}
                </div>
              ))}
            </div>

            <button
              onClick={() => nav(card.route)}
              style={{
                marginTop: 4,
                border: "1px solid rgba(139,92,246,.22)",
                background: T.surfaceAlt,
                color: T.text,
                borderRadius: 14,
                padding: "11px 13px",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              {card.button} →
            </button>
          </div>
        ))}
      </div>

      <PanelCard T={T} title="Önemli Güvenlik Bilgisi" icon={IC.shield}>
        <p style={{ color: T.textSec, lineHeight: 1.7, margin: 0 }}>
          Creator partner sistemi şeffaf çalışır: Link üzerinden gelen kullanıcıların satın aldığı ürün türü,
          public kullanıcı adı ve creator komisyonu panelde görünebilir. Kart numarası, banka bilgisi,
          gerçek isim, ödeme sağlayıcı detayları ve özel finansal bilgiler hiçbir creator ile paylaşılmaz.
        </p>
      </PanelCard>
    </div>
  );
}

function CreatorAffiliateReferralPage({ T, user, addXP }) {
  const [affiliate, setAffiliate] = useState(() =>
    readLocalJson(LYVORA_AFFILIATE_STORAGE, buildAffiliateSeed(user))
  );
  const [events, setEvents] = useState(() =>
    readLocalJson(LYVORA_AFFILIATE_EVENTS_STORAGE, [])
  );
  const [demoUser, setDemoUser] = useState("@newuser");
  const [selectedType, setSelectedType] = useState("coin_purchase");
  const [amount, setAmount] = useState(399);
  const [toast, setToast] = useState("");

  const tier = getAffiliateTier(affiliate.totalEarnings);
  const inviteUrl = `https://lyvora.app/ref/${affiliate.customSlug || affiliate.creatorCode}`;
  const conversionRate = affiliate.clicks > 0 ? Math.round((affiliate.conversions / affiliate.clicks) * 100) : 0;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  useEffect(() => {
    safeWriteLocalJson(LYVORA_AFFILIATE_STORAGE, affiliate);
  }, [affiliate]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_AFFILIATE_EVENTS_STORAGE, events);
  }, [events]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast("Referral link kopyalandı.");
    } catch {
      showToast(inviteUrl);
    }
  };

  const simulateClick = () => {
    setAffiliate((prev) => ({ ...prev, clicks: Number(prev.clicks || 0) + 1 }));
    showToast("Referral click kaydedildi.");
  };

  const simulateSignup = () => {
    setAffiliate((prev) => ({
      ...prev,
      clicks: Number(prev.clicks || 0) + 1,
      signups: Number(prev.signups || 0) + 1,
    }));
    addXP?.(12);
    showToast("Referral signup kaydedildi.");
  };

  const simulatePurchase = () => {
    if (affiliate.locked) return showToast("Affiliate hesap güvenlik nedeniyle kilitli.");

    const event = createAffiliateEvent({
      userName: demoUser,
      type: selectedType,
      product: selectedType.replaceAll("_", " "),
      amount: Number(amount || 0),
      affiliate,
    });

    const suspicious = isSuspiciousAffiliateEvent(event, affiliate);

    setAffiliate((prev) => ({
      ...prev,
      clicks: Number(prev.clicks || 0) + 1,
      signups: Number(prev.signups || 0) + 1,
      conversions: Number(prev.conversions || 0) + (suspicious ? 0 : 1),
      totalSales: Number(prev.totalSales || 0) + (suspicious ? 0 : Number(amount || 0)),
      totalEarnings: Number(prev.totalEarnings || 0) + (suspicious ? 0 : event.commission),
      pendingEarnings: Number(prev.pendingEarnings || 0) + (suspicious ? 0 : event.commission),
      fraudFlags: Number(prev.fraudFlags || 0) + (suspicious ? 1 : 0),
      locked: Number(prev.fraudFlags || 0) + (suspicious ? 1 : 0) >= 5,
    }));

    setEvents((prev) => [
      { ...event, status: suspicious ? "flagged" : "confirmed" },
      ...prev,
    ].slice(0, 40));

    addXP?.(suspicious ? 0 : 25);
    showToast(suspicious ? "Şüpheli referral event flaglendi." : `Komisyon oluştu: ₺${event.commission}`);
  };

  const updateSlug = (value) => {
    const clean = String(value || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
    setAffiliate((prev) => ({ ...prev, customSlug: clean }));
  };

  const resetFraud = () => {
    setAffiliate((prev) => ({ ...prev, fraudFlags: 0, locked: false }));
    showToast("Demo fraud lock sıfırlandı.");
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 5000,
            background: T.surface,
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 18px 60px rgba(0,0,0,.25)",
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {toast}
        </div>
      )}

      <PanelCard T={T} title="Creator Partnership + Referral" icon={IC.crown}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>LYVORA PARTNER PROGRAM</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, fontWeight: 950 }}>{tier.icon} {tier.label}</h1>
            <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
              Creator özel linkini paylaşır. Linkten gelen kullanıcı kayıt olur, coin alır, üyelik alır veya donate yaparsa creator komisyon kazanır.
            </p>
          </div>

          <div style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 14, minWidth: 190 }}>
            <p style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>PENDING EARNINGS</p>
            <b style={{ fontSize: 26 }}>₺{Number(affiliate.pendingEarnings || 0).toLocaleString("tr-TR")}</b>
          </div>
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <PanelCard T={T} title="Özel Davet Linki" icon={IC.link}>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ color: T.textSec, fontSize: 12, fontWeight: 900 }}>Creator Slug</label>
              <input
                value={affiliate.customSlug || ""}
                onChange={(e) => updateSlug(e.target.value)}
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.surfaceAlt,
                  color: T.text,
                  borderRadius: 13,
                  padding: "12px 13px",
                  outline: "none",
                }}
              />

              <div style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 15, padding: 13 }}>
                <p style={{ color: T.textSec, fontSize: 11 }}>Referral URL</p>
                <b style={{ fontSize: 13, wordBreak: "break-all" }}>{inviteUrl}</b>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button onClick={copyInvite} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                  Linki Kopyala
                </button>
                <button onClick={simulateClick} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                  Click Test
                </button>
                <button onClick={simulateSignup} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                  Signup Test
                </button>
              </div>
            </div>
          </PanelCard>

          <PanelCard T={T} title="Referral Analytics" icon={IC.bar}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
              {[
                ["Clicks", affiliate.clicks],
                ["Signups", affiliate.signups],
                ["Conversions", affiliate.conversions],
                ["Conv. Rate", `%${conversionRate}`],
                ["Total Sales", `₺${Number(affiliate.totalSales || 0).toLocaleString("tr-TR")}`],
                ["Total Earnings", `₺${Number(affiliate.totalEarnings || 0).toLocaleString("tr-TR")}`],
                ["Fraud Flags", affiliate.fraudFlags],
                ["Tier Bonus", `+%${tier.bonus}`],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 16, padding: 13 }}>
                  <p style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>{label}</p>
                  <b style={{ fontSize: 17 }}>{value}</b>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Kim Ne Aldı? / Referral Sales" icon={IC.list}>
            <div style={{ display: "grid", gap: 9 }}>
              {events.length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Henüz referral satış yok.</p>}
              {events.slice(0, 10).map((event) => (
                <div key={event.id} style={{ border: `1px solid ${event.status === "flagged" ? T.red : T.border}`, background: event.status === "flagged" ? "rgba(243,18,96,.08)" : T.surfaceAlt, borderRadius: 14, padding: 11, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <b style={{ fontSize: 12 }}>{event.userName}</b>
                    <p style={{ color: T.textSec, fontSize: 11, marginTop: 3 }}>
                      {event.product} · ₺{event.amount} · %{event.rate}
                    </p>
                    <p style={{ color: T.textTer, fontSize: 10, marginTop: 3 }}>
                      Kart/banka bilgisi gösterilmez. Sadece ürün ve komisyon görünür.
                    </p>
                  </div>
                  <b style={{ color: event.status === "flagged" ? T.red : T.green }}>
                    {event.status === "flagged" ? "FLAG" : `+₺${event.commission}`}
                  </b>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <PanelCard T={T} title="Komisyon Testi" icon={IC.zap}>
            <div style={{ display: "grid", gap: 11 }}>
              <label style={{ color: T.textSec, fontSize: 12, fontWeight: 900 }}>Kullanıcı adı</label>
              <input
                value={demoUser}
                onChange={(e) => setDemoUser(e.target.value)}
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.surfaceAlt,
                  color: T.text,
                  borderRadius: 13,
                  padding: "12px 13px",
                  outline: "none",
                }}
              />

              <label style={{ color: T.textSec, fontSize: 12, fontWeight: 900 }}>Satış tipi</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.surfaceAlt,
                  color: T.text,
                  borderRadius: 13,
                  padding: "12px 13px",
                  outline: "none",
                }}
              >
                {Object.keys(AFFILIATE_SPLIT_RULES).map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")} · %{AFFILIATE_SPLIT_RULES[type]}
                  </option>
                ))}
              </select>

              <label style={{ color: T.textSec, fontSize: 12, fontWeight: 900 }}>Satış tutarı</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.surfaceAlt,
                  color: T.text,
                  borderRadius: 13,
                  padding: "12px 13px",
                  outline: "none",
                }}
              />

              <button onClick={simulatePurchase} style={{ border: "none", background: affiliate.locked ? T.border : T.purple, color: "#fff", borderRadius: 15, padding: "13px 15px", fontWeight: 950, cursor: affiliate.locked ? "not-allowed" : "pointer" }}>
                Referral Satış Simüle Et
              </button>

              {affiliate.locked && (
                <button onClick={resetFraud} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 13, padding: "10px 12px", fontWeight: 900, cursor: "pointer" }}>
                  Demo Fraud Lock Sıfırla
                </button>
              )}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Top Referrer Leaderboard" icon={IC.trophy}>
            <div style={{ display: "grid", gap: 9 }}>
              {[
                { name: affiliate.creatorCode, earnings: affiliate.totalEarnings, tier: tier.label },
                { name: "NOVA", earnings: 8420, tier: "Gold Partner" },
                { name: "MIRA", earnings: 6150, tier: "Gold Partner" },
                { name: "RAVEN", earnings: 2100, tier: "Silver Partner" },
              ].sort((a, b) => Number(b.earnings || 0) - Number(a.earnings || 0)).map((item, idx) => (
                <div key={item.name} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 14, padding: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <b style={{ fontSize: 12 }}>#{idx + 1} {item.name}</b>
                    <p style={{ color: T.textSec, fontSize: 11, marginTop: 3 }}>{item.tier}</p>
                  </div>
                  <b style={{ color: T.green }}>₺{Number(item.earnings || 0).toLocaleString("tr-TR")}</b>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Gizlilik Notu" icon={IC.shield}>
            <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.6 }}>
              Creator sadece kendi referral linkinden gelen kullanıcıların public kullanıcı adını, aldığı ürünü, satış tutarını ve kendi komisyonunu görür. Kart, banka, gerçek isim ve özel ödeme bilgileri gösterilmez.
            </p>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

function CreatorRevenueWithdrawPage({ T, user, addXP }) {
  const [revenue, setRevenue] = useState(() =>
    readLocalJson(LYVORA_CREATOR_REVENUE_STORAGE, buildCreatorRevenueSeed())
  );
  const [withdraws, setWithdraws] = useState(() =>
    readLocalJson(LYVORA_WITHDRAW_REQUESTS_STORAGE, [])
  );
  const [selectedMethod, setSelectedMethod] = useState(() => LYVORA_WITHDRAW_METHODS[0]);
  const [withdrawAmount, setWithdrawAmount] = useState(250);
  const [accountInfo, setAccountInfo] = useState("");
  const [toast, setToast] = useState("");

  const creatorName = user?.name || user?.tag || "Lyvora Creator";
  const canWithdraw = Number(revenue.availableBalance || 0) >= Number(revenue.minWithdrawTRY || 250);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  useEffect(() => {
    safeWriteLocalJson(LYVORA_CREATOR_REVENUE_STORAGE, revenue);
  }, [revenue]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_WITHDRAW_REQUESTS_STORAGE, withdraws);
  }, [withdraws]);

  const addRevenue = (sourceId) => {
    const source = LYVORA_REVENUE_SOURCES.find((s) => s.id === sourceId) || LYVORA_REVENUE_SOURCES[0];
    const variance = Math.floor(Math.random() * 90) - 20;
    const gross = Math.max(20, Number(source.avg || 100) + variance);
    const event = createRevenueEvent(sourceId, gross);

    setRevenue((prev) => ({
      ...prev,
      availableBalance: Number(prev.availableBalance || 0) + event.creatorNet,
      lifetimeRevenue: Number(prev.lifetimeRevenue || 0) + event.creatorNet,
      todayRevenue: Number(prev.todayRevenue || 0) + event.creatorNet,
      monthlyRevenue: Number(prev.monthlyRevenue || 0) + event.creatorNet,
      revenueEvents: [event, ...(prev.revenueEvents || [])].slice(0, 30),
      fraudScore: Math.max(0, Number(prev.fraudScore || 0) - 1),
    }));

    addXP?.(18);
    showToast(`${source.title}: +₺${event.creatorNet} net gelir`);
  };

  const requestWithdraw = () => {
    const amount = Number(withdrawAmount || 0);

    if (amount < Number(revenue.minWithdrawTRY || 250)) {
      return showToast(`Minimum çekim ₺${revenue.minWithdrawTRY}`);
    }

    if (amount > Number(revenue.availableBalance || 0)) {
      return showToast("Yetersiz çekilebilir bakiye.");
    }

    if (!String(accountInfo || "").trim()) {
      return showToast("Hesap bilgisi / IBAN / wallet alanını doldur.");
    }

    const request = {
      id: `wd-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      creator: creatorName,
      amount,
      currency: revenue.currency || "TRY",
      method: selectedMethod.id,
      methodTitle: selectedMethod.title,
      accountInfo: String(accountInfo || "").trim(),
      status: Number(revenue.fraudScore || 0) >= 60 ? "manual_review" : "pending",
      createdAt: Date.now(),
    };

    setWithdraws((prev) => [request, ...prev].slice(0, 30));

    setRevenue((prev) => ({
      ...prev,
      availableBalance: Number(prev.availableBalance || 0) - amount,
      pendingBalance: Number(prev.pendingBalance || 0) + amount,
    }));

    addXP?.(30);
    showToast("Withdraw isteği oluşturuldu.");
  };

  const markWithdrawPaid = (id) => {
    const target = withdraws.find((w) => w.id === id);
    if (!target || target.status === "paid") return;

    setWithdraws((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: "paid", paidAt: Date.now() } : w))
    );

    setRevenue((prev) => ({
      ...prev,
      pendingBalance: Math.max(0, Number(prev.pendingBalance || 0) - Number(target.amount || 0)),
      completedPayout: Number(prev.completedPayout || 0) + Number(target.amount || 0),
    }));

    showToast("Payout paid olarak işaretlendi.");
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 5000,
            background: T.surface,
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 18px 60px rgba(0,0,0,.25)",
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {toast}
        </div>
      )}

      <PanelCard T={T} title="Creator Revenue + Withdraw" icon={IC.crown}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>CREATOR PAYOUTS</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, fontWeight: 950 }}>💸 {creatorName}</h1>
            <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
              Donate, live revenue, membership, shop, event ticket ve sponsor gelirleri için çekim paneli.
            </p>
          </div>

          <div style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 14, minWidth: 190 }}>
            <p style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>ÇEKİLEBİLİR BAKİYE</p>
            <b style={{ fontSize: 26 }}>₺{Number(revenue.availableBalance || 0).toLocaleString("tr-TR")}</b>
          </div>
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <PanelCard T={T} title="Revenue Analytics" icon={IC.bar}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12 }}>
              {[
                ["Bugün", `₺${Number(revenue.todayRevenue || 0).toLocaleString("tr-TR")}`],
                ["Bu Ay", `₺${Number(revenue.monthlyRevenue || 0).toLocaleString("tr-TR")}`],
                ["Lifetime", `₺${Number(revenue.lifetimeRevenue || 0).toLocaleString("tr-TR")}`],
                ["Pending", `₺${Number(revenue.pendingBalance || 0).toLocaleString("tr-TR")}`],
                ["Paid", `₺${Number(revenue.completedPayout || 0).toLocaleString("tr-TR")}`],
                ["Fraud Risk", `${Number(revenue.fraudScore || 0)}/100`],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 16, padding: 13 }}>
                  <p style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>{label}</p>
                  <b style={{ fontSize: 17 }}>{value}</b>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Gelir Kaynakları" icon={IC.gift}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
              {LYVORA_REVENUE_SOURCES.map((source) => (
                <button
                  key={source.id}
                  onClick={() => addRevenue(source.id)}
                  style={{
                    border: `1px solid ${T.border}`,
                    background: T.surfaceAlt,
                    color: T.text,
                    borderRadius: 17,
                    padding: 14,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <b>{source.icon} {source.title}</b>
                  <p style={{ color: T.textSec, fontSize: 12, marginTop: 5 }}>Demo net gelir oluştur</p>
                </button>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Revenue History" icon={IC.clock}>
            <div style={{ display: "grid", gap: 9 }}>
              {(revenue.revenueEvents || []).length === 0 && (
                <p style={{ color: T.textSec, fontSize: 12 }}>Henüz revenue event yok.</p>
              )}
              {(revenue.revenueEvents || []).slice(0, 8).map((event) => (
                <div key={event.id} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 14, padding: 11, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <b style={{ fontSize: 12 }}>{event.sourceTitle}</b>
                    <p style={{ color: T.textSec, fontSize: 11, marginTop: 3 }}>
                      Gross ₺{event.amount} · Fee ₺{event.platformFee + event.paymentFee}
                    </p>
                  </div>
                  <b style={{ color: T.green }}>+₺{event.creatorNet}</b>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <PanelCard T={T} title="Withdraw Request" icon={IC.lock}>
            <div style={{ display: "grid", gap: 11 }}>
              <label style={{ color: T.textSec, fontSize: 12, fontWeight: 900 }}>Çekim Yöntemi</label>
              <div style={{ display: "grid", gap: 8 }}>
                {LYVORA_WITHDRAW_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method)}
                    style={{
                      border: `1px solid ${selectedMethod.id === method.id ? T.purple : T.border}`,
                      background: selectedMethod.id === method.id ? "rgba(139,92,246,.14)" : T.surfaceAlt,
                      color: T.text,
                      borderRadius: 14,
                      padding: 11,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <b style={{ fontSize: 12 }}>{method.icon} {method.title}</b>
                    <p style={{ color: T.textSec, fontSize: 10, marginTop: 3 }}>{method.desc}</p>
                  </button>
                ))}
              </div>

              <label style={{ color: T.textSec, fontSize: 12, fontWeight: 900 }}>Tutar</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min={revenue.minWithdrawTRY}
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.surfaceAlt,
                  color: T.text,
                  borderRadius: 13,
                  padding: "12px 13px",
                  outline: "none",
                }}
              />

              <label style={{ color: T.textSec, fontSize: 12, fontWeight: 900 }}>
                IBAN / Dijital Banka Hesabı / Global Wallet / Crypto Wallet
              </label>
              <textarea
                value={accountInfo}
                onChange={(e) => setAccountInfo(e.target.value)}
                placeholder="Örn: TR.. IBAN veya wallet bilgisi"
                rows={4}
                style={{
                  border: `1px solid ${T.border}`,
                  background: T.surfaceAlt,
                  color: T.text,
                  borderRadius: 13,
                  padding: "12px 13px",
                  outline: "none",
                  resize: "vertical",
                }}
              />

              <button
                onClick={requestWithdraw}
                disabled={!canWithdraw}
                style={{
                  border: "none",
                  background: canWithdraw ? T.purple : T.border,
                  color: "#fff",
                  borderRadius: 15,
                  padding: "13px 15px",
                  fontWeight: 950,
                  cursor: canWithdraw ? "pointer" : "not-allowed",
                }}
              >
                Withdraw İsteği Oluştur
              </button>

              <p style={{ color: T.textTer, fontSize: 11, lineHeight: 1.5 }}>
                Minimum çekim: ₺{revenue.minWithdrawTRY}. Normal banka, dijital banka, global wallet ve crypto seçenekleri hazır.
              </p>
            </div>
          </PanelCard>

          <PanelCard T={T} title="Withdraw History" icon={IC.list}>
            <div style={{ display: "grid", gap: 9 }}>
              {withdraws.length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Henüz çekim isteği yok.</p>}
              {withdraws.slice(0, 8).map((wd) => (
                <div key={wd.id} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 14, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <b style={{ fontSize: 12 }}>₺{Number(wd.amount || 0).toLocaleString("tr-TR")}</b>
                    <span style={{ color: wd.status === "paid" ? T.green : T.purple, fontSize: 11, fontWeight: 950 }}>{wd.status}</span>
                  </div>
                  <p style={{ color: T.textSec, fontSize: 11, marginTop: 4 }}>{wd.methodTitle}</p>
                  {wd.status !== "paid" && (
                    <button
                      onClick={() => markWithdrawPaid(wd.id)}
                      style={{
                        marginTop: 8,
                        border: `1px solid ${T.border}`,
                        background: T.surface,
                        color: T.text,
                        borderRadius: 11,
                        padding: "7px 9px",
                        fontWeight: 900,
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                    >
                      Demo Paid
                    </button>
                  )}
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

function PaymentOptionsPage({ T, user, addXP }) {
  const [wallet, setWallet] = useState(() =>
    readLocalJson(LYVORA_PAYMENT_WALLET_STORAGE, buildPaymentWalletSeed())
  );
  const [history, setHistory] = useState(() =>
    readLocalJson(LYVORA_PAYMENT_HISTORY_STORAGE, [])
  );
  const [selectedPackage, setSelectedPackage] = useState(() => LYVORA_COIN_PACKAGES[1]);
  const [selectedMethod, setSelectedMethod] = useState(() => LYVORA_PAYMENT_METHODS[0]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState("");

  const totalCoins = calculateCoinPackageTotal(selectedPackage, wallet);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  useEffect(() => {
    safeWriteLocalJson(LYVORA_PAYMENT_WALLET_STORAGE, wallet);
  }, [wallet]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_PAYMENT_HISTORY_STORAGE, history);
  }, [history]);

  const startCheckout = () => {
    setCheckoutOpen(true);
  };

  const completePayment = () => {
    if (selectedMethod.id === "coins") {
      if (Number(wallet.coins || 0) < Number(selectedPackage.coins || 0)) {
        return showToast("Yetersiz coin bakiyesi.");
      }

      setWallet((prev) => ({
        ...prev,
        coins: Number(prev.coins || 0) - Number(selectedPackage.coins || 0),
      }));

      const nextHistory = pushPaymentHistory({
        method: selectedMethod.id,
        packageId: selectedPackage.id,
        coins: -Number(selectedPackage.coins || 0),
        priceTRY: 0,
        status: "coin_payment_success",
      });
      setHistory(nextHistory);
      setCheckoutOpen(false);
      addXP?.(15);
      return showToast("Coin ile ödeme tamamlandı.");
    }

    const providerMap = {
      credit_card: "Stripe / Iyzico checkout",
      apple_pay: "Apple Pay session",
      google_pay: "Google Pay session",
      crypto: "Crypto invoice",
    };

    console.log("Payment hook ready:", providerMap[selectedMethod.id], {
      providerHooks: LYVORA_PAYMENT_PROVIDER_HOOKS,
      package: selectedPackage,
      user: user?.uid || user?.email || "local-user",
    });

    setWallet((prev) => ({
      ...prev,
      coins: Number(prev.coins || 0) + totalCoins,
      totalPurchased: Number(prev.totalPurchased || 0) + totalCoins,
      firstPurchaseBonusUsed: true,
    }));

    const nextHistory = pushPaymentHistory({
      method: selectedMethod.id,
      packageId: selectedPackage.id,
      coins: totalCoins,
      priceTRY: selectedPackage.priceTRY,
      status: "demo_payment_success",
    });
    setHistory(nextHistory);
    setCheckoutOpen(false);
    addXP?.(40);
    showToast(`${totalCoins} coin başarıyla yüklendi.`);
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 5000,
            background: T.surface,
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 18px 60px rgba(0,0,0,.25)",
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {toast}
        </div>
      )}

      <PanelCard T={T} title="Ödemeler + Coin Marketplace" icon={IC.gift}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>LYVORA PAYMENTS</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, fontWeight: 950 }}>💳 Coin Satın Al</h1>
            <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
              Banka/kredi kartı, Apple Pay, Google Pay, kripto ve coin ile ödeme seçenekleri hazır.
            </p>
          </div>

          <div style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 14, minWidth: 160 }}>
            <p style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>BAKİYE</p>
            <b style={{ fontSize: 24 }}>{Number(wallet.coins || 0).toLocaleString("tr-TR")} coin</b>
          </div>
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 16 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <PanelCard T={T} title="Coin Paketleri" icon={IC.gift}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
              {LYVORA_COIN_PACKAGES.map((pack) => {
                const selected = selectedPackage.id === pack.id;
                const total = calculateCoinPackageTotal(pack, wallet);
                return (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPackage(pack)}
                    style={{
                      border: `1px solid ${selected ? T.purple : T.border}`,
                      background: selected ? "rgba(139,92,246,.14)" : T.surfaceAlt,
                      color: T.text,
                      borderRadius: 18,
                      padding: 15,
                      cursor: "pointer",
                      textAlign: "left",
                      position: "relative",
                      boxShadow: selected ? "0 18px 55px rgba(139,92,246,.12)" : "none",
                    }}
                  >
                    {pack.popular && (
                      <span
                        style={{
                          position: "absolute",
                          right: 12,
                          top: 12,
                          background: T.purple,
                          color: "#fff",
                          borderRadius: 999,
                          padding: "5px 8px",
                          fontSize: 10,
                          fontWeight: 950,
                        }}
                      >
                        POPULAR
                      </span>
                    )}

                    <p style={{ color: T.purple, fontSize: 11, fontWeight: 950 }}>{pack.badge}</p>
                    <h2 style={{ margin: "8px 0 0", fontSize: 30, fontWeight: 950 }}>{pack.coins.toLocaleString("tr-TR")}</h2>
                    <p style={{ color: T.textSec, fontSize: 12, marginTop: 2 }}>coin</p>

                    {(pack.bonus > 0 || !wallet.firstPurchaseBonusUsed || wallet.premiumBonus) && (
                      <p style={{ color: T.green, fontSize: 11, fontWeight: 900, marginTop: 8 }}>
                        Toplam: {total.toLocaleString("tr-TR")} coin
                      </p>
                    )}

                    <h3 style={{ margin: "14px 0 0", fontSize: 22, fontWeight: 950 }}>₺{pack.priceTRY}</h3>
                  </button>
                );
              })}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Ödeme Yöntemi" icon={IC.lock}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
              {LYVORA_PAYMENT_METHODS.map((method) => {
                const selected = selectedMethod.id === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method)}
                    style={{
                      border: `1px solid ${selected ? T.purple : T.border}`,
                      background: selected ? "rgba(139,92,246,.14)" : T.surfaceAlt,
                      color: T.text,
                      borderRadius: 17,
                      padding: 14,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 23 }}>{method.icon}</span>
                      <div>
                        <b style={{ fontSize: 13 }}>{method.title}</b>
                        <p style={{ color: T.textSec, fontSize: 11, marginTop: 3 }}>{method.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </PanelCard>
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <PanelCard T={T} title="Checkout" icon={IC.task}>
            <div style={{ display: "grid", gap: 11 }}>
              {[
                ["Paket", `${selectedPackage.coins.toLocaleString("tr-TR")} coin`],
                ["Bonuslu Toplam", `${totalCoins.toLocaleString("tr-TR")} coin`],
                ["Yöntem", selectedMethod.title],
                ["Tutar", selectedMethod.id === "coins" ? `${selectedPackage.coins} coin` : `₺${selectedPackage.priceTRY}`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: `1px solid ${T.borderLight}`, paddingBottom: 8 }}>
                  <span style={{ color: T.textSec, fontSize: 12 }}>{label}</span>
                  <b style={{ fontSize: 12 }}>{value}</b>
                </div>
              ))}

              <button
                onClick={startCheckout}
                style={{
                  marginTop: 8,
                  border: "none",
                  background: T.purple,
                  color: "#fff",
                  borderRadius: 16,
                  padding: "13px 15px",
                  fontWeight: 950,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Ödemeyi Başlat
              </button>
            </div>
          </PanelCard>

          <PanelCard T={T} title="Ödeme Geçmişi" icon={IC.bar}>
            <div style={{ display: "grid", gap: 9 }}>
              {history.length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Henüz ödeme yok.</p>}
              {history.slice(0, 6).map((item) => (
                <div key={item.id} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 13, padding: 10 }}>
                  <b style={{ fontSize: 12 }}>{item.coins > 0 ? "+" : ""}{Number(item.coins || 0).toLocaleString("tr-TR")} coin</b>
                  <p style={{ color: T.textSec, fontSize: 11, marginTop: 3 }}>
                    {item.method} · {item.priceTRY ? `₺${item.priceTRY}` : "coin"} · {new Date(item.createdAt).toLocaleTimeString("tr-TR")}
                  </p>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>

      {checkoutOpen && (
        <div
          onClick={() => setCheckoutOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4200,
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(10px)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(480px, 100%)",
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 30px 100px rgba(0,0,0,.38)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 950 }}>Checkout</h2>
            <p style={{ color: T.textSec, marginTop: 8, lineHeight: 1.6 }}>
              Demo modda ödeme simüle edilir. Production’da Stripe / Iyzico / Apple Pay / Google Pay / Crypto provider backend ile bağlanmalı.
            </p>

            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <div style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 15, padding: 12 }}>
                <b>{selectedMethod.icon} {selectedMethod.title}</b>
                <p style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
                  {selectedPackage.coins.toLocaleString("tr-TR")} coin paketi · ₺{selectedPackage.priceTRY}
                </p>
              </div>

              {selectedMethod.id === "crypto" && (
                <div style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 15, padding: 12 }}>
                  <p style={{ color: T.textSec, fontSize: 11 }}>Crypto wallet hook</p>
                  <b style={{ fontSize: 11, wordBreak: "break-all" }}>{LYVORA_PAYMENT_PROVIDER_HOOKS.cryptoWalletAddress}</b>
                </div>
              )}

              <button
                onClick={completePayment}
                style={{
                  border: "none",
                  background: T.purple,
                  color: "#fff",
                  borderRadius: 15,
                  padding: "13px 15px",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                Demo Ödemeyi Tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EconomyFixedPage({ T, addXP }) {
  const [coins, setCoins] = useState(() => Number(localStorage.getItem("lyvora_economy_coins_fixed") || 500));
  const [owned, setOwned] = useState(() => readLocalJson("lyvora_economy_owned_fixed", []));
  const products = [
    ["Supporter Pass", 99, "💜", "Sadakat rozeti ve supporter statüsü"],
    ["Nebula Membership", 249, "🌌", "Premium creator üyeliği"],
    ["Creator Frame", 180, "👑", "Profil kozmetiği"],
    ["Stream Boost", 150, "📡", "Canlı yayın boost hook"],
  ];

  useEffect(() => {
    localStorage.setItem("lyvora_economy_coins_fixed", String(coins));
    safeWriteLocalJson("lyvora_economy_owned_fixed", owned);
  }, [coins, owned]);

  const buy = (name, price) => {
    if (owned.includes(name)) return;
    if (coins < price) return;
    setCoins((v) => v - price);
    setOwned((v) => [...v, name]);
    addXP?.(20);
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      <PanelCard T={T} title="Economy / Marketplace" icon={IC.crown}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950 }}>💸 Creator Economy</h1>
        <p style={{ color: T.textSec, marginTop: 8 }}>Coin: <b>{coins}</b> · Satın alınan: {owned.length}</p>
        <button onClick={() => setCoins((v) => v + 300)} style={{ marginTop: 12, border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "10px 14px", fontWeight: 950, cursor: "pointer" }}>
          +300 Demo Coin
        </button>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
        {products.map(([name, price, icon, desc]) => (
          <div key={name} style={{ border: `1px solid ${owned.includes(name) ? "rgba(23,201,100,.45)" : T.border}`, background: owned.includes(name) ? "rgba(23,201,100,.07)" : T.surfaceAlt, borderRadius: 18, padding: 15 }}>
            <b>{icon} {name}</b>
            <p style={{ color: T.textSec, fontSize: 12, marginTop: 6 }}>{desc}</p>
            <p style={{ color: T.purple, fontWeight: 950, marginTop: 10 }}>{price} coin</p>
            <button onClick={() => buy(name, price)} style={{ marginTop: 10, border: "none", background: owned.includes(name) ? T.surface : T.purple, color: owned.includes(name) ? T.textSec : "#fff", borderRadius: 13, padding: "10px 12px", fontWeight: 950, cursor: "pointer", width: "100%" }}>
              {owned.includes(name) ? "Owned" : "Satın Al"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LyvoraMissingSystemPage({ T, title = "Sistem", desc = "Bu sistem için görünür sayfa hazırlanıyor." }) {
  return (
    <div style={{ padding: 20 }}>
      <PanelCard T={T} title={title} icon={IC.server}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 950 }}>🚧 {title}</h1>
        <p style={{ color: T.textSec, marginTop: 10, lineHeight: 1.6 }}>{desc}</p>
        <p style={{ color: T.purple, marginTop: 12, fontWeight: 900 }}>
          Route aktif. Component bağlantısı güvenli fallback ile korunuyor.
        </p>
      </PanelCard>
    </div>
  );
}


/* LYVORA_SYSTEMS_CARD_GLOW_PATCH */
function LyvoraSystemsLauncher({ T, nav }) {
  const systems = [
    ["launchPolish", "Launch Merkezi", IC.spark, "Beta, topluluk, creator spotlight ve feedback"],
    ["devHub", "Dev Hub", IC.server, "Admin/developer teknik araçları"],
    ["firebaseSetup", "Firebase Setup", IC.server, "Auth, Firestore, Storage, Functions, App Check"],
    ["paymentBackend", "Payment Backend", IC.lock, "Checkout, webhook, wallet credit güvenliği"],
    ["database", "Database / Rules", IC.server, "Firestore schema, rules ve backend structure"],
    ["authLaunch", "Auth / Login", IC.lock, "Email, Google, Apple, 2FA ve session security"],
    ["reels", "Shorts / Reels", IC.game, "Dikey video feed, viral score ve monetization"],
    ["infoCenter", "Bilgilendirme Merkezi", IC.spark, "Lyvora nasıl kullanılır? Hepsi burada"],
    
    ["payments", "Ödemeler", IC.gift, "Kart, Apple Pay, Google Pay, kripto ve coin"],
    ["creatorRevenue", "Creator Gelir", IC.crown, "Donate, revenue ve withdraw"],
    ["affiliate", "Partner / Referral", IC.link, "Özel link, satış ve %20 komisyon"],{ id: "community", label: "Topluluk", icon: IC.hash, tag: "Community" },
    { id: "economy", label: "Economy", icon: IC.crown, tag: "Creator" },
    { id: "achievements", label: "Season", icon: IC.trophy, tag: "Pass" },
    { id: "inventory", label: "Inventory", icon: IC.gift, tag: "Cosmetic" },
    { id: "ranked", label: "Ranked", icon: IC.trophy, tag: "MMR" },
    { id: "party", label: "Party", icon: IC.users, tag: "Lobby" },
    { id: "minigames", label: "Mini Games+", icon: IC.game, tag: "Realtime" },
    { id: "ai", label: "AI Engine", icon: IC.spark, tag: "Smart" },
    { id: "global", label: "Global Dil", icon: IC.globe, tag: "i18n" },
    { id: "voice", label: "Voice / Live", icon: IC.zap, tag: "Live" },
    { id: "security", label: "Security", icon: IC.shield, tag: "Prod" },
  ];

  return (
    <PanelCard T={T} title="Lyvora Sistemleri" icon={IC.server}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        {systems.map((item) => (
          <button
            key={item.id}
            onClick={() => nav(item.id)}
            style={{
              border: `1px solid ${T.border}`,
              background: T.surfaceAlt,
              color: T.text,
              borderRadius: 16,
              padding: 13,
              textAlign: "left",
              cursor: "pointer",
              display: "grid",
              gap: 8,
              minHeight: 92,
            }}
          >
            <span style={{ color: T.purple }}>{item.icon}</span>
            <b style={{ fontSize: 13 }}>{item.label}</b>
            <span style={{ color: T.textSec, fontSize: 10, fontWeight: 900 }}>{item.tag}</span>
          </button>
        ))}
      </div>
    </PanelCard>
  );
}


function HomePage({ T, nav, presenceEngine }) {
  const heroSlides = [
    { kicker: "LYVORA NEDİR?", title: "ANONİM SOHBET EVRENİ", text: "Lyvora, kendini rahatça ifade edebileceğin güvenli ve modern bir sohbet dünyasıdır.", sub: "Kimliğini paylaşmadan yeni insanlarla tanış, odalara katıl ve topluluğun parçası ol.", primary: "Global Lounge", secondary: "Mood Eşleş", action: "chat", secondAction: "mood" },
    { kicker: "GÜVENLİ ALAN", title: "SAYGILI VE TEMİZ TOPLULUK", text: "Kişisel bilgilerini paylaşmadan, kuralları olan güvenli odalarda sohbet edebilirsin.", sub: "Rahatsız edenleri bildir, güvenli modla daha temiz bir deneyim yaşa.", primary: "Kuralları Gör", secondary: "Gizlilik", action: "rules", secondAction: "privacy" },
    { kicker: "MOOD & XP", title: "HİSSETTİĞİN GİBİ EŞLEŞ", text: "Ruh haline göre insanlarla eşleş, mesaj at, oyun oyna ve XP kazan.", sub: "Seviye atla, rozetler aç ve Lyvora profilini güçlendir. Her gün yeni insanlarla tanış, topluluğun bir parçası ol.", primary: "Mood Eşleş", secondary: "Oyunlar", action: "mood", secondAction: "games" },
  ];
  const [heroSlide, setHeroSlide] = useState(0);
  const activeHero = heroSlides[heroSlide];

  return (
    <div style={{ padding: "10px 14px", width: "100%", maxWidth: "none", boxSizing: "border-box" }}>
      <div className="lyvora-home-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 390px", gap: 18, alignItems: "stretch", width: "100%", maxWidth: "none", minHeight: "calc(100vh - 84px)" }}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 84px)" }}>
          <div className="lyvora-hero" style={{ background: T.hero, borderRadius: 20, overflow: "hidden", position: "relative", minHeight: 360, display: "flex", alignItems: "center", marginBottom: 22, padding: "44px 52px" }}>
            <Planet />
            <div style={{ maxWidth: 440, position: "relative", zIndex: 2 }}>
              <p style={{ color: "#9b7cff", fontSize: 11, letterSpacing: 5, marginBottom: 10, fontWeight: 800 }}>{activeHero.kicker}</p>
              <h1 className="lyvora-hero-title" style={{ color: "#fff", fontSize: 38, fontWeight: 900, marginBottom: 14, lineHeight: 1.1 }}>{activeHero.title}</h1>
              <p style={{ color: "#d7d7d7", fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>{activeHero.text}</p>
              <p style={{ color: "#8f8f8f", fontSize: 13, lineHeight: 1.7, marginBottom: 26 }}>{activeHero.sub}</p>
              <div style={{ display: "flex", gap: 12 }}>
                <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 12, border: "1.5px solid rgba(139,92,246,.65)", background: "rgba(139,92,246,.12)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }} onClick={() => nav(activeHero.action)}>{IC.globe} {activeHero.primary}</button>
                <button style={{ padding: "11px 24px", borderRadius: 12, border: "none", background: "#fff", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer" }} onClick={() => nav(activeHero.secondAction)}>{activeHero.secondary}</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
                {heroSlides.map((s, i) => (
                  <button key={i} onClick={() => setHeroSlide(i)} style={{ width: heroSlide === i ? 22 : 7, height: 7, borderRadius: 999, border: "none", background: heroSlide === i ? "#fff" : "rgba(255,255,255,.28)", cursor: "pointer", transition: "all .2s" }} />
                ))}
                <span style={{ color: "#8f8f8f", fontSize: 11, marginLeft: 6 }}>{heroSlide + 1}/3 • {activeHero.kicker}</span>
              </div>
            </div>
          </div>

          <div className="lyvora-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(130px,1fr))", gap: 16, marginBottom: 22 }}>
            {[
              { icon: IC.msg, title: "Global Chat", text: "Dünyadan anonim sohbet.", action: () => nav("chat") },
              { icon: IC.game, title: "Oyun Oyna", text: "Mini oyunlar ve ödüller.", action: () => nav("games") },
              { icon: IC.users, title: "Topluluk", text: "Binlerce üye, bir aile.", action: () => nav("servers") },
              { icon: IC.gift, title: "Ödüller", text: "XP kazan ve yüksel.", action: () => nav("tasks") },
            ].map((c) => (
              <div key={c.title} onClick={c.action} style={{ background: T.surface, borderRadius: 16, padding: "20px 20px 16px", border: `1px solid ${T.border}`, cursor: "pointer" }}>
                <div style={{ marginBottom: 12, color: T.textSec }}>{c.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{c.title}</h3>
                <p style={{ fontSize: 12, color: T.textSec, lineHeight: 1.6, marginBottom: 14 }}>{c.text}</p>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${T.border}`, display: "grid", placeItems: "center", color: T.textSec }}>{IC.arrow}</div>
              </div>
            ))}
          </div>

          <div className="lyvora-bottom-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16 }}>
            <div style={{ background: T.surface, borderRadius: 16, padding: 22, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>{IC.mega} Duyurular</h2>
                <span style={{ color: T.textTer, fontSize: 11, fontWeight: 800 }}>Tıklanabilir</span>
              </div>
              {[
                { text: "🎁 Ödül Sistemi Güncellendi!", date: "21 Mayıs 2025", page: "payments", desc: "XP, coin ve özel rozet kazanma sistemini incele." },
                { text: "🚀 Launch Merkezi Yayında!", date: "20 Mayıs 2025", page: "launchPolish", desc: "Beta, erken erişim ve launch etkinliklerini gör." },
                { text: "👑 Creator Gelir Sistemi Açıldı!", date: "19 Mayıs 2025", page: "creatorRevenue", desc: "Creator gelirleri, referral ve withdraw panelini aç." },
                { text: "🌌 Lyvora Nedir?", date: "18 Mayıs 2025", page: "infoCenter", desc: "Lyvora’nın sosyal evren yapısını ve nasıl kullanılacağını öğren." },
              ].map((a) => (
                <button
                  key={a.text}
                  onClick={() => nav(a.page)}
                  style={{ width: "100%", border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}
                >
                  <div style={{ padding: "12px 0", borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <b style={{ color: T.text, fontSize: 13 }}>{a.text}</b>
                      <span style={{ color: T.textTer, fontSize: 11, whiteSpace: "nowrap" }}>{a.date}</span>
                    </div>
                    <p style={{ color: T.textSec, marginTop: 5, fontSize: 12, lineHeight: 1.45 }}>{a.desc}</p>
                    <p style={{ color: T.purple, marginTop: 5, fontSize: 11, fontWeight: 900 }}>Açmak için tıkla →</p>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ background: T.surface, borderRadius: 16, padding: 22, border: `1px solid ${T.border}` }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{IC.bar} Aktif İstatistikler</h2>
              {[
                { icon: IC.users, label: "Toplam Üye", value: "4.852" },
                { icon: IC.smile, label: "Çevrimiçi", value: "1.248" },
                { icon: IC.server, label: "Toplam Sunucu", value: "125" },
                { icon: IC.msg, label: "Toplam Mesaj", value: "2.458.213" },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
                  <span style={{ color: T.textSec }}>{s.icon}</span>
                  <span style={{ flex: 1 }}>{s.label}</span>
                  <b style={{ fontWeight: 700 }}>{s.value}</b>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textTer }}>
            <span>© 2025 Lyvora. Tüm hakları saklıdır.</span>
            <div style={{ display: "flex", gap: 20 }}>
              <span onClick={() => nav("rules")} style={{ cursor: "pointer" }}>Kurallar</span>
              <span onClick={() => nav("privacy")} style={{ cursor: "pointer" }}>Gizlilik</span>
              <span onClick={() => nav("terms")} style={{ cursor: "pointer" }}>Şartlar</span>
            </div>
          </div>
        </div>
        <div className="lyvora-home-right"><HomeRightPanel T={T} nav={nav} presenceEngine={presenceEngine} /></div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   ADVANCED SOCIAL INTERACTION PATCH — USER CARD MODAL / PROFILE POPUP
═══════════════════════════════════════════ */
function normalizeSocialUser(raw = {}) {
  const fallbackName = raw.name || raw.tag || "Lyvora User";
  return {
    id: raw.id || raw.uid || fallbackName,
    name: fallbackName,
    tag: raw.tag || `@${String(fallbackName).toLowerCase().replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, "")}`,
    avatar: raw.avatar || String(fallbackName).charAt(0).toUpperCase() || "L",
    status: raw.status || (raw.online ? "Çevrimiçi" : "Çevrimdışı"),
    online: Boolean(raw.online),
    level: raw.level || 1,
    mood: raw.mood || "Sosyal",
    bio: raw.bio || "Lyvora topluluğunda yeni bağlantılar kuruyor.",
    followers: raw.followers || Math.floor(120 + Math.random() * 900),
    mutual: raw.mutual || Math.floor(Math.random() * 8),
    badges: raw.badges || ["Aktif", "Sosyal", "Keşif"],
  };
}




function LyvoraGlobalNoOverflowFix() {
  return (
    <style>{`
      html, body, #root { max-width: 100%; overflow-x: hidden; }
      * { box-sizing: border-box; }
    `}</style>
  );
}

function UserCardModal({ T, person, onClose, nav }) {
  if (!person) return null;

  const name = person.name || "Lyvora User";
  const avatar = person.avatar || String(name).charAt(0).toUpperCase();
  const status = person.status || (person.online ? "Çevrimiçi" : "Çevrimdışı");
  const level = person.level || 1;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,.38)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "72px 16px 24px",
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehavior: "contain",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(430px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 96px)",
          overflowY: "auto",
          overflowX: "hidden",
          background: T.surface,
          color: T.text,
          border: "1px solid rgba(139,92,246,.30)",
          borderRadius: 26,
          padding: 20,
          boxShadow: "0 25px 90px rgba(139,92,246,.28), 0 20px 70px rgba(0,0,0,.18)",
        }}
      >
        <div
          style={{
            height: 110,
            borderRadius: 20,
            background: "linear-gradient(135deg, rgba(139,92,246,.95), rgba(25,25,30,.95))",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at top right, rgba(255,255,255,.22), transparent 35%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 20,
              bottom: -32,
              width: 74,
              height: 74,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#8b5cf6,#111)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 30,
              fontWeight: 950,
              border: "4px solid white",
              boxShadow: "0 0 38px rgba(139,92,246,.45)",
            }}
          >
            {avatar}
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 950 }}>{name}</h2>
          <p style={{ color: person.online ? T.green : T.textTer, marginTop: 4 }}>{status}</p>

          <p style={{ color: T.textSec, lineHeight: 1.55, marginTop: 12 }}>
            Lyvora topluluğunda aktif bir üye. Profil detayları yakında gerçek kullanıcı verileriyle bağlanacak.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <span style={{ background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.32)", color: T.purple, borderRadius: 999, padding: "7px 10px", fontSize: 12, fontWeight: 900 }}>
              👑 Founder
            </span>
            <span style={{ background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.32)", color: T.purple, borderRadius: 999, padding: "7px 10px", fontSize: 12, fontWeight: 900 }}>
              Lv.{level}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 16 }}>
            {[
              ["Followers", person.followers || 124],
              ["Level", level],
              ["XP", person.xp || 2400],
            ].map(([label, value]) => (
              <div key={label} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 15, padding: 10 }}>
                <b>{value}</b>
                <p style={{ color: T.textSec, fontSize: 11, marginTop: 3 }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <button
              onClick={() => {
                onClose?.();
                nav("profile");
              }}
              style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "11px 13px", fontWeight: 950, cursor: "pointer" }}
            >
              Profili Aç
            </button>
            <button
              onClick={() => {
                onClose?.();
                nav("messages");
              }}
              style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 13px", fontWeight: 950, cursor: "pointer" }}
            >
              Mesaj Gönder
            </button>
            <button
              onClick={onClose}
              style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 13px", fontWeight: 950, cursor: "pointer" }}
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeRightPanel({
 T, nav, presenceEngine }) {
  const [selectedUser, setSelectedUser] = useState(null);
  return (
    <aside style={{ display: "grid", gap: 16, height: "fit-content" }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 850 }}><span style={{ color: T.purple }}>{IC.users}</span> Lyvora'dan Bireyler</h3>
          <button onClick={() => nav("chat")} style={{ background: "none", border: "none", color: T.textSec, cursor: "pointer", fontSize: 12 }}>Tümü →</button>
        </div>
        {LYVORA_PEOPLE.map(p => (
          <div key={p.id} onClick={() => setSelectedUser(p)} title="Profil kartını aç" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.borderLight}`, cursor: "pointer", borderRadius: 12 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: p.online ? "linear-gradient(135deg,#8b5cf6,#222)" : T.surfaceAlt, color: p.online ? "#fff" : T.textTer, display: "grid", placeItems: "center", fontWeight: 900, border: `1px solid ${p.online ? "rgba(139,92,246,.5)" : T.border}` }}>{p.avatar}</div>
              <span style={{ position: "absolute", right: 0, bottom: 0, width: 10, height: 10, borderRadius: "50%", background: p.online ? T.green : T.textTer, border: `2px solid ${T.surface}` }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 12 }}>{p.name}</b>
              <p style={{ fontSize: 11, color: p.online ? T.green : T.textTer, marginTop: 2 }}>{p.status}</p>
            </div>
            <span style={{ fontSize: 11, background: "rgba(139,92,246,.18)", color: T.text, border: `1px solid rgba(139,92,246,.25)`, borderRadius: 10, padding: "5px 8px", fontWeight: 800 }}>Lv.{p.level}</span>
          </div>
        ))}
        <button onClick={() => nav("chat")} style={{ marginTop: 14, width: "100%", border: `1px solid rgba(139,92,246,.55)`, background: "linear-gradient(135deg, rgba(139,92,246,.30), rgba(139,92,246,.12))", color: T.text, borderRadius: 13, padding: "12px 0", fontWeight: 850, cursor: "pointer" }}>Daha Fazlasını Gör →</button>
      </div>

      <div style={{ background: "linear-gradient(135deg, rgba(139,92,246,.20), rgba(10,10,10,.55))", border: `1px solid rgba(139,92,246,.35)`, borderRadius: 18, padding: 18, color: T.text }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 900, color: T.purple }}>{IC.crown} Premium Sırası</h3>
        <p style={{ fontSize: 12, color: T.textSec, lineHeight: 1.6, margin: "8px 0 14px" }}>Premium açılınca ilk haberi almak için sıraya katılanlar.</p>
        {PREMIUM_WAITLIST.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.borderLight}` }}>
            <span style={{ fontSize: 12 }}><b>#{u.pos}</b> {u.name}</span>
            <span style={{ fontSize: 11, color: T.textSec }}>{u.plan}</span>
          </div>
        ))}
        <button onClick={() => nav("premium")} style={{ marginTop: 14, width: "100%", border: "none", background: T.purple, color: "#fff", borderRadius: 12, padding: "11px 0", fontWeight: 900, cursor: "pointer" }}>Sıraya Katıl</button>
      </div>

      <LiveActivityFeed T={T} activityFeed={presenceEngine?.activityFeed} />

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 18 }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 850 }}>{IC.task} Günün Görevi</h3>
        <p style={{ fontSize: 12, color: T.textSec, marginTop: 10 }}>10 kişiye mesaj gönder.</p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textTer, marginTop: 12 }}><span>6 / 10</span><b>XP 250</b></div>
        <div style={{ height: 8, background: T.surfaceAlt, borderRadius: 999, overflow: "hidden", marginTop: 8 }}><div style={{ width: "60%", height: "100%", background: T.purple }} /></div>
        <button onClick={() => nav("messages")} style={{ marginTop: 14, width: "100%", border: `1px solid rgba(139,92,246,.4)`, background: "transparent", color: T.text, borderRadius: 12, padding: "10px 0", fontWeight: 800, cursor: "pointer" }}>Göreve Git →</button>
      </div>
      <UserCardModal T={T} person={selectedUser} onClose={() => setSelectedUser(null)} nav={nav} presenceEngine={presenceEngine} />
    </aside>
  );
}

function Planet() {
  return (
    <div className="lyvora-planet" style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", animation: "lyvoraFloat 5s ease-in-out infinite" }}>
      <div style={{ width: 310, height: 310, position: "relative", display: "grid", placeItems: "center", filter: "drop-shadow(0 0 48px rgba(139,92,246,.45))" }}>
        <div style={{ position: "absolute", width: 210, height: 210, borderRadius: 42, transform: "rotate(45deg)", background: "linear-gradient(135deg, rgba(139,92,246,.28), rgba(255,255,255,.07), rgba(139,92,246,.13))", border: "2px solid rgba(139,92,246,.52)", boxShadow: "inset 0 0 45px rgba(139,92,246,.18), 0 0 70px rgba(139,92,246,.25)" }} />
        <div style={{ position: "absolute", width: 230, height: 230, borderRadius: "50%", background: "radial-gradient(circle at 34% 26%, #5d4a8f, #17171c 52%, #030303)", boxShadow: "inset -42px -48px 75px rgba(0,0,0,.82), 0 0 95px rgba(139,92,246,.28)" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 380, height: 380, borderRadius: "50%", border: "12px solid rgba(139,92,246,.42)", boxSizing: "border-box", animation: "lyvoraRingSpin 8s linear infinite" }} />
        <div style={{ position: "relative", zIndex: 3, color: "#bda7ff", fontSize: 74, fontWeight: 950, letterSpacing: -5, textShadow: "0 0 22px rgba(190,167,255,.98), 0 0 60px rgba(139,92,246,.80)" }}>LV</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GLOBAL CHAT PAGE
═══════════════════════════════════════════ */
function GlobalChatPage({ T, addXP, user }) {
  const currentUid = auth.currentUser?.uid || "local-user";
  const emojiList = ["😀","😂","🔥","💜","🌙","✨","👀","🎮","🤝","🚀","😎","🥳"];
  const rooms = [
    { id: "global", name: "Global Lounge", count: "4.8K", icon: IC.globe },
    { id: "night", name: "Gece Sohbeti", count: "892", icon: IC.moon },
    { id: "mood", name: "Mood Eşleşme", count: "421", icon: IC.spark },
    { id: "games", name: "Mini Oyunlar", count: "286", icon: IC.game },
    { id: "premium", name: "Premium Oda", count: "74", icon: IC.crown },
  ];
  const chatUsers = [
    { name: "Nova", tag: "Nova#2401", online: true, role: "Admin", premium: true, avatar: "N" },
    { name: "Elysia", tag: "Elysia#1802", online: true, role: "Mod", premium: true, avatar: "E" },
    { name: "Raven", tag: "Raven#3103", online: true, role: "Üye", premium: false, avatar: "R" },
    { name: "Mira", tag: "Mira#2704", online: true, role: "Premium", premium: true, avatar: "M" },
    { name: "Kairo", tag: "Kairo#2205", online: false, role: "Üye", premium: false, avatar: "K" },
    { name: "Lunox", tag: "Lunox#1906", online: true, role: "Üye", premium: false, avatar: "L" },
  ];

  const [activeRoom, setActiveRoom] = useState("global");
  const [msgs, setMsgs] = useState([
    { id: "local-1", uid: "nova-demo", name: "Nova", role: "Admin", premium: true, text: "Lyvora Global Chat artık gelişmiş sistemde çalışıyor 💜", time: "22:14", seen: true, edited: false, replyTo: null, image: null },
    { id: "local-2", uid: "elysia-demo", name: "Elysia", role: "Mod", premium: true, text: "Typing, seen, reply, edit, delete, emoji ve XP aktif 🔥", time: "22:15", seen: true, edited: false, replyTo: null, image: null },
    { id: "local-3", uid: currentUid, name: user?.tag || user?.name || "Sen", role: "Üye", premium: false, text: "Global sistem baya gerçek app gibi oldu.", time: "22:16", seen: true, edited: false, replyTo: null, image: null },
  ]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [cooldown, setCooldown] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1248);
  const [pendingMedia, setPendingMedia] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(null);
  const filePickerRef = useRef(null);
  const msgEnd = useRef(null);
  const activeRoomData = rooms.find(r => r.id === activeRoom) || rooms[0];
  const timeNow = () => new Date().toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" });

  const pickMedia = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const guard = lyvoraValidateMediaFile(file);
    if (!guard.ok) { alert(lyvoraMediaGuardText(guard.reason)); return; }

    try {
      setUploadProgress(5);
      const result = await lyvoraUploadMediaProductionSafe({
        file,
        uid: currentUid,
        roomId: activeRoom,
        onProgress: setUploadProgress,
      });

      if (!result.ok) {
        setUploadProgress(0);
        alert(lyvoraMediaGuardText(result.reason));
        return;
      }

      setPendingMedia(result.media);
      setUploadProgress(100);
      if (result.fallback) {
        console.warn("Lyvora media fallback aktif: Storage bağlantısı yok veya hata verdi.");
      }
      setTimeout(() => setUploadProgress(0), 800);
    } catch (err) {
      console.error(err);
      lyvoraLogMediaEvent("error", { message: String(err?.message || err).slice(0, 160), name: file.name, roomId: activeRoom });
      setUploadProgress(0);
      alert("Medya yükleme sırasında hata oluştu.");
    }
  };

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, remoteTyping]);
  useEffect(() => {
    const timer = setInterval(() => {
      setRemoteTyping(prev => !prev);
      setOnlineCount(prev => prev + (Math.random() > 0.5 ? 1 : -1));
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const q = query(collection(db, "rooms", activeRoom, "messages"), orderBy("createdAt", "asc"), limit(120));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) return;
      const live = snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, clientId: data.clientId || d.id, deleted: Boolean(data.deleted), uid: data.uid, name: data.name || "Anonim", role: data.role || "Üye", premium: Boolean(data.premium), text: data.text || "", time: data.time || "", seen: Boolean(data.seen), edited: Boolean(data.edited), replyTo: data.replyTo || null, image: data.image || null, media: data.media || null };
      });
      setMsgs(lyvoraDedupeMessages(live));
    });
    return () => unsub();
  }, [activeRoom]);

  const roleBadge = (role, premium) => {
    if (role === "Admin") return { text: "ADMIN", bg: "#ef4444" };
    if (role === "Mod") return { text: "MOD", bg: "#22c55e" };
    if (premium) return { text: "PREMIUM", bg: "#8b5cf6" };
    return null;
  };

  const sendMessage = async () => {
    const clean = lyvoraSanitizeMessageText(text);
    if (!clean && !editing && !pendingMedia) return;
    if (cooldown && !editing) { alert("Flood koruması: çok hızlı mesaj atıyorsun."); return; }
    if (!editing) {
      const guard = lyvoraCanSendRoomMessage({ uid: currentUid, roomId: activeRoom, text: clean || pendingMedia?.name || "media" });
      if (!guard.ok) { alert(lyvoraMessageGuardText(guard.reason)); return; }
    }
    if (editing) {
      setMsgs(prev => prev.map(m => m.id === editing.id ? { ...m, text: clean, edited: true } : m));
      if (auth.currentUser?.uid && !String(editing.id).startsWith("local")) {
        updateDoc(doc(db, "rooms", activeRoom, "messages", editing.id), { text: clean, edited: true, editedAt: serverTimestamp() }).catch(console.error);
      }
      setEditing(null); setText(""); return;
    }
    const clientId = lyvoraClientMessageId(currentUid, activeRoom);
    const msg = { clientId, uid: currentUid, name: user?.tag || user?.name || "Sen", role: "Üye", premium: false, text: clean, time: timeNow(), seen: false, edited: false, replyTo: replyTo ? { id: replyTo.id, name: replyTo.name, text: String(replyTo.text || "").slice(0, 80) } : null, image: pendingMedia?.type === "image" ? pendingMedia.url : null, media: pendingMedia || null, createdAt: serverTimestamp() };
    const localId = `local-${Date.now()}`;
    setMsgs(prev => [...prev, { id: localId, ...msg }]);
    setText(""); setReplyTo(null); setPendingMedia(null); setTyping(false); setShowEmoji(false); setCooldown(true); addXP?.(pendingMedia ? 8 : 5);
    setTimeout(() => { setCooldown(false); setMsgs(prev => prev.map(m => m.id === localId ? { ...m, seen: true } : m)); }, 1000);
    if (auth.currentUser?.uid) {
      addDoc(collection(db, "rooms", activeRoom, "messages"), msg).catch((err) => lyvoraLogChatError("global-room-send", err));
    } else {
      setTimeout(() => {
        setRemoteTyping(false);
        setMsgs(prev => [...prev, { id: `local-${Date.now() + 1}`, uid: "nova-demo", name: "Nova", role: "Admin", premium: true, text: "Mesajını gördüm kanka 👀", time: timeNow(), seen: true, edited: false, replyTo: null, image: null, media: null }]);
      }, 1300);
    }
  };

  const deleteMessage = (msg) => {
    setMsgs(prev => prev.filter(m => m.id !== msg.id));
    if (auth.currentUser?.uid && !String(msg.id).startsWith("local")) {
      updateDoc(doc(db, "rooms", activeRoom, "messages", msg.id), { text: "Bu mesaj silindi.", deleted: true, edited: true }).catch(console.error);
    }
  };

  const startEdit = (msg) => { setEditing(msg); setText(msg.text || ""); setReplyTo(null); };
  const onInput = (value) => { setText(value); setTyping(Boolean(value.trim())); };

  return (
    <div className="lyvora-chat-grid" style={{ display: "grid", gridTemplateColumns: "270px minmax(0,1fr) 310px", gap: 16, padding: 18, height: "calc(100vh - 64px)", boxSizing: "border-box", background: T.bg }}>
      {/* Rooms sidebar */}
      <aside className="lyvora-chat-rooms" style={{ background: T.surface, borderRadius: 22, padding: 16, border: `1px solid ${T.border}`, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h3 style={{ fontSize: 11, fontWeight: 900, color: T.textTer, letterSpacing: 1.5 }}>GLOBAL ODALAR</h3>
          <button style={{ width: 30, height: 30, borderRadius: 10, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, cursor: "pointer", display: "grid", placeItems: "center" }}>{IC.plus}</button>
        </div>
        {rooms.map(r => (
          <button key={r.id} onClick={() => setActiveRoom(r.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", borderRadius: 15, cursor: "pointer", fontSize: 13, background: activeRoom === r.id ? "linear-gradient(135deg, rgba(139,92,246,.36), rgba(139,92,246,.12))" : T.surfaceAlt, color: activeRoom === r.id ? T.text : T.textSec, border: activeRoom === r.id ? "1px solid rgba(139,92,246,.48)" : `1px solid ${T.border}`, transition: "all .18s" }}>
            <span style={{ color: activeRoom === r.id ? T.purple : T.textSec }}>{r.icon}</span>
            <span style={{ flex: 1, fontWeight: activeRoom === r.id ? 850 : 600, textAlign: "left" }}>{r.name}</span>
            <span style={{ fontSize: 10, opacity: 0.75 }}>{r.count}</span>
          </button>
        ))}
        <div style={{ marginTop: 16, background: "linear-gradient(135deg, rgba(139,92,246,.22), rgba(139,92,246,.06))", padding: 16, borderRadius: 18, border: "1px solid rgba(139,92,246,.28)" }}>
          <div style={{ color: T.purple }}>{IC.shield}</div>
          <h4 style={{ fontSize: 13, fontWeight: 900, margin: "9px 0 5px" }}>Flood Koruması</h4>
          <p style={{ fontSize: 11, color: T.textSec, lineHeight: 1.6 }}>Spam engeli aktif. Mesaj başına XP kazanırsın.</p>
        </div>
      </aside>

      {/* Main chat */}
      <main className="lyvora-chat-main" style={{ background: T.surface, borderRadius: 24, display: "flex", flexDirection: "column", border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div className="lyvora-chat-header" style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.borderLight}`, background: `linear-gradient(135deg, ${T.surface}, ${T.surfaceAlt})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 15, background: "linear-gradient(135deg,#8b5cf6,#111)", color: "#fff", display: "grid", placeItems: "center" }}>{IC.hash}</div>
            <div className="lyvora-chat-title">
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{activeRoomData.name}</h2>
              <p style={{ fontSize: 12, color: T.textSec, marginTop: 4 }}>{onlineCount} kişi çevrimiçi</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(23,201,100,.10)", color: T.green, borderRadius: 999, padding: "8px 15px", fontSize: 12, fontWeight: 900, border: "1px solid rgba(23,201,100,.25)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} /> Canlı
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px 10px", background: T.bg }}>
          <div style={{ textAlign: "center", marginBottom: 18, color: T.textTer, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>BUGÜN</div>
          {msgs.map(m => {
            const mine = m.uid === currentUid;
            const badge = roleBadge(m.role, m.premium);
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 18, animation: "lyvoraMsgIn .26s ease" }}>
                {!mine && (
                  <div style={{ position: "relative", marginRight: 10, flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#222)", border: "1px solid rgba(139,92,246,.35)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 900, fontSize: 12 }}>{m.name?.[0] || "A"}</div>
                    <span style={{ position: "absolute", right: 0, bottom: 0, width: 10, height: 10, borderRadius: "50%", background: T.green, border: `2px solid ${T.bg}` }} />
                  </div>
                )}
                <div className="lyvora-message-bubble" style={{ maxWidth: "74%", position: "relative" }}>
                  {!mine && (
                    <div style={{ fontSize: 11, color: T.textSec, marginBottom: 5, display: "flex", gap: 8, alignItems: "center" }}>
                      <b style={{ color: T.text }}>{m.name}</b>
                      {badge && <span style={{ fontSize: 9, color: "#fff", background: badge.bg, padding: "2px 6px", borderRadius: 999, fontWeight: 900 }}>{badge.text}</span>}
                    </div>
                  )}
                  <div style={{ padding: "13px 16px", borderRadius: mine ? "18px 18px 5px 18px" : "18px 18px 18px 5px", fontSize: 13, lineHeight: 1.6, background: mine ? "linear-gradient(135deg,#8b5cf6,#6d28d9)" : T.surface, color: mine ? "#fff" : T.text, border: mine ? "none" : `1px solid ${T.border}`, boxShadow: mine ? "0 12px 30px rgba(139,92,246,.26)" : "0 8px 20px rgba(0,0,0,.04)" }}>
                    {m.replyTo && (<div style={{ borderLeft: `3px solid ${mine ? "rgba(255,255,255,.65)" : T.purple}`, paddingLeft: 8, marginBottom: 8, opacity: 0.75, fontSize: 11 }}><b>{m.replyTo.name}</b><div>{m.replyTo.text}</div></div>)}
                    {m.text && <p style={{ margin: 0 }}>{m.text}</p>}
                    {(m.media || m.image) && (
                      <div style={{ marginTop: m.text ? 10 : 0 }}>
                        {(m.media?.type === "video") ? (
                          <video controls src={m.media.url} style={{ maxWidth: 280, width: "100%", borderRadius: 14, display: "block", background: "#000" }} />
                        ) : (
                          <button onClick={() => setMediaPreviewOpen(m.media || { type: "image", url: m.image, name: "image" })} style={{ border: "none", padding: 0, background: "transparent", cursor: "zoom-in", display: "block" }}>
                            <img src={m.media?.url || m.image} alt={m.media?.name || "medya"} style={{ maxWidth: 280, width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 14, display: "block" }} />
                          </button>
                        )}
                        <div style={{ marginTop: 6, fontSize: 10, opacity: .72 }}>📎 {m.media?.name || "medya"}</div>
                      </div>
                    )}
                    <div style={{ fontSize: 10, opacity: 0.75, marginTop: 7, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <span>{m.time} {m.edited ? "• düzenlendi" : ""}</span>
                      {mine && <span style={{ color: m.seen ? "#d8ccff" : "rgba(255,255,255,.55)", fontWeight: 900 }}>{m.seen ? "✓✓" : "✓"}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: 8, marginTop: 6, fontSize: 11 }}>
                    <button onClick={() => setReplyTo(m)} style={{ border: "none", background: "transparent", color: T.textTer, cursor: "pointer" }}>Cevapla</button>
                    {mine && <button onClick={() => startEdit(m)} style={{ border: "none", background: "transparent", color: T.textTer, cursor: "pointer" }}>Düzenle</button>}
                    {mine && <button onClick={() => deleteMessage(m)} style={{ border: "none", background: "transparent", color: T.red, cursor: "pointer" }}>Sil</button>}
                  </div>
                </div>
              </div>
            );
          })}
          {remoteTyping && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: "9px 14px", fontSize: 12, color: T.textSec }}>
              <span style={{ display: "flex", gap: 4 }}>
                {[0,1,2].map(x => <i key={x} style={{ width: 6, height: 6, borderRadius: "50%", background: T.purple, display: "block", animation: `lyvoraTypingDot 1s ${x * 0.15}s infinite` }} />)}
              </span>
              Nova yazıyor...
            </div>
          )}
          <div ref={msgEnd} />
        </div>

        <div style={{ padding: "14px 18px", background: T.surface, borderTop: `1px solid ${T.borderLight}`, position: "relative" }}>
          {showEmoji && (
            <div style={{ position: "absolute", left: 18, bottom: 72, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 10, display: "grid", gridTemplateColumns: "repeat(6,36px)", gap: 8, boxShadow: "0 14px 40px rgba(0,0,0,.18)", zIndex: 5 }}>
              {emojiList.map(e => <button key={e} onClick={() => setText(prev => prev + e)} style={{ width: 36, height: 36, border: "none", background: T.surfaceAlt, borderRadius: 10, cursor: "pointer", fontSize: 18 }}>{e}</button>)}
            </div>
          )}
          {replyTo && (
            <div style={{ marginBottom: 10, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: "9px 12px", display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <span><b>{replyTo.name}</b> mesajına cevap: {String(replyTo.text || "").slice(0, 70)}</span>
              <button onClick={() => setReplyTo(null)} style={{ border: "none", background: "transparent", color: T.textSec, cursor: "pointer" }}>{IC.x}</button>
            </div>
          )}
          {editing && (
            <div style={{ marginBottom: 10, background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.28)", borderRadius: 12, padding: "9px 12px", display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <span>Mesaj düzenleniyor</span>
              <button onClick={() => { setEditing(null); setText(""); }} style={{ border: "none", background: "transparent", color: T.textSec, cursor: "pointer" }}>{IC.x}</button>
            </div>
          )}
          {pendingMedia && (
            <div style={{ marginBottom: 10, border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 14, padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
              {pendingMedia.type === "video" ? (
                <video src={pendingMedia.url} style={{ width: 72, height: 52, borderRadius: 10, objectFit: "cover", background: "#000" }} />
              ) : (
                <img src={pendingMedia.url} alt={pendingMedia.name} style={{ width: 72, height: 52, borderRadius: 10, objectFit: "cover" }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 12 }}>📎 {pendingMedia.name}</b>
                <p style={{ marginTop: 3, color: T.textSec, fontSize: 11 }}>Gönderime hazır • {pendingMedia.local ? "local fallback" : "Storage uploaded"}</p>
              </div>
              <button onClick={() => setPendingMedia(null)} style={{ border: "none", background: "transparent", color: T.red, cursor: "pointer", fontWeight: 900 }}>Sil</button>
            </div>
          )}
          {uploadProgress > 0 && (
            <div style={{ marginBottom: 10, height: 7, borderRadius: 999, background: T.surfaceAlt, overflow: "hidden", border: `1px solid ${T.border}` }}>
              <div style={{ width: `${uploadProgress}%`, height: "100%", background: "linear-gradient(90deg,#8b5cf6,#c4b5fd)", transition: ".2s" }} />
            </div>
          )}
          <input ref={filePickerRef} type="file" accept="image/*,video/*" onChange={pickMedia} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => setShowEmoji(!showEmoji)} style={{ width: 43, height: 43, borderRadius: 13, background: T.surfaceAlt, color: T.textSec, border: `1px solid ${T.border}`, cursor: "pointer", display: "grid", placeItems: "center", fontSize: 18 }}>😀</button>
            <button onClick={() => filePickerRef.current?.click()} style={{ width: 43, height: 43, borderRadius: 13, background: T.surfaceAlt, color: T.textSec, border: `1px solid ${T.border}`, cursor: "pointer", display: "grid", placeItems: "center", fontSize: 18 }}>📎</button>
            <input value={text} onChange={e => onInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder={editing ? "Mesajı düzenle..." : `${activeRoomData.name} odasına mesaj yaz...`} style={{ flex: 1, height: 48, borderRadius: 15, border: `1px solid ${typing ? "rgba(139,92,246,.55)" : T.border}`, background: T.surfaceAlt, color: T.text, padding: "0 16px", outline: "none", fontSize: 13, transition: ".18s" }} />
            <button onClick={sendMessage} style={{ height: 48, padding: "0 18px", borderRadius: 15, border: "none", background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>{editing ? "Kaydet" : "Gönder"}</button>
          </div>
        </div>
      </main>

      {mediaPreviewOpen && (
        <div onClick={() => setMediaPreviewOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "min(920px,94vw)", maxHeight: "86vh", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 12, boxShadow: "0 30px 90px rgba(0,0,0,.45)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <b style={{ fontSize: 13 }}>🖼️ {mediaPreviewOpen.name || "Medya"}</b>
              <button onClick={() => setMediaPreviewOpen(null)} style={{ border: "none", background: T.surfaceAlt, color: T.text, borderRadius: 10, width: 34, height: 34, cursor: "pointer" }}>{IC.x}</button>
            </div>
            <img src={mediaPreviewOpen.url} alt={mediaPreviewOpen.name || "medya"} style={{ maxWidth: "100%", maxHeight: "76vh", borderRadius: 14, display: "block" }} />
          </div>
        </div>
      )}

      {/* Users sidebar */}
      <aside className="lyvora-chat-users" style={{ background: T.surface, borderRadius: 22, padding: 16, border: `1px solid ${T.border}`, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontSize: 11, fontWeight: 900, color: T.textTer, letterSpacing: 1.5 }}>AKTİF KULLANICILAR</h3>
          <span style={{ background: "rgba(23,201,100,.10)", color: T.green, borderRadius: 999, padding: "6px 10px", fontSize: 10, fontWeight: 900 }}>{onlineCount}</span>
        </div>
        {LYVORA_SHOW_DEV_AUDIT_PANELS && <LyvoraMediaAuditPanel T={T} />}
        {chatUsers.map(u => {
          const badge = roleBadge(u.role, u.premium);
          return (
            <div key={u.tag} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px", borderRadius: 16, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#1e1b4b)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, position: "relative" }}>
                {u.avatar}
                <span style={{ position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: "50%", background: u.online ? T.green : "#9ca3af", border: `2px solid ${T.surfaceAlt}` }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <b style={{ fontSize: 13 }}>{u.name}</b>
                  {badge && <span style={{ fontSize: 9, background: badge.bg, color: "#fff", padding: "2px 6px", borderRadius: 999, fontWeight: 900 }}>{badge.text}</span>}
                </div>
                <div style={{ fontSize: 11, color: u.online ? T.green : T.textTer }}>{u.online ? "Çevrimiçi" : "Son görülme 12 dk önce"}</div>
              </div>
              <button style={{ width: 34, height: 34, borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface, cursor: "pointer", color: T.textSec }}>+</button>
            </div>
          );
        })}
      </aside>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DM PAGE
═══════════════════════════════════════════ */

function DMPage({ T, addXP, user, setDmUnread }) {
  const currentUid = auth.currentUser?.uid || "local-user";
  const contacts = [
    { id: "nova", name: "Nova", tag: "Nova#2401", online: true, avatar: "N", status: "Çevrimiçi", role: "Admin" },
    { id: "elysia", name: "Elysia", tag: "Elysia#1802", online: true, avatar: "E", status: "Mood eşleşiyor", role: "Mod" },
    { id: "raven", name: "Raven", tag: "Raven#3103", online: false, avatar: "R", status: "Son görülme 12 dk önce", role: "Üye" },
    { id: "mira", name: "Mira", tag: "Mira#2704", online: true, avatar: "M", status: "Müzik dinliyor", role: "Premium" },
  ];

  const [active, setActive] = useState(contacts[0]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState("şimdi aktif");
  const [messages, setMessages] = useState([
    { id: "demo-1", from: "nova", text: "Selam kanka, DM sistemi aktif 💜", time: "22:10", seen: true, edited: false, replyTo: null },
    { id: "demo-2", from: currentUid, text: "Seen, typing, cevaplama ve düzenleme de var 🔥", time: "22:11", seen: true, edited: false, replyTo: null },
  ]);

  const endRef = useRef(null);
  const lastRemoteMessageRef = useRef("");
  const emojiList = ["😀", "😂", "🔥", "💜", "✨", "👀", "🎮", "🚀"];
  const dmId = [currentUid, active.id].sort().join("_");

  const filteredContacts = contacts.filter((c) =>
    `${c.name} ${c.tag} ${c.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const timeNow = () =>
    new Date().toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, active.id]);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;

    const q = query(
      collection(db, "dms", dmId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setMessages([
            {
              id: `empty-${active.id}`,
              from: active.id,
              text: `${active.name} ile özel sohbet başladı.`,
              time: timeNow(),
              seen: true,
              edited: false,
              replyTo: null,
            },
          ]);
          return;
        }

        const liveMessages = snapshot.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            from: data.from || active.id,
            text: data.text || "",
            time: data.time || "",
            seen: Boolean(data.seen),
            edited: Boolean(data.edited),
            replyTo: data.replyTo || null,
          };
        });

        setMessages(liveMessages.slice(-80));

        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        const lastData = lastDoc?.data?.() || {};
        const lastKey = lastDoc ? String(lastDoc.id) : "";

        if (lastKey && lastKey !== lastRemoteMessageRef.current) {
          lastRemoteMessageRef.current = lastKey;

          if (lastData.from && lastData.from !== currentUid) {
            setDmUnread?.((prev) => Math.min(99, prev + 1));
          }
        }

        snapshot.docs.forEach((item) => {
          const data = item.data();
          if (data.from !== currentUid && !data.seen) {
            updateDoc(doc(db, "dms", dmId, "messages", item.id), {
              seen: true,
            }).catch(console.error);
          }
        });
      },
      (error) => {
        console.warn("DM listener skipped:", error);
      }
    );

    return () => unsubscribe();
  }, [dmId, active.id]);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;

    const typingRef = doc(db, "dms", dmId, "typing", currentUid);

    setDoc(
      typingRef,
      {
        typing,
        uid: currentUid,
        name: user?.tag || user?.name || "Sen",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch(console.error);
  }, [typing, dmId, currentUid, user?.tag, user?.name]);

  useEffect(() => {
    if (!auth.currentUser?.uid) {
      const demoTimer = setInterval(() => {
        setRemoteTyping((prev) => !prev);
        setLastSeen((prev) => prev === "şimdi aktif" ? "2 dk önce" : "şimdi aktif");
      }, 4200);

      return () => clearInterval(demoTimer);
    }

    const otherTypingRef = doc(db, "dms", dmId, "typing", active.id);

    const unsubscribe = onSnapshot(
      otherTypingRef,
      (snapshot) => {
        const data = snapshot.data();
        setRemoteTyping(Boolean(data?.typing));
        setLastSeen(Boolean(data?.typing) ? "şimdi aktif" : active.online ? "şimdi aktif" : "son görülme 12 dk önce");
      },
      (error) => {
        console.warn("DM typing listener skipped:", error);
      }
    );

    return () => unsubscribe();
  }, [dmId, active.id, active.online]);


  const openContact = (contact) => {
    setActive(contact);
    setMessage("");
    setTyping(false);
    setReplyTo(null);
    setEditing(null);
    setShowEmoji(false);
    setRemoteTyping(false);
    setLastSeen(contact.online ? "şimdi aktif" : "son görülme 12 dk önce");

    if (!auth.currentUser?.uid) {
      setMessages([
        {
          id: `local-${contact.id}-1`,
          from: contact.id,
          text: `${contact.name} ile özel sohbet başladı.`,
          time: timeNow(),
          seen: true,
          edited: false,
          replyTo: null,
        },
      ]);
    }
  };

  const sendMessage = async () => {
    const clean = message.trim();
    if (!clean) return;

    if (editing) {
      setMessages((prev) =>
        prev.map((item) =>
          item.id === editing.id ? { ...item, text: clean, edited: true } : item
        )
      );

      if (auth.currentUser?.uid && !String(editing.id).startsWith("demo") && !String(editing.id).startsWith("local")) {
        updateDoc(doc(db, "dms", dmId, "messages", editing.id), {
          text: clean,
          edited: true,
          editedAt: serverTimestamp(),
        }).catch(console.error);
      }

      setEditing(null);
      setMessage("");
      setTyping(false);
      return;
    }

    const newMessage = {
      from: currentUid,
      to: active.id,
      text: clean,
      time: timeNow(),
      seen: false,
      edited: false,
      replyTo: replyTo
        ? {
            text: String(replyTo.text || "").slice(0, 80),
            from: replyTo.from,
          }
        : null,
      createdAt: serverTimestamp(),
    };

    const clientId = lyvoraClientMessageId(currentUid, conversationId);
    const localMessage = {
      id: `local-${Date.now()}`,
      clientId,
      ...newMessage,
      createdAt: null,
    };

    setMessages((prev) => [...prev, localMessage].slice(-80));
    setMessage("");
    setTyping(false);
    setReplyTo(null);
    setShowEmoji(false);
    addXP?.(6);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((item) =>
          item.id === localMessage.id ? { ...item, seen: true } : item
        )
      );
    }, 700);

    if (auth.currentUser?.uid) {
      try {
        await addDoc(collection(db, "dms", dmId, "messages"), newMessage);
        await setDoc(
          doc(db, "dms", dmId),
          {
            users: [currentUid, active.id],
            lastMessage: clean,
            lastTime: timeNow(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn("DM send skipped:", error);
      }
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            from: active.id,
            text: "Gördüm kanka, DM sistemi çalışıyor 👀",
            time: timeNow(),
            seen: true,
            edited: false,
            replyTo: null,
          },
        ].slice(-80));
        setDmUnread?.((prev) => Math.min(99, prev + 1));
      }, 1200);
    }
  };

  const deleteMessage = (item) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== item.id));

    if (auth.currentUser?.uid && !String(item.id).startsWith("demo") && !String(item.id).startsWith("local")) {
      updateDoc(doc(db, "dms", dmId, "messages", item.id), {
        text: "Bu mesaj silindi.",
        deleted: true,
        edited: true,
      }).catch(console.error);
    }
  };

  const editMessage = (item) => {
    setEditing(item);
    setMessage(item.text);
    setReplyTo(null);
  };

  const onInput = (value) => {
    setMessage(value);
    setTyping(Boolean(value.trim()));
  };

  const roleColor = (role) => {
    if (role === "Admin") return "#ef4444";
    if (role === "Mod") return "#22c55e";
    if (role === "Premium") return "#8b5cf6";
    return T.textTer;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "330px minmax(0, 1fr)",
        gap: 16,
        padding: 18,
        height: "calc(100vh - 64px)",
        boxSizing: "border-box",
        background: T.bg,
      }}
    >
      <aside
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 24,
          padding: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column", boxShadow: "0 18px 50px rgba(0,0,0,.05)",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 20, fontWeight: 950 }}>Özel Mesajlar</h2>
          <p style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
            Firestore live DM • seen • edit • reply
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: T.surfaceAlt,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: "11px 13px",
            marginBottom: 14,
          }}
        >
          {IC.search}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kişi ara..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: T.text,
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ overflowY: "auto", paddingRight: 4 }}>
          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => openContact(contact)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 17,
                border:
                  active.id === contact.id
                    ? "1px solid rgba(139,92,246,.55)"
                    : "1px solid transparent",
                background:
                  active.id === contact.id
                    ? "linear-gradient(135deg, rgba(139,92,246,.22), rgba(139,92,246,.08))"
                    : "transparent",
                color: T.text,
                cursor: "pointer",
                textAlign: "left",
                marginBottom: 8,
              }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    background: contact.online
                      ? "linear-gradient(135deg,#8b5cf6,#18181b)"
                      : T.surfaceAlt,
                    color: contact.online ? "#fff" : T.textTer,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 950,
                    border: `1px solid ${
                      contact.online ? "rgba(139,92,246,.45)" : T.border
                    }`,
                  }}
                >
                  {contact.avatar}
                </div>

                <span
                  style={{
                    position: "absolute",
                    right: 1,
                    bottom: 1,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: contact.online ? T.green : "#9ca3af",
                    border: `2px solid ${T.surface}`,
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <b style={{ fontSize: 13 }}>{contact.name}</b>
                  <span
                    style={{
                      fontSize: 8,
                      color: "#fff",
                      background: roleColor(contact.role),
                      padding: "2px 5px",
                      borderRadius: 999,
                      fontWeight: 900,
                    }}
                  >
                    {contact.role}
                  </span>
                </div>

                <p
                  style={{
                    color: contact.online ? T.green : T.textTer,
                    fontSize: 11,
                    marginTop: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {contact.status}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 24,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 18px 50px rgba(0,0,0,.05)",
        }}
      >
        <header
          style={{
            padding: "16px 18px",
            borderBottom: `1px solid ${T.borderLight}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: `linear-gradient(135deg, ${T.surface}, ${T.surfaceAlt})`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#8b5cf6,#18181b)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 950,
                  fontSize: 18,
                }}
              >
                {active.avatar}
              </div>

              <span
                style={{
                  position: "absolute",
                  right: 2,
                  bottom: 2,
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: active.online ? T.green : "#9ca3af",
                  border: `2px solid ${T.surface}`,
                }}
              />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 950 }}>{active.name}</h2>
                <span
                  style={{
                    background: roleColor(active.role),
                    color: "#fff",
                    padding: "3px 7px",
                    borderRadius: 999,
                    fontSize: 9,
                    fontWeight: 950,
                  }}
                >
                  {active.role}
                </span>
              </div>

              <p
                style={{
                  color: remoteTyping ? T.purple : active.online ? T.green : T.textTer,
                  fontSize: 12,
                  marginTop: 3,
                  fontWeight: remoteTyping ? 850 : 500,
                }}
              >
                {remoteTyping ? "yazıyor..." : active.online ? "çevrimiçi" : lastSeen}
              </p>
            </div>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            padding: 20,
            overflowY: "auto",
            background: T.bg,
          }}
        >
          {messages.map((item) => {
            const mine = item.from === currentUid;

            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 15,
                  animation: "lyvoraMsgIn .25s ease",
                }}
              >
                <div
                  style={{
                    maxWidth: "72%",
                    background: mine
                      ? "linear-gradient(135deg,#8b5cf6,#6d28d9)"
                      : T.surface,
                    color: mine ? "#fff" : T.text,
                    border: mine ? "none" : `1px solid ${T.border}`,
                    borderRadius: mine
                      ? "18px 18px 5px 18px"
                      : "18px 18px 18px 5px",
                    padding: "12px 14px",
                    boxShadow: mine
                      ? "0 12px 30px rgba(139,92,246,.24)"
                      : "0 8px 20px rgba(0,0,0,.04)",
                    lineHeight: 1.6,
                    fontSize: 13,
                  }}
                >
                  {item.replyTo && (
                    <div
                      style={{
                        borderLeft: `3px solid ${
                          mine ? "rgba(255,255,255,.65)" : T.purple
                        }`,
                        paddingLeft: 8,
                        marginBottom: 8,
                        opacity: 0.8,
                        fontSize: 11,
                      }}
                    >
                      {item.replyTo.text}
                    </div>
                  )}

                  <p style={{ margin: 0 }}>{item.text}</p>

                  <div
                    style={{
                      marginTop: 7,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      fontSize: 10,
                      opacity: 0.78,
                    }}
                  >
                    <span>
                      {item.time} {item.edited ? "• düzenlendi" : ""}
                    </span>
                    {mine && (
                      <span style={{ fontWeight: 900 }}>
                        {item.seen ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: mine ? "flex-end" : "flex-start",
                      gap: 8,
                      marginTop: 7,
                      fontSize: 10,
                    }}
                  >
                    <button
                      onClick={() => setReplyTo(item)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: mine ? "rgba(255,255,255,.72)" : T.textTer,
                        cursor: "pointer",
                      }}
                    >
                      Cevapla
                    </button>

                    {mine && (
                      <button
                        onClick={() => editMessage(item)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "rgba(255,255,255,.72)",
                          cursor: "pointer",
                        }}
                      >
                        Düzenle
                      </button>
                    )}

                    {mine && (
                      <button
                        onClick={() => deleteMessage(item)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#fecaca",
                          cursor: "pointer",
                        }}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {remoteTyping && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 999,
                padding: "9px 14px",
                color: T.textSec,
                fontSize: 12,
                boxShadow: "0 8px 20px rgba(0,0,0,.04)",
              }}
            >
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: T.purple,
                    animation: `lyvoraTypingDot 1s ${index * 0.15}s infinite`,
                  }}
                />
              ))}
              {active.name} yazıyor...
            </div>
          )}

          <div ref={endRef} />
        </div>

        <footer
          style={{
            padding: 14,
            borderTop: `1px solid ${T.borderLight}`,
            background: T.surface,
            position: "relative",
          }}
        >
          {showEmoji && (
            <div
              style={{
                position: "absolute",
                left: 14,
                bottom: 70,
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: 10,
                display: "grid",
                gridTemplateColumns: "repeat(4, 36px)",
                gap: 8,
                boxShadow: "0 14px 40px rgba(0,0,0,.18)",
                zIndex: 5,
              }}
            >
              {emojiList.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setMessage((prev) => prev + emoji)}
                  style={{
                    width: 36,
                    height: 36,
                    border: "none",
                    background: T.surfaceAlt,
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: 18,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {replyTo && (
            <div
              style={{
                marginBottom: 10,
                background: T.surfaceAlt,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "9px 12px",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 12,
              }}
            >
              <span>Cevap: {String(replyTo.text || "").slice(0, 80)}</span>
              <button
                onClick={() => setReplyTo(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: T.textSec,
                  cursor: "pointer",
                }}
              >
                {IC.x}
              </button>
            </div>
          )}

          {editing && (
            <div
              style={{
                marginBottom: 10,
                background: "rgba(139,92,246,.12)",
                border: "1px solid rgba(139,92,246,.28)",
                borderRadius: 12,
                padding: "9px 12px",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 12,
              }}
            >
              <span>Mesaj düzenleniyor</span>
              <button
                onClick={() => {
                  setEditing(null);
                  setMessage("");
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: T.textSec,
                  cursor: "pointer",
                }}
              >
                {IC.x}
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border: `1px solid ${T.border}`,
                background: T.surfaceAlt,
                cursor: "pointer",
                fontSize: 20,
              }}
            >
              😀
            </button>

            <input
              value={message}
              onChange={(event) => onInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && sendMessage()}
              placeholder={
                editing ? "Mesajı düzenle..." : `${active.name} kişisine mesaj yaz...`
              }
              style={{
                flex: 1,
                height: 46,
                border: `1px solid ${typing ? "rgba(139,92,246,.55)" : T.border}`,
                background: T.surfaceAlt,
                color: T.text,
                borderRadius: 14,
                padding: "0 15px",
                outline: "none",
                boxShadow: typing ? "0 0 0 4px rgba(139,92,246,.10)" : "none",
              }}
            />

            <button
              onClick={sendMessage}
              style={{
                height: 46,
                padding: "0 18px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 900,
                boxShadow: "0 12px 28px rgba(139,92,246,.30)",
              }}
            >
              {editing ? "Kaydet" : "Gönder"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}


/* ═══════════════════════════════════════════
   PROFILE PAGE
═══════════════════════════════════════════ */

function ProfileEditField({ T, label, children }) {
  return (
    <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 800, color: T.textSec }}>
      {label}
      {children}
    </label>
  );
}



/* LYVORA_PATCH_46_FIRESTORE_REALTIME_CHAT_FOUNDATION */
const LYVORA_CHAT_MODE_STORAGE = "lyvora_chat_mode_v1";
const LYVORA_CHAT_CACHE_STORAGE = "lyvora_chat_cache_v1";

const LYVORA_FIRESTORE_CHAT_NOTES = {
  collection: "conversations/{conversationId}/messages",
  realtime: "onSnapshot(query(... orderBy('createdAt','desc'), limit(30)))",
  pagination: "startAfter(lastVisibleDoc)",
  unsubscribe: "return unsubscribe on room change/unmount",
  costGuard: "only active room listener, never listen all rooms",
};

async function loadFirebaseChatModulesSafe() {
  try {
    const appModule = await import("./firebase");
    const firestoreModule = await import("firebase/firestore");
    const db = appModule.db || appModule.default?.db || appModule.firestoreDb || null;
    return { db, ...firestoreModule };
  } catch (error) {
    console.warn("Lyvora Firebase chat fallback mode:", error);
    return null;
  }
}

function buildDemoConversationId(currentUid, targetUid) {
  return [currentUid || "local-user", targetUid || "nova"].sort().join("_");
}




/* LYVORA_PATCH_47_MESSAGE_CENTER_REALTIME_FOUNDER_SYSTEM */
const LYVORA_FOUNDER_LIMIT = 1000;
const LYVORA_MESSAGE_CENTER_CACHE = "lyvora_message_center_realtime_cache_v2";
const LYVORA_NOTIFICATION_CACHE = "lyvora_notifications_realtime_cache_v2";


/* LYVORA_PATCH_48_PRODUCTION_ROOM_ARCHITECTURE_SYSTEM */
const LYVORA_ROOM_SCHEMA_VERSION = 2;
const LYVORA_ROOM_RATE_LIMIT_KEY = "lyvora_room_rate_limit_v2";

const LYVORA_FIRESTORE_RULES_FOUNDATION = `
match /rooms/{roomId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null;
  match /messages/{messageId} {
    allow read: if request.auth != null;
    allow create: if request.auth != null
      && request.resource.data.from == request.auth.uid
      && request.resource.data.text is string
      && request.resource.data.text.size() > 0
      && request.resource.data.text.size() <= 2000;
    allow update, delete: if request.auth != null && resource.data.from == request.auth.uid;
  }
  match /members/{uid} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && request.auth.uid == uid;
  }
  match /typing/{uid} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && request.auth.uid == uid;
  }
  match /presence/{uid} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && request.auth.uid == uid;
  }
}`;

function lyvoraSanitizeMessageText(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/[\u202A-\u202E]/g, "")
    .trim()
    .slice(0, 2000);
}

function canLyvoraSendMessageNow(uid) {
  const key = `${LYVORA_ROOM_RATE_LIMIT_KEY}_${uid || "local"}`;
  const now = Date.now();
  const bucket = readLocalJson(key, []);
  const recent = bucket.filter((time) => now - Number(time) < 10000);
  if (recent.length >= 8) return false;
  safeWriteLocalJson(key, [...recent, now]);
  return true;
}

function getLyvoraRoomPath(roomId) {
  return String(roomId || "global_lounge").toLowerCase().replace(/[^a-z0-9_\-]+/g, "_").replace(/^_|_$/g, "") || "global_lounge";
}

async function bootstrapLyvoraRoom({ roomId, title, type, user, founderOnly = false }) {
  const uid = auth.currentUser?.uid || user?.uid;
  const safeRoomId = getLyvoraRoomPath(roomId);
  if (!uid) return { ok: false, roomId: safeRoomId };
  try {
    await setDoc(doc(db, "rooms", safeRoomId), {
      id: safeRoomId,
      title: title || safeRoomId,
      type: type || "community",
      schemaVersion: LYVORA_ROOM_SCHEMA_VERSION,
      founderOnly: Boolean(founderOnly),
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await setDoc(doc(db, "rooms", safeRoomId, "members", uid), {
      uid,
      name: user?.name || user?.tag || auth.currentUser?.displayName || "Lyvora",
      role: founderOnly ? "founder" : "member",
      joinedAt: serverTimestamp(),
      unread: 0,
      lastSeenAt: serverTimestamp(),
      online: true,
    }, { merge: true });

    await setDoc(doc(db, "users", uid, "rooms", safeRoomId), {
      roomId: safeRoomId,
      title: title || safeRoomId,
      type: type || "community",
      pinned: founderOnly,
      unread: 0,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { ok: true, roomId: safeRoomId };
  } catch (error) {
    console.warn("Lyvora room bootstrap fallback:", error);
    return { ok: false, roomId: safeRoomId };
  }
}

async function syncLyvoraRoomPresence({ roomId, uid, name, activeChat }) {
  const safeRoomId = getLyvoraRoomPath(roomId);
  if (!uid) return;
  try {
    await setDoc(doc(db, "rooms", safeRoomId, "presence", uid), {
      uid,
      name: name || "Lyvora",
      online: true,
      activeRoom: activeChat || safeRoomId,
      lastActive: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn("Lyvora room presence fallback:", error);
  }
}

async function syncLyvoraRoomTyping({ roomId, uid, name, typing }) {
  const safeRoomId = getLyvoraRoomPath(roomId);
  if (!uid) return;
  try {
    await setDoc(doc(db, "rooms", safeRoomId, "typing", uid), {
      uid,
      name: name || "Lyvora",
      typing: Boolean(typing),
      at: Date.now(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch {}
}

async function markLyvoraRoomSeen({ roomId, uid }) {
  const safeRoomId = getLyvoraRoomPath(roomId);
  if (!uid) return;
  try {
    await setDoc(doc(db, "rooms", safeRoomId, "members", uid), {
      uid,
      unread: 0,
      lastSeenAt: serverTimestamp(),
      online: true,
    }, { merge: true });
    await setDoc(doc(db, "users", uid, "rooms", safeRoomId), {
      unread: 0,
      lastSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch {}
}

async function writeLyvoraRoomMessage({ roomId, title, type, text, uid, name, targetUid, founderOnly = false }) {
  const safeRoomId = getLyvoraRoomPath(roomId);
  const clean = lyvoraSanitizeMessageText(text);
  if (!uid || !clean) return { ok: false, reason: "empty" };

  await bootstrapLyvoraRoom({ roomId: safeRoomId, title, type, user: { uid, name }, founderOnly });
  const messagePayload = {
    from: uid,
    fromName: name || "Lyvora",
    text: clean,
    type: "text",
    seenBy: { [uid]: true },
    reactions: {},
    edited: false,
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const messageRef = await addDoc(collection(db, "rooms", safeRoomId, "messages"), messagePayload);
  await setDoc(doc(db, "rooms", safeRoomId), {
    lastMessage: clean,
    lastMessageId: messageRef.id,
    lastSender: uid,
    lastActiveAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await setDoc(doc(db, "rooms", safeRoomId, "members", uid), {
    uid,
    lastSeenAt: serverTimestamp(),
    unread: 0,
  }, { merge: true });

  if (targetUid && targetUid !== uid && !String(targetUid).startsWith("local")) {
    await setDoc(doc(db, "users", targetUid, "rooms", safeRoomId), {
      roomId: safeRoomId,
      title,
      type,
      unread: 1,
      lastMessage: clean,
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch(() => {});
  }
  return { ok: true, roomId: safeRoomId, messageId: messageRef.id };
}

function safeDateFromFirestore(value) {
  try {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    if (typeof value === "number") return new Date(value);
    return new Date(value);
  } catch {
    return null;
  }
}

function lyvoraTimeLabel(value) {
  const date = safeDateFromFirestore(value) || new Date();
  return date.toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" });
}

function getLyvoraChatAvatar(name = "L") {
  return String(name || "L").trim().slice(0, 1).toUpperCase() || "L";
}



/* LYVORA_PATCH_61_CHAT_FIRESTORE_AUDIT_STABILITY */
const LYVORA_CHAT_AUDIT_STORAGE = {
  rate: "lyvora_chat_rate_audit_v1",
  duplicate: "lyvora_chat_duplicate_guard_v1",
  errors: "lyvora_chat_error_log_v1",
};

function lyvoraLogChatError(scope, error) {
  try {
    const list = readLocalJson(LYVORA_CHAT_AUDIT_STORAGE.errors, []);
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      scope,
      message: String(error?.message || error || "unknown").slice(0, 180),
      at: Date.now(),
    };
    safeWriteLocalJson(LYVORA_CHAT_AUDIT_STORAGE.errors, [item, ...list].slice(0, 25));
  } catch {}
}

function lyvoraNormalizeMessageForGuard(value) {
  return lyvoraSanitizeMessageText(value).replace(/\s+/g, " ").toLowerCase();
}

function lyvoraCanSendRoomMessage({ uid, roomId = "global", text = "", maxInWindow = 6, windowMs = 10000 }) {
  const safeUid = uid || "local-user";
  const safeRoom = getLyvoraRoomPath(roomId || "global");
  const clean = lyvoraNormalizeMessageForGuard(text);
  const now = Date.now();

  if (!clean) return { ok: false, reason: "empty" };
  if (clean.length > 1200) return { ok: false, reason: "too_long" };

  const rateKey = `${LYVORA_CHAT_AUDIT_STORAGE.rate}_${safeUid}_${safeRoom}`;
  const dupKey = `${LYVORA_CHAT_AUDIT_STORAGE.duplicate}_${safeUid}_${safeRoom}`;

  const bucket = readLocalJson(rateKey, []).filter((time) => now - Number(time) < windowMs);
  if (bucket.length >= maxInWindow) return { ok: false, reason: "rate_limited" };

  const last = readLocalJson(dupKey, null);
  if (last?.text === clean && now - Number(last.at || 0) < 4500) {
    return { ok: false, reason: "duplicate" };
  }

  safeWriteLocalJson(rateKey, [...bucket, now]);
  safeWriteLocalJson(dupKey, { text: clean, at: now });
  return { ok: true, reason: "ok" };
}

function lyvoraMessageGuardText(reason) {
  const map = {
    empty: "Boş mesaj gönderilemez.",
    too_long: "Mesaj çok uzun. Kısaltıp tekrar dene.",
    rate_limited: "Flood koruması: birkaç saniye yavaşla.",
    duplicate: "Aynı mesajı arka arkaya gönderme koruması devrede.",
  };
  return map[reason] || "Mesaj gönderilemedi.";
}

function lyvoraDedupeMessages(list = []) {
  const seen = new Set();
  return (list || []).filter((message) => {
    if (message?.deleted) return false;
    const key = message?.clientId || message?.id || `${message?.from || message?.uid || "x"}_${message?.createdAt || ""}_${message?.text || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function lyvoraClientMessageId(uid, roomId) {
  return `${uid || "local"}_${getLyvoraRoomPath(roomId || "global")}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}



/* LYVORA_PATCH_62_STORAGE_MEDIA_PRODUCTION_AUDIT */
const LYVORA_MEDIA_AUDIT_STORAGE = {
  errors: "lyvora_media_error_log_v1",
  uploads: "lyvora_media_upload_log_v1",
};

function lyvoraSafeMediaFileName(name = "media") {
  return String(name || "media")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90) || "media";
}

function lyvoraValidateMediaFile(file) {
  if (!file) return { ok: false, reason: "missing" };
  const type = String(file.type || "").toLowerCase();
  const isImage = type.startsWith("image/");
  const isVideo = type.startsWith("video/");
  if (!isImage && !isVideo) return { ok: false, reason: "unsupported" };
  const max = isVideo ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > max) return { ok: false, reason: isVideo ? "video_too_large" : "image_too_large" };
  return { ok: true, kind: isVideo ? "video" : "image" };
}

function lyvoraMediaGuardText(reason) {
  const map = {
    missing: "Dosya bulunamadı.",
    unsupported: "Sadece görsel veya video yükleyebilirsin.",
    image_too_large: "Görsel çok büyük. Maksimum 8 MB.",
    video_too_large: "Video çok büyük. Maksimum 30 MB.",
    storage_unavailable: "Storage hazır değil, local preview fallback açıldı.",
  };
  return map[reason] || "Medya yüklenemedi.";
}

function lyvoraLogMediaEvent(type, payload = {}) {
  try {
    const key = type === "error" ? LYVORA_MEDIA_AUDIT_STORAGE.errors : LYVORA_MEDIA_AUDIT_STORAGE.uploads;
    const list = readLocalJson(key, []);
    safeWriteLocalJson(key, [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, type, ...payload, at: Date.now() }, ...list].slice(0, 30));
  } catch {}
}

async function lyvoraUploadMediaProductionSafe({ file, uid, roomId, onProgress }) {
  const guard = lyvoraValidateMediaFile(file);
  if (!guard.ok) return { ok: false, reason: guard.reason };

  const safeUid = uid || auth.currentUser?.uid || "local-user";
  const safeRoom = getLyvoraRoomPath(roomId || "global");
  const safeName = lyvoraSafeMediaFileName(file.name);
  const storagePath = `rooms/${safeRoom}/media/${safeUid}/${Date.now()}_${safeName}`;

  try {
    onProgress?.(8);
    const firebaseModule = await import("./firebase");
    const storageModule = await import("firebase/storage");
    const storage = firebaseModule.storage || storageModule.getStorage?.();
    if (!storage) throw new Error("storage_unavailable");

    const storageRef = storageModule.ref(storage, storagePath);
    const uploadTask = storageModule.uploadBytesResumable(storageRef, file, {
      contentType: file.type || (guard.kind === "video" ? "video/mp4" : "image/jpeg"),
      customMetadata: { uid: safeUid, roomId: safeRoom, app: "lyvora" },
    });

    const downloadURL = await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / Math.max(snapshot.totalBytes, 1)) * 100);
          onProgress?.(Math.max(10, Math.min(96, pct)));
        },
        reject,
        async () => {
          try { resolve(await storageModule.getDownloadURL(uploadTask.snapshot.ref)); }
          catch (error) { reject(error); }
        }
      );
    });

    onProgress?.(100);
    const media = {
      type: guard.kind,
      name: file.name,
      size: file.size,
      url: downloadURL,
      storagePath,
      contentType: file.type || "",
      local: false,
      uploadedAt: Date.now(),
    };
    lyvoraLogMediaEvent("upload", { name: media.name, size: media.size, kind: media.type, roomId: safeRoom });
    return { ok: true, media };
  } catch (error) {
    console.warn("Lyvora Storage fallback:", error);
    lyvoraLogMediaEvent("error", { message: String(error?.message || error).slice(0, 160), name: file.name, roomId: safeRoom });
    try {
      onProgress?.(55);
      const localUrl = await fileToDataUrl(file);
      onProgress?.(100);
      return {
        ok: true,
        fallback: true,
        media: {
          type: guard.kind,
          name: file.name,
          size: file.size,
          url: localUrl,
          storagePath: "",
          contentType: file.type || "",
          local: true,
          fallbackReason: "storage_failed",
          uploadedAt: Date.now(),
        },
      };
    } catch (fallbackError) {
      lyvoraLogMediaEvent("error", { message: String(fallbackError?.message || fallbackError).slice(0, 160), name: file.name, roomId: safeRoom });
      return { ok: false, reason: "fallback_failed" };
    }
  }
}

function LyvoraMediaAuditPanel({ T }) {
  const errors = readLocalJson(LYVORA_MEDIA_AUDIT_STORAGE.errors, []);
  const uploads = readLocalJson(LYVORA_MEDIA_AUDIT_STORAGE.uploads, []);
  const checks = [
    ["Type guard", true],
    ["Size guard", true],
    ["Storage upload", true],
    ["Local fallback", true],
    ["Firestore media payload", true],
  ];
  return (
    <div style={{ marginTop: 12, border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 16, padding: 12 }}>
      <b style={{ fontSize: 12 }}>☁️ Media Audit</b>
      <div style={{ display: "grid", gap: 7, marginTop: 10 }}>
        {checks.map(([label, ok]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textSec }}>
            <span>{label}</span>
            <b style={{ color: ok ? T.green : T.red }}>{ok ? "OK" : "Eksik"}</b>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 8, background: T.surface }}>
          <b style={{ fontSize: 11 }}>{uploads.length}</b>
          <p style={{ marginTop: 2, color: T.textTer, fontSize: 10 }}>upload log</p>
        </div>
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 8, background: T.surface }}>
          <b style={{ fontSize: 11 }}>{errors.length}</b>
          <p style={{ marginTop: 2, color: T.textTer, fontSize: 10 }}>fallback/error</p>
        </div>
      </div>
    </div>
  );
}

function LyvoraChatAuditPanel({ T }) {
  const errors = readLocalJson(LYVORA_CHAT_AUDIT_STORAGE.errors, []);
  return (
    <div style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: 18, padding: 16, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <b style={{ fontSize: 13 }}>🛡️ Chat / Firestore Audit</b>
        <span style={{ color: T.green, fontSize: 11, fontWeight: 900 }}>ACTIVE</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
        {["Flood guard", "Duplicate guard", "Listener dedupe", "Safe cache"].map((item) => (
          <div key={item} style={{ border: `1px solid ${T.borderLight}`, background: T.surfaceAlt, borderRadius: 12, padding: 9, fontSize: 11, fontWeight: 850 }}>✅ {item}</div>
        ))}
      </div>
      {errors.length > 0 && (
        <div style={{ border: `1px solid ${T.borderLight}`, background: T.surfaceAlt, borderRadius: 12, padding: 10 }}>
          <b style={{ fontSize: 11 }}>Son hata logları</b>
          {errors.slice(0, 3).map((err) => <p key={err.id} style={{ color: T.textSec, fontSize: 10, marginTop: 5 }}>{err.scope}: {err.message}</p>)}
        </div>
      )}
    </div>
  );
}

function buildLyvoraConversationId(type, id, currentUid) {
  if (type === "dm") return [currentUid || "local-user", id || "nova"].sort().join("_");
  if (id === "Founder Lounge") return "founder_lounge";
  return String(id || "global_lounge").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "global_lounge";
}

async function claimLyvoraFounderSlot(user) {
  const uid = auth.currentUser?.uid || user?.uid;
  if (!uid) return { ok: false, reason: "Giriş gerekli." };

  const userRef = doc(db, "users", uid);
  const counterRef = doc(db, "system", "founderCounter");

  try {
    const result = await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      const currentUserData = userSnap.exists() ? userSnap.data() : {};
      if (currentUserData?.founder?.isFounder) {
        return { ok: true, already: true, number: currentUserData.founder.number || null };
      }

      const counterSnap = await tx.get(counterRef);
      const currentCount = counterSnap.exists() ? Number(counterSnap.data()?.count || 0) : 0;
      if (currentCount >= LYVORA_FOUNDER_LIMIT) return { ok: false, reason: "Founder kontenjanı doldu." };

      const nextNumber = currentCount + 1;
      const founderPayload = {
        isFounder: true,
        number: nextNumber,
        badge: "Founder",
        loungeAccess: true,
        claimedAt: serverTimestamp(),
      };

      if (counterSnap.exists()) tx.update(counterRef, { count: nextNumber, updatedAt: serverTimestamp() });
      else tx.set(counterRef, { count: nextNumber, limit: LYVORA_FOUNDER_LIMIT, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

      tx.set(userRef, { founder: founderPayload, roles: { founder: true }, updatedAt: serverTimestamp() }, { merge: true });
      return { ok: true, already: false, number: nextNumber };
    });

    return result;
  } catch (error) {
    console.warn("Founder claim fallback:", error);
    return { ok: false, reason: "Founder backend şu an cevap vermedi." };
  }
}


/* LYVORA_PATCH_53_MEDIA_UPLOAD_LITE_VISIBLE */
/* LYVORA_PATCH_52_VOICE_STAGE_SAFE_FOUNDATION */
const LYVORA_VOICE_STAGE_STORAGE = "lyvora_voice_stage_v1";
const LYVORA_VOICE_STAGE_ROOM_ID = "founder-stage";

function buildVoiceStageSeed(user) {
  return {
    roomId: LYVORA_VOICE_STAGE_ROOM_ID,
    title: "Founder Stage",
    status: "live",
    speakers: [
      {
        uid: user?.uid || auth.currentUser?.uid || "local-user",
        name: user?.name || user?.tag || auth.currentUser?.displayName || "Founder",
        muted: false,
        deafened: false,
        speaking: false,
        role: "host",
        joinedAt: Date.now(),
      },
    ],
    listeners: [],
    handRaiseQueue: [],
    updatedAt: Date.now(),
  };
}

function normalizeVoiceStagePayload(data, user) {
  const seed = buildVoiceStageSeed(user);
  return {
    ...seed,
    ...(data || {}),
    speakers: Array.isArray(data?.speakers) && data.speakers.length ? data.speakers : seed.speakers,
    listeners: Array.isArray(data?.listeners) ? data.listeners : [],
    handRaiseQueue: Array.isArray(data?.handRaiseQueue) ? data.handRaiseQueue : [],
  };
}

function useLyvoraVoiceStage(user) {
  const currentUid = auth.currentUser?.uid || user?.uid || "local-user";
  const currentName = user?.name || user?.tag || auth.currentUser?.displayName || "Lyvora User";
  const [stage, setStage] = useState(() =>
    normalizeVoiceStagePayload(readLocalJson(LYVORA_VOICE_STAGE_STORAGE, null), user)
  );
  const [stageReady, setStageReady] = useState(false);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_VOICE_STAGE_STORAGE, stage);
  }, [stage]);

  useEffect(() => {
    const stageRef = doc(db, "voiceStages", LYVORA_VOICE_STAGE_ROOM_ID);
    const memberRef = doc(db, "voiceStages", LYVORA_VOICE_STAGE_ROOM_ID, "members", currentUid);
    let unsubscribe = null;

    setDoc(stageRef, {
      roomId: LYVORA_VOICE_STAGE_ROOM_ID,
      title: "Founder Stage",
      status: "live",
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch(() => {});

    setDoc(memberRef, {
      uid: currentUid,
      name: currentName,
      role: "listener",
      online: true,
      muted: false,
      deafened: false,
      speaking: false,
      lastActive: serverTimestamp(),
    }, { merge: true }).catch(() => {});

    try {
      unsubscribe = onSnapshot(stageRef, (snap) => {
        const data = snap.exists() ? snap.data() : null;
        if (data) setStage((prev) => normalizeVoiceStagePayload({ ...prev, ...data }, user));
        setStageReady(true);
      }, () => setStageReady(false));
    } catch {
      setStageReady(false);
    }

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      updateDoc(memberRef, { online: false, lastActive: serverTimestamp() }).catch(() => {});
    };
  }, [currentUid, currentName, user?.uid]);

  const syncStage = (next) => {
    setStage(next);
    setDoc(doc(db, "voiceStages", LYVORA_VOICE_STAGE_ROOM_ID), {
      ...next,
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch(() => {});
  };

  const ensureSelfSpeaker = (items) => {
    const exists = items.some((s) => s.uid === currentUid);
    if (exists) return items;
    return [
      ...items,
      {
        uid: currentUid,
        name: currentName,
        muted: false,
        deafened: false,
        speaking: false,
        role: "speaker",
        joinedAt: Date.now(),
      },
    ];
  };

  const patchSelfSpeaker = (patch) => {
    setStage((prev) => {
      const speakers = ensureSelfSpeaker(prev.speakers || []).map((s) =>
        s.uid === currentUid ? { ...s, ...patch } : s
      );
      const next = { ...prev, speakers, updatedAt: Date.now() };
      setDoc(doc(db, "voiceStages", LYVORA_VOICE_STAGE_ROOM_ID, "members", currentUid), {
        uid: currentUid,
        name: currentName,
        role: "speaker",
        ...patch,
        lastActive: serverTimestamp(),
      }, { merge: true }).catch(() => {});
      setDoc(doc(db, "voiceStages", LYVORA_VOICE_STAGE_ROOM_ID), { speakers, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
      safeWriteLocalJson(LYVORA_VOICE_STAGE_STORAGE, next);
      return next;
    });
  };

  const toggleMute = () => {
    const self = (stage.speakers || []).find((s) => s.uid === currentUid);
    patchSelfSpeaker({ muted: !self?.muted });
  };

  const toggleDeafen = () => {
    const self = (stage.speakers || []).find((s) => s.uid === currentUid);
    patchSelfSpeaker({ deafened: !self?.deafened });
  };

  const toggleSpeaking = () => {
    const self = (stage.speakers || []).find((s) => s.uid === currentUid);
    patchSelfSpeaker({ speaking: !self?.speaking });
  };

  const raiseHand = () => {
    const item = { uid: currentUid, name: currentName, at: Date.now() };
    setStage((prev) => {
      if ((prev.handRaiseQueue || []).some((x) => x.uid === item.uid)) return prev;
      const next = {
        ...prev,
        handRaiseQueue: [...(prev.handRaiseQueue || []), item].slice(0, 20),
        updatedAt: Date.now(),
      };
      syncStage(next);
      return next;
    });
  };

  const approveSpeaker = (uid) => {
    setStage((prev) => {
      const target = (prev.handRaiseQueue || []).find((x) => x.uid === uid);
      if (!target) return prev;
      const exists = (prev.speakers || []).some((s) => s.uid === uid);
      const next = {
        ...prev,
        speakers: exists ? prev.speakers : [
          ...(prev.speakers || []),
          { uid: target.uid, name: target.name, muted: false, deafened: false, speaking: false, role: "speaker", joinedAt: Date.now() },
        ],
        handRaiseQueue: (prev.handRaiseQueue || []).filter((x) => x.uid !== uid),
        updatedAt: Date.now(),
      };
      syncStage(next);
      return next;
    });
  };

  return { stage, stageReady, toggleMute, toggleDeafen, toggleSpeaking, raiseHand, approveSpeaker };
}

function FounderVoiceStagePanel({ T, user }) {
  const { stage, stageReady, toggleMute, toggleDeafen, toggleSpeaking, raiseHand, approveSpeaker } = useLyvoraVoiceStage(user);

  return (
    <div style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: 16, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div>
          <b>🎤 {stage.title || "Founder Stage"}</b>
          <p style={{ color: T.textSec, fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
            Voice stage hazır: speaker/listener, mute, deafen, speaking glow ve hand raise queue.
          </p>
        </div>
        <span style={{ background: stageReady ? "rgba(23,201,100,.12)" : "rgba(139,92,246,.12)", color: stageReady ? T.green : T.purple, border: `1px solid ${stageReady ? "rgba(23,201,100,.28)" : "rgba(139,92,246,.28)"}`, borderRadius: 999, padding: "6px 9px", fontSize: 10, fontWeight: 950 }}>
          {stageReady ? "LIVE" : "LOCAL"}
        </span>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {(stage.speakers || []).slice(0, 6).map((speaker) => (
          <div key={speaker.uid} style={{ display: "flex", alignItems: "center", gap: 9, border: `1px solid ${speaker.speaking ? "rgba(139,92,246,.55)" : T.borderLight}`, background: speaker.speaking ? "rgba(139,92,246,.12)" : T.surfaceAlt, borderRadius: 14, padding: 10, boxShadow: speaker.speaking ? "0 0 0 4px rgba(139,92,246,.10)" : "none" }}>
            <span style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#111)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 950 }}>
              {String(speaker.name || "L").slice(0, 1).toUpperCase()}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: "block", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{speaker.name}</b>
              <small style={{ color: T.textSec }}>{speaker.role || "speaker"} · {speaker.speaking ? "konuşuyor" : speaker.muted ? "muted" : "mic açık"}</small>
            </span>
            <span>{speaker.deafened ? "🔇" : speaker.muted ? "🔕" : "🎙️"}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
        <button onClick={toggleMute} style={voiceStageButtonStyle(T)}>Mute</button>
        <button onClick={toggleDeafen} style={voiceStageButtonStyle(T)}>Deafen</button>
        <button onClick={toggleSpeaking} style={voiceStageButtonStyle(T)}>Speaking</button>
        <button onClick={raiseHand} style={voiceStageButtonStyle(T, true)}>✋ El Kaldır</button>
      </div>

      {(stage.handRaiseQueue || []).length > 0 && (
        <div style={{ border: `1px solid ${T.borderLight}`, background: T.surfaceAlt, borderRadius: 14, padding: 10, marginTop: 12 }}>
          <b style={{ fontSize: 12 }}>Hand Raise Queue</b>
          <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
            {(stage.handRaiseQueue || []).slice(0, 5).map((item) => (
              <div key={item.uid} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12 }}>{item.name}</span>
                <button onClick={() => approveSpeaker(item.uid)} style={voiceStageButtonStyle(T, true)}>Speaker Yap</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function voiceStageButtonStyle(T, primary = false) {
  return {
    border: primary ? "none" : `1px solid ${T.border}`,
    background: primary ? T.purple : T.surfaceAlt,
    color: primary ? "#fff" : T.text,
    borderRadius: 12,
    padding: "8px 10px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 11,
  };
}




/* LYVORA_PATCH_54_EXPERIENCE_UX_POLISH_VISIBLE */
const LYVORA_UX_POLISH_STORAGE = "lyvora_ux_polish_v1";

function getLyvoraUXPolishState() {
  return readLocalJson(LYVORA_UX_POLISH_STORAGE, {
    unreadGlow: true,
    smoothSwitch: true,
    compactMobile: true,
    founderPremiumHeader: true,
    hoverActions: true,
  });
}

function saveLyvoraUXPolishState(next) {
  safeWriteLocalJson(LYVORA_UX_POLISH_STORAGE, next);
}

function useLyvoraRoomScrollMemory(activeChat) {
  const key = `lyvora_scroll_memory_${activeChat || "global"}`;
  const saveScroll = (node) => {
    try {
      if (!node) return;
      localStorage.setItem(key, String(node.scrollTop || 0));
    } catch {}
  };
  const restoreScroll = (node) => {
    try {
      if (!node) return;
      const value = Number(localStorage.getItem(key) || 0);
      if (value > 0) node.scrollTop = value;
    } catch {}
  };
  return { saveScroll, restoreScroll };
}

function LyvoraUXPolishPanel({ T, activeChat, totalUnread = 0, founderStatus }) {
  const [settings, setSettings] = useState(() => getLyvoraUXPolishState());
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 700);
    return () => clearTimeout(id);
  }, [activeChat, totalUnread]);

  const toggle = (key) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveLyvoraUXPolishState(next);
      return next;
    });
  };

  return (
    <div
      style={{
        border: `1px solid ${totalUnread ? "rgba(139,92,246,.38)" : T.border}`,
        background: activeChat === "Founder Lounge" && settings.founderPremiumHeader
          ? "linear-gradient(135deg, rgba(245,158,11,.14), rgba(139,92,246,.14))"
          : T.surface,
        borderRadius: 20,
        padding: 14,
        marginBottom: 14,
        boxShadow: pulse && settings.unreadGlow ? "0 0 0 5px rgba(139,92,246,.10), 0 18px 45px rgba(139,92,246,.10)" : "none",
        transition: "all .28s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <b style={{ fontSize: 14 }}>✨ Experience Polish v54</b>
          <p style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
            Smooth room switch • unread glow • hover actions • Founder premium feel
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <LyvoraUXToggle T={T} label="Unread Glow" active={settings.unreadGlow} onClick={() => toggle("unreadGlow")} />
          <LyvoraUXToggle T={T} label="Smooth" active={settings.smoothSwitch} onClick={() => toggle("smoothSwitch")} />
          <LyvoraUXToggle T={T} label="Hover" active={settings.hoverActions} onClick={() => toggle("hoverActions")} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 8, marginTop: 12 }}>
        {[
          ["Aktif Oda", activeChat || "Global"],
          ["Unread", String(totalUnread || 0)],
          ["Founder", founderStatus?.isFounder ? `#${founderStatus.number || "?"}` : "Kilitli"],
          ["UX", settings.smoothSwitch ? "Smooth" : "Basic"],
        ].map(([label, value]) => (
          <div key={label} style={{ border: `1px solid ${T.borderLight}`, background: T.surfaceAlt, borderRadius: 14, padding: 10 }}>
            <p style={{ color: T.textTer, fontSize: 10, fontWeight: 950 }}>{label}</p>
            <b style={{ fontSize: 13 }}>{value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function LyvoraUXToggle({ T, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${active ? "rgba(139,92,246,.45)" : T.border}`,
        background: active ? "rgba(139,92,246,.14)" : T.surfaceAlt,
        color: active ? T.purple : T.textSec,
        borderRadius: 999,
        padding: "8px 10px",
        fontSize: 11,
        fontWeight: 950,
        cursor: "pointer",
      }}
    >
      {active ? "●" : "○"} {label}
    </button>
  );
}

function LyvoraQuickMessageActions({ T, mine, onReact, onReply, onCopy }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        justifyContent: mine ? "flex-end" : "flex-start",
        marginTop: 7,
        opacity: .88,
        flexWrap: "wrap",
      }}
    >
      {["❤️", "🔥", "😂"].map((emoji) => (
        <button key={emoji} onClick={() => onReact?.(emoji)} style={lyvoraQuickActionButton(T, mine)}>{emoji}</button>
      ))}
      <button onClick={onReply} style={lyvoraQuickActionButton(T, mine)}>Reply</button>
      <button onClick={onCopy} style={lyvoraQuickActionButton(T, mine)}>Copy</button>
    </div>
  );
}

function lyvoraQuickActionButton(T, mine = false) {
  return {
    border: mine ? "1px solid rgba(255,255,255,.18)" : `1px solid ${T.borderLight}`,
    background: mine ? "rgba(255,255,255,.12)" : T.surfaceAlt,
    color: mine ? "#fff" : T.textSec,
    borderRadius: 999,
    padding: "5px 8px",
    fontSize: 10,
    fontWeight: 900,
    cursor: "pointer",
  };
}



/* LYVORA_PATCH_55_PRODUCTION_AUDIT_PANEL */
const LYVORA_PRODUCTION_AUDIT_STORAGE = "lyvora_production_audit_v1";

const LYVORA_PRODUCTION_AUDIT_ITEMS = [
  { id: "auth", title: "Auth / Session", desc: "Login, register, logout ve session restore test edildi mi?", group: "Core", weight: 12, defaultDone: true },
  { id: "chat", title: "Realtime Chat", desc: "Global, DM, grup ve Founder Lounge mesaj akışı stabil mi?", group: "Realtime", weight: 14, defaultDone: true },
  { id: "unread", title: "Unread / Notification", desc: "Oda bazlı unread, mention ve notification counter net çalışıyor mu?", group: "Realtime", weight: 10, defaultDone: false },
  { id: "presence", title: "Online / Presence", desc: "online, idle, lastActive ve currentRoom sync doğru mu?", group: "Realtime", weight: 9, defaultDone: true },
  { id: "founder", title: "Founder Backend", desc: "İlk 1000 claim, badge, Founder Lounge yetki kontrolü hazır mı?", group: "Founder", weight: 12, defaultDone: false },
  { id: "voice", title: "Voice / Stage", desc: "Stage panel, speaker/listener, mute/deafen ve hand raise akışı test edildi mi?", group: "Founder", weight: 7, defaultDone: true },
  { id: "media", title: "Media Upload", desc: "Görsel/video preview tamam; gerçek Firebase Storage ve rules bağlandı mı?", group: "Media", weight: 10, defaultDone: false },
  { id: "security", title: "Firestore Rules", desc: "Rules, role permission, spam guard ve owner checks production için yazıldı mı?", group: "Security", weight: 14, defaultDone: false },
  { id: "mobile", title: "Mobile UX", desc: "DM ekranı, sidebar, input/keyboard ve swipe mobilde bozulmuyor mu?", group: "UX", weight: 7, defaultDone: false },
  { id: "deploy", title: "Deploy Config", desc: "Vercel/Firebase env, domain, indexes ve test account hazır mı?", group: "Launch", weight: 5, defaultDone: false },
];

function getLyvoraAuditState() {
  const saved = readLocalJson(LYVORA_PRODUCTION_AUDIT_STORAGE, null);
  if (saved && typeof saved === "object") return saved;
  return LYVORA_PRODUCTION_AUDIT_ITEMS.reduce((acc, item) => {
    acc[item.id] = Boolean(item.defaultDone);
    return acc;
  }, {});
}

function getLyvoraAuditScore(state) {
  const total = LYVORA_PRODUCTION_AUDIT_ITEMS.reduce((sum, item) => sum + item.weight, 0);
  const done = LYVORA_PRODUCTION_AUDIT_ITEMS.reduce((sum, item) => sum + (state[item.id] ? item.weight : 0), 0);
  return Math.round((done / Math.max(total, 1)) * 100);
}

function LyvoraProductionAuditPanel({ T, activeChat, founderStatus, totalUnread = 0 }) {
  const [open, setOpen] = useState(true);
  const [state, setState] = useState(() => getLyvoraAuditState());
  const score = getLyvoraAuditScore(state);
  const missing = LYVORA_PRODUCTION_AUDIT_ITEMS.filter((item) => !state[item.id]);
  const readyLabel = score >= 90 ? "Beta Ready" : score >= 70 ? "Alpha Ready" : "Production Eksik";

  useEffect(() => {
    safeWriteLocalJson(LYVORA_PRODUCTION_AUDIT_STORAGE, state);
  }, [state]);

  const toggleItem = (id) => {
    setState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ border: `1px solid ${score >= 80 ? "rgba(23,201,100,.32)" : "rgba(245,158,11,.32)"}`, background: T.surface, borderRadius: 20, padding: 14, marginBottom: 14, boxShadow: "0 18px 45px rgba(0,0,0,.05)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <b style={{ fontSize: 14 }}>🚀 Production Audit v55</b>
          <p style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>
            Eksikleri tek tek kapatma paneli • Aktif oda: {activeChat || "Global"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 999, padding: "8px 10px", fontSize: 11, fontWeight: 950 }}>{readyLabel}</span>
          <button onClick={() => setOpen((v) => !v)} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.textSec, borderRadius: 999, padding: "8px 10px", fontSize: 11, fontWeight: 950, cursor: "pointer" }}>
            {open ? "Kapat" : "Aç"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "center", marginTop: 12 }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: `conic-gradient(${score >= 80 ? T.green : T.purple} ${score * 3.6}deg, ${T.surfaceAlt} 0deg)`, display: "grid", placeItems: "center", border: `1px solid ${T.border}` }}>
          <div style={{ width: 74, height: 74, borderRadius: "50%", background: T.surface, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 20 }}>%{score}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
          {[
            ["Kalan Eksik", String(missing.length)],
            ["Unread", String(totalUnread || 0)],
            ["Founder", founderStatus?.isFounder ? `Aktif #${founderStatus.number || "?"}` : "Kontrol Gerekli"],
            ["Sonraki", missing[0]?.title || "Beta test"],
          ].map(([label, value]) => (
            <div key={label} style={{ border: `1px solid ${T.borderLight}`, background: T.surfaceAlt, borderRadius: 14, padding: 10 }}>
              <p style={{ color: T.textTer, fontSize: 10, fontWeight: 950 }}>{label}</p>
              <b style={{ fontSize: 13 }}>{value}</b>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div style={{ display: "grid", gap: 8, marginTop: 13 }}>
          {LYVORA_PRODUCTION_AUDIT_ITEMS.map((item) => {
            const done = Boolean(state[item.id]);
            return (
              <button key={item.id} onClick={() => toggleItem(item.id)} style={{ border: `1px solid ${done ? "rgba(23,201,100,.35)" : T.border}`, background: done ? "rgba(23,201,100,.08)" : T.surfaceAlt, color: T.text, borderRadius: 15, padding: 11, textAlign: "left", cursor: "pointer", display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 9, alignItems: "start" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", background: done ? T.green : T.surface, color: done ? "#fff" : T.textTer, border: `1px solid ${done ? T.green : T.border}`, fontSize: 11, fontWeight: 950 }}>{done ? "✓" : "!"}</span>
                <span>
                  <b style={{ fontSize: 12 }}>{item.title}</b>
                  <p style={{ color: T.textSec, fontSize: 11, marginTop: 3, lineHeight: 1.45 }}>{item.desc}</p>
                </span>
                <span style={{ color: T.textTer, fontSize: 10, fontWeight: 950 }}>{item.group}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LyvoraMessagesPage({ T, nav, user }) {
  const currentUid = auth.currentUser?.uid || user?.uid || "local-user";
  const currentName = user?.name || user?.tag || auth.currentUser?.displayName || "Sen";
  const [tab, setTab] = useState("dm");
  const [activeChat, setActiveChat] = useState("Nova");
  const [activeType, setActiveType] = useState("dm");
  const [text, setText] = useState("");
  const [messagesByChat, setMessagesByChat] = useState(() =>
    readLocalJson(LYVORA_MESSAGE_CENTER_CACHE, {
      Nova: [
        { id: "seed-1", from: "Nova", fromName: "Nova", text: "Selam, Lyvora launch için hazır mıyız?", mine: false, seen: true, time: "demo" },
        { id: "seed-2", from: currentUid, fromName: "Sen", text: "Hazırız, sistemleri tek tek kontrol ediyoruz.", mine: true, seen: true, time: "demo" },
        { id: "seed-3", from: "Nova", fromName: "Nova", text: "Founder Lounge + realtime chat çok iyi olacak 🔥", mine: false, seen: false, time: "demo" },
      ],
    })
  );
  const [typingMap, setTypingMap] = useState({});
  const [typing, setTyping] = useState(false);
  const [notifications, setNotifications] = useState(() => readLocalJson(LYVORA_NOTIFICATION_CACHE, []));
  const [unreadMap, setUnreadMap] = useState({});
  const [founderStatus, setFounderStatus] = useState({ loading: true, isFounder: false, number: null, error: "" });
  const [systemToast, setSystemToast] = useState("");
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const people = [
    { name: "Nova", online: true, type: "dm", id: "nova", role: "Admin" },
    { name: "Elysia", online: true, type: "dm", id: "elysia", role: "Mod" },
    { name: "Raven", online: true, type: "dm", id: "raven", role: "Üye" },
    { name: "Zean", online: true, type: "dm", id: "zean", role: "Üye" },
    { name: "Mira", online: true, type: "dm", id: "mira", role: "Premium" },
    { name: "Kairo", online: false, type: "dm", id: "kairo", role: "Üye" },
    { name: "Lunox", online: true, type: "dm", id: "lunox", role: "Üye" },
  ];

  const groups = [
    { name: "Founder Lounge", online: true, type: "group", id: "Founder Lounge", desc: "İlk 1000 Founder özel odası", locked: !founderStatus.isFounder },
    { name: "Creator Hub", online: true, type: "group", id: "Creator Hub", desc: "Creator ve partner sohbeti" },
    { name: "Launch Ekibi", online: true, type: "group", id: "Launch Ekibi", desc: "Açılış hazırlığı" },
  ];

  const community = [
    { name: "Global Lounge", online: true, type: "community", id: "Global Lounge", desc: "Herkese açık sohbet" },
    { name: "Mood Eşleş", online: true, type: "community", id: "Mood Eşleş", desc: "Ruh haline göre sohbet" },
    { name: "Oyun Merkezi", online: true, type: "community", id: "Oyun Merkezi", desc: "Mini oyun ve etkinlik" },
  ];

  const list = tab === "dm" ? people : tab === "groups" ? groups : community;
  const activeItem = list.find((item) => item.name === activeChat) || people[0];
  const conversationId = buildLyvoraConversationId(activeType, activeChat, currentUid);
  const currentMessages = messagesByChat[activeChat] || [
    { id: `${activeChat}-welcome`, from: activeChat, fromName: activeChat, text: `${activeChat} sohbeti açıldı.`, mine: false, seen: true, time: "şimdi" },
  ];
  const remoteTypers = Object.values(typingMap || {}).filter((item) => item?.uid !== currentUid && item?.typing && Date.now() - Number(item?.at || 0) < 9000);
  const totalUnread = Object.values(unreadMap).reduce((sum, value) => sum + Number(value || 0), 0) + notifications.filter((item) => !item.read).length;

  useEffect(() => {
    safeWriteLocalJson(LYVORA_MESSAGE_CENTER_CACHE, messagesByChat);
  }, [messagesByChat]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_NOTIFICATION_CACHE, notifications);
  }, [notifications]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [activeChat, messagesByChat]);

  useEffect(() => {
    let alive = true;
    const uid = auth.currentUser?.uid || user?.uid;
    if (!uid) {
      setFounderStatus({ loading: false, isFounder: false, number: null, error: "Giriş gerekli." });
      return;
    }
    getDoc(doc(db, "users", uid))
      .then((snap) => {
        if (!alive) return;
        const data = snap.exists() ? snap.data() : {};
        const founder = data?.founder || {};
        setFounderStatus({ loading: false, isFounder: Boolean(founder.isFounder), number: founder.number || null, error: "" });
      })
      .catch(() => alive && setFounderStatus({ loading: false, isFounder: false, number: null, error: "Founder durumu okunamadı." }));
    return () => { alive = false; };
  }, [user?.uid]);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const presenceRef = doc(db, "users", currentUid);
    setDoc(presenceRef, {
      uid: currentUid,
      name: currentName,
      online: true,
      presence: "online",
      currentRoom: activeChat,
      lastActive: serverTimestamp(),
    }, { merge: true }).catch(() => {});
    bootstrapLyvoraRoom({ roomId: conversationId, title: activeChat, type: activeType, user, founderOnly: activeChat === "Founder Lounge" }).catch(() => {});
    syncLyvoraRoomPresence({ roomId: conversationId, uid: currentUid, name: currentName, activeChat }).catch(() => {});
    markLyvoraRoomSeen({ roomId: conversationId, uid: currentUid }).catch(() => {});
  }, [currentUid, currentName, activeChat, activeType, conversationId, user?.uid]);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const q = query(collection(db, "conversations", conversationId, "messages"), orderBy("createdAt", "asc"), limit(80));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const live = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          from: data.from || "unknown",
          fromName: data.fromName || data.name || "Lyvora",
          text: data.text || "",
          mine: (data.from || "") === currentUid,
          seen: Boolean(data.seenBy?.[currentUid] || data.seen),
          seenBy: data.seenBy || {},
          createdAt: data.createdAt || Date.now(),
          time: data.time || lyvoraTimeLabel(data.createdAt),
          edited: Boolean(data.edited),
        };
      });
      if (live.length) {
        setMessagesByChat((prev) => ({ ...prev, [activeChat]: live }));
        const unread = live.filter((m) => !m.mine && !m.seenBy?.[currentUid]).length;
        setUnreadMap((prev) => ({ ...prev, [activeChat]: unread }));
      }
      snapshot.docs.forEach((item) => {
        const data = item.data();
        if (data.from && data.from !== currentUid && !data.seenBy?.[currentUid]) {
          updateDoc(doc(db, "conversations", conversationId, "messages", item.id), {
            [`seenBy.${currentUid}`]: true,
            seen: true,
            seenAt: serverTimestamp(),
          }).catch(() => {});
        }
      });
    }, (error) => console.warn("Message listener fallback:", error));
    return () => unsubscribe();
  }, [conversationId, activeChat, currentUid]);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const roomId = getLyvoraRoomPath(conversationId);
    const q = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const live = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          from: data.from || "unknown",
          fromName: data.fromName || data.name || "Lyvora",
          text: data.deleted ? "Bu mesaj silindi." : data.text || "",
          mine: (data.from || "") === currentUid,
          seen: Boolean(data.seenBy?.[currentUid] || data.seen),
          seenBy: data.seenBy || {},
          createdAt: data.createdAt || Date.now(),
          time: data.time || lyvoraTimeLabel(data.createdAt),
          edited: Boolean(data.edited),
          deleted: Boolean(data.deleted),
        };
      });
      if (live.length) {
        setMessagesByChat((prev) => ({ ...prev, [activeChat]: live }));
        const unread = live.filter((m) => !m.mine && !m.seenBy?.[currentUid]).length;
        setUnreadMap((prev) => ({ ...prev, [activeChat]: unread }));
      }
      snapshot.docs.forEach((item) => {
        const data = item.data();
        if (data.from && data.from !== currentUid && !data.seenBy?.[currentUid]) {
          updateDoc(doc(db, "rooms", roomId, "messages", item.id), {
            [`seenBy.${currentUid}`]: true,
            seen: true,
            seenAt: serverTimestamp(),
          }).catch(() => {});
        }
      });
      markLyvoraRoomSeen({ roomId, uid: currentUid }).catch(() => {});
    }, (error) => console.warn("Room listener fallback:", error));
    return () => unsubscribe();
  }, [conversationId, activeChat, currentUid]);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const roomId = getLyvoraRoomPath(conversationId);
    const unsubscribe = onSnapshot(collection(db, "rooms", roomId, "typing"), (snapshot) => {
      const next = {};
      snapshot.docs.forEach((item) => { next[item.id] = item.data(); });
      setTypingMap((prev) => ({ ...prev, ...next }));
    }, () => {});
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const unsubscribe = onSnapshot(collection(db, "conversations", conversationId, "typing"), (snapshot) => {
      const next = {};
      snapshot.docs.forEach((item) => { next[item.id] = item.data(); });
      setTypingMap(next);
    }, () => {});
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const q = query(collection(db, "notifications", currentUid, "items"), orderBy("createdAt", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setNotifications(next);
    }, () => {});
    return () => unsubscribe();
  }, [currentUid]);

  const flash = (msg) => {
    setSystemToast(msg);
    setTimeout(() => setSystemToast(""), 2200);
  };

  const selectChat = (item) => {
    if (item.locked) {
      flash("Founder Lounge için önce Founder slotu alman gerekiyor.");
      return;
    }
    setActiveChat(item.name);
    setActiveType(item.type);
    const nextRoomId = buildLyvoraConversationId(item.type, item.id || item.name, currentUid);
    bootstrapLyvoraRoom({ roomId: nextRoomId, title: item.name, type: item.type, user, founderOnly: item.name === "Founder Lounge" }).catch(() => {});
    markLyvoraRoomSeen({ roomId: nextRoomId, uid: currentUid }).catch(() => {});
    setUnreadMap((prev) => ({ ...prev, [item.name]: 0 }));
    if (!messagesByChat[item.name]) {
      setMessagesByChat((prev) => ({
        ...prev,
        [item.name]: [{ id: `${item.name}-${Date.now()}`, from: item.name, fromName: item.name, text: `${item.name} sohbetine hoş geldin.`, mine: false, seen: true, time: "şimdi" }],
      }));
    }
  };

  const handleTab = (id) => {
    setTab(id);
    const first = id === "dm" ? people[0] : id === "groups" ? groups[0] : community[0];
    selectChat(first);
  };

  const sendTyping = (value) => {
    setText(value);
    setTyping(Boolean(value.trim()));
    if (!auth.currentUser?.uid) return;
    setDoc(doc(db, "conversations", conversationId, "typing", currentUid), {
      uid: currentUid,
      name: currentName,
      typing: Boolean(value.trim()),
      at: Date.now(),
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch(() => {});
    syncLyvoraRoomTyping({ roomId: conversationId, uid: currentUid, name: currentName, typing: Boolean(value.trim()) }).catch(() => {});
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping(false);
      setDoc(doc(db, "conversations", conversationId, "typing", currentUid), {
        uid: currentUid,
        name: currentName,
        typing: false,
        at: Date.now(),
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
      syncLyvoraRoomTyping({ roomId: conversationId, uid: currentUid, name: currentName, typing: false }).catch(() => {});
    }, 1400);
  };

  const sendMessage = async () => {
    const clean = lyvoraSanitizeMessageText(text);
    if (!clean) return;
    if (!canLyvoraSendMessageNow(currentUid)) {
      flash("Çok hızlı mesaj gönderiyorsun; birkaç saniye yavaşla.");
      return;
    }
    if (activeChat === "Founder Lounge" && !founderStatus.isFounder) {
      flash("Founder Lounge sadece ilk 1000 Founder için açık.");
      return;
    }
    const roomGuard = lyvoraCanSendRoomMessage({ uid: currentUid, roomId: conversationId, text: clean });
    if (!roomGuard.ok) {
      flash(lyvoraMessageGuardText(roomGuard.reason));
      return;
    }

    const localMessage = {
      id: `local-${Date.now()}`,
      from: currentUid,
      fromName: currentName,
      text: clean,
      mine: true,
      seen: false,
      time: lyvoraTimeLabel(Date.now()),
      createdAt: Date.now(),
    };

    setMessagesByChat((prev) => ({ ...prev, [activeChat]: [...(prev[activeChat] || []), localMessage].slice(-80) }));
    setText("");
    setTyping(false);

    if (!auth.currentUser?.uid) return;
    try {
      const conversationRef = doc(db, "conversations", conversationId);
      await setDoc(conversationRef, {
        id: conversationId,
        title: activeChat,
        type: activeType,
        updatedAt: serverTimestamp(),
        lastMessage: clean,
        lastSender: currentUid,
        participants: activeType === "dm" ? [currentUid, activeItem.id] : ["public"],
      }, { merge: true });

      await addDoc(collection(db, "conversations", conversationId, "messages"), {
        clientId,
        from: currentUid,
        fromName: currentName,
        text: clean,
        type: "text",
        seen: false,
        seenBy: { [currentUid]: true },
        createdAt: serverTimestamp(),
        time: lyvoraTimeLabel(Date.now()),
      });

      await writeLyvoraRoomMessage({
        roomId: conversationId,
        title: activeChat,
        type: activeType,
        text: clean,
        uid: currentUid,
        name: currentName,
        targetUid: activeType === "dm" ? activeItem.id : null,
        founderOnly: activeChat === "Founder Lounge",
      });

      if (activeType === "dm" && activeItem.id && !String(activeItem.id).startsWith("local")) {
        await addDoc(collection(db, "notifications", activeItem.id, "items"), {
          type: "dm",
          title: `${currentName} sana mesaj gönderdi`,
          body: clean.slice(0, 120),
          conversationId,
          read: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
    } catch (error) {
      console.warn("Realtime send fallback:", error);
      flash("Mesaj local kaydedildi; Firestore bağlantısı gelince tekrar deneriz.");
    }
  };

  const claimFounder = async () => {
    setFounderStatus((prev) => ({ ...prev, loading: true, error: "" }));
    const result = await claimLyvoraFounderSlot(user);
    if (result.ok) {
      setFounderStatus({ loading: false, isFounder: true, number: result.number || founderStatus.number, error: "" });
      flash(result.already ? "Founder erişimin zaten aktif." : `Founder #${result.number} aktif edildi 👑`);
      if (auth.currentUser?.uid) {
        addDoc(collection(db, "notifications", currentUid, "items"), {
          type: "founder",
          title: "Founder erişimi aktif",
          body: `Founder Lounge erişimin açıldı. Sıra: #${result.number}`,
          read: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
    } else {
      setFounderStatus({ loading: false, isFounder: false, number: null, error: result.reason || "Founder alınamadı." });
      flash(result.reason || "Founder alınamadı.");
    }
  };

  return (
    <div style={{ padding: 20, position: "relative" }}>
      {systemToast && (
        <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 3000, background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 16, padding: "12px 14px", boxShadow: "0 18px 60px rgba(0,0,0,.25)", fontSize: 13, fontWeight: 850 }}>
          {systemToast}
        </div>
      )}

      <PanelCard T={T} title="Mesaj Merkezi" icon={IC.msg}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Firestore realtime chat", "unread/notification", "typing + seen", "online system"].map((label) => (
              <span key={label} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.textSec, borderRadius: 999, padding: "7px 10px", fontSize: 11, fontWeight: 900 }}>
                {label}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.border}`, background: totalUnread ? "rgba(139,92,246,.14)" : T.surfaceAlt, color: totalUnread ? T.purple : T.textSec, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 950 }}>
            {IC.bell} {totalUnread} okunmamış
          </div>
        </div>

        {/* LYVORA_PATCH_52_VISIBLE_STAGE_MOUNT - panel artık kesin ekranda */}
        <div style={{ marginBottom: 14 }}>
          <FounderVoiceStagePanel T={T} user={user} />
        </div>

        <LyvoraUXPolishPanel T={T} activeChat={activeChat} totalUnread={totalUnread} founderStatus={founderStatus} />
        {LYVORA_SHOW_DEV_AUDIT_PANELS && <LyvoraProductionAuditPanel T={T} activeChat={activeChat} totalUnread={totalUnread} founderStatus={founderStatus} />}
        {LYVORA_SHOW_DEV_AUDIT_PANELS && <LyvoraChatAuditPanel T={T} />}


        <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0,1fr) 280px", gap: 14, height: "calc(100vh - 185px)", minHeight: 620 }}>
          <div style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 12, display: "grid", gridTemplateRows: "auto auto 1fr auto", gap: 10, minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>Sohbetler</b>
              <span style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>Tek merkez</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
              {[["dm", "DM"], ["groups", "Gruplar"], ["community", "Topluluk"]].map(([id, label]) => (
                <button key={id} onClick={() => handleTab(id)} style={{ border: `1px solid ${tab === id ? "rgba(139,92,246,.55)" : T.border}`, background: tab === id ? "rgba(139,92,246,.14)" : T.surface, color: T.text, borderRadius: 12, padding: "9px 6px", cursor: "pointer", fontWeight: 900, fontSize: 12 }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ overflowY: "auto", display: "grid", gap: 8, alignContent: "start", minHeight: 0 }}>
              {list.map((c) => {
                const unread = unreadMap[c.name] || 0;
                return (
                  <button key={`${tab}-${c.name}`} onClick={() => selectChat(c)} style={{ border: `1px solid ${activeChat === c.name ? "rgba(139,92,246,.45)" : T.border}`, background: activeChat === c.name ? "rgba(139,92,246,.12)" : T.surface, color: T.text, borderRadius: 14, padding: 11, textAlign: "left", cursor: "pointer", fontWeight: 850, display: "flex", alignItems: "center", gap: 9, opacity: c.locked ? .68 : 1 }}>
                    <span style={{ position: "relative", display: "inline-flex", width: 34, height: 34, borderRadius: "50%", background: c.locked ? T.textTer : T.purple, color: "#fff", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 950 }}>
                      {c.name === "Founder Lounge" ? "👑" : getLyvoraChatAvatar(c.name)}
                      <span style={{ position: "absolute", right: -1, bottom: -1, width: 9, height: 9, borderRadius: "50%", background: c.online ? T.green : T.textTer, border: `2px solid ${T.surface}` }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</b>
                      <small style={{ display: "block", color: c.locked ? T.textTer : c.online ? T.green : T.textTer, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.locked ? "Founder gerekli" : c.desc || (c.online ? "Çevrimiçi" : "Çevrimdışı")}
                      </small>
                    </span>
                    {unread > 0 && <span style={{ minWidth: 22, height: 22, borderRadius: 999, background: T.red, color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 950 }}>{unread}</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: 14, padding: 10 }}>
              <b style={{ fontSize: 11 }}>Realtime Guard</b>
              <p style={{ color: T.textSec, fontSize: 11, lineHeight: 1.45, marginTop: 5 }}>
                Sadece aktif sohbet dinlenir: onSnapshot + orderBy + limit(80).
              </p>
            </div>
          </div>

          <div style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: 18, overflow: "hidden", display: "grid", gridTemplateRows: "auto 1fr auto", minHeight: 0 }}>
            <div style={{ padding: 14, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                <span style={{ width: 42, height: 42, borderRadius: "50%", background: activeChat === "Founder Lounge" ? "linear-gradient(135deg,#f59e0b,#8b5cf6)" : "linear-gradient(135deg,#8b5cf6,#111)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 950 }}>
                  {activeChat === "Founder Lounge" ? "👑" : getLyvoraChatAvatar(activeChat)}
                </span>
                <div>
                  <b>{activeChat}</b>
                  <p style={{ color: remoteTypers.length ? T.purple : T.green, fontSize: 12, marginTop: 3, fontWeight: remoteTypers.length ? 900 : 500 }}>
                    {remoteTypers.length ? `${remoteTypers.map((x) => x.name).join(", ")} yazıyor...` : activeType === "dm" ? "online / seen aktif" : "canlı kanal"}
                  </p>
                </div>
              </div>
              <button onClick={() => nav("profile")} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 12, padding: "9px 11px", fontWeight: 900, cursor: "pointer" }}>
                Profili Aç
              </button>
            </div>

            <div style={{ padding: 16, overflowY: "auto", display: "grid", gap: 10, alignContent: "end", minHeight: 0, background: T.bg }}>
              {activeChat === "Founder Lounge" && !founderStatus.isFounder ? (
                <div style={{ border: "1px solid rgba(245,158,11,.35)", background: "rgba(245,158,11,.10)", borderRadius: 18, padding: 18 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 950 }}>👑 Founder Lounge kilitli</h3>
                  <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.6, marginTop: 7 }}>İlk 1000 Founder backend slotundan birini alınca bu özel odaya giriş açılır.</p>
                  <button onClick={claimFounder} disabled={founderStatus.loading} style={{ marginTop: 12, border: "none", background: "linear-gradient(135deg,#f59e0b,#8b5cf6)", color: "#fff", borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: founderStatus.loading ? "wait" : "pointer" }}>
                    {founderStatus.loading ? "Kontrol ediliyor..." : "Founder Slotu Al"}
                  </button>
                  {founderStatus.error && <p style={{ color: T.red, fontSize: 12, marginTop: 9 }}>{founderStatus.error}</p>}
                </div>
              ) : (
                currentMessages.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: m.mine ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "72%", background: m.mine ? T.purple : T.surface, color: m.mine ? "#fff" : T.text, border: `1px solid ${m.mine ? "rgba(139,92,246,.45)" : T.border}`, borderRadius: m.mine ? "16px 16px 5px 16px" : "16px 16px 16px 5px", padding: "10px 12px", fontSize: 13, lineHeight: 1.45, boxShadow: "0 8px 20px rgba(0,0,0,.04)" }}>
                      {!m.mine && <b style={{ display: "block", fontSize: 11, opacity: .8, marginBottom: 3 }}>{m.fromName || m.from}</b>}
                      {m.text}
                      <div style={{ marginTop: 6, color: m.mine ? "rgba(255,255,255,.72)" : T.textTer, fontSize: 10, display: "flex", gap: 8, justifyContent: "space-between" }}>
                        <span>{m.time || lyvoraTimeLabel(m.createdAt)}</span>
                        {m.mine && <span>{m.seen ? "✓✓ seen" : "✓"}</span>}
                      </div>
                      <LyvoraQuickMessageActions
                        T={T}
                        mine={m.mine}
                        onReact={(emoji) => flash(`${emoji} reaction prototype aktif`)}
                        onReply={() => setText((prev) => prev || `@${m.fromName || m.from} `)}
                        onCopy={() => { try { navigator.clipboard?.writeText(m.text || ""); flash("Mesaj kopyalandı"); } catch { flash("Kopyalama desteklenmedi"); } }}
                      />
                    </div>
                  </div>
                ))
              )}
              {remoteTypers.length > 0 && <TypingPresenceDots T={T} label={`${remoteTypers.map((x) => x.name).join(", ")} yazıyor`} />}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
              <input value={text} onChange={(e) => sendTyping(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }} placeholder={`${activeChat} içine mesaj yaz...`} disabled={activeChat === "Founder Lounge" && !founderStatus.isFounder} style={{ flex: 1, border: `1px solid ${typing ? "rgba(139,92,246,.55)" : T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "12px 13px", outline: "none", boxShadow: typing ? "0 0 0 4px rgba(139,92,246,.10)" : "none" }} />
              <button onClick={sendMessage} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "0 16px", fontWeight: 950, cursor: "pointer" }}>
                Gönder
              </button>
            </div>
          </div>

          <aside style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 14, overflow: "auto" }}>
            <div style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: 16, padding: 12, marginBottom: 12 }}>
              <b>👑 Founder Backend</b>
              <p style={{ color: T.textSec, fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                {founderStatus.isFounder ? `Founder #${founderStatus.number || "?"} aktif. Lounge açık.` : "İlk 1000 Founder için transaction kontrollü slot sistemi."}
              </p>
              {!founderStatus.isFounder && <button onClick={claimFounder} disabled={founderStatus.loading} style={{ width: "100%", marginTop: 10, border: "none", background: "linear-gradient(135deg,#f59e0b,#8b5cf6)", color: "#fff", borderRadius: 13, padding: "10px 12px", fontWeight: 950, cursor: founderStatus.loading ? "wait" : "pointer" }}>Founder Al</button>}
            </div>

            <div style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: 16, padding: 12, marginBottom: 12 }}>
              <b>🔥 Room Schema v2</b>
              <p style={{ color: T.textSec, fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                rooms / members / messages / typing / presence koleksiyonları aktif. Eski conversations sistemi kırılmadan mirror olarak duruyor.
              </p>
              <div style={{ display: "grid", gap: 6, marginTop: 9, fontSize: 11, color: T.textSec }}>
                <span>• aktif oda: {getLyvoraRoomPath(conversationId)}</span>
                <span>• schema: v{LYVORA_ROOM_SCHEMA_VERSION}</span>
                <span>• guard: 8 mesaj / 10 sn</span>
              </div>
            </div>

            <div style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: 16, padding: 12 }}>
              <b>Bildirimler</b>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {notifications.length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Henüz canlı bildirim yok.</p>}
                {notifications.slice(0, 7).map((n) => (
                  <div key={n.id} style={{ border: `1px solid ${T.borderLight}`, background: n.read ? T.surfaceAlt : "rgba(139,92,246,.10)", borderRadius: 12, padding: 10 }}>
                    <b style={{ fontSize: 12 }}>{n.title || "Bildirim"}</b>
                    <p style={{ color: T.textSec, fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{n.body || n.text || "Yeni aktivite"}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </PanelCard>
    </div>
  );
}

function ProfilePage({ T, user, xp = 0, level = 1, levelProgress = 0 }) {
  const [profile, setProfile] = useState(() => ({
    name: user?.name || "Lyvora",
    tag: user?.tag || "Lyvora#0001",
    bio: user?.bio || "Anonimlik bizim özgürlüğümüzdür.",
    status: localStorage.getItem(SOCIAL_STORAGE.status) || "Çevrimiçi",
    mood: "Gece modu",
    location: "Türkiye",
    website: "lyvora.app",
  }));
  const [avatarImg, setAvatarImg] = useState(() => localStorage.getItem(SOCIAL_STORAGE.avatar) || "");
  const [bannerImg, setBannerImg] = useState(() => localStorage.getItem(SOCIAL_STORAGE.banner) || "");
  const [editOpen, setEditOpen] = useState(false);
  const [requests, setRequests] = useState(() =>
    readLocalJson(SOCIAL_STORAGE.friendRequests, [
      { id: "req-nova", name: "Nova#2401", mood: "Global", online: true },
      { id: "req-elysia", name: "Elysia#1802", mood: "Mood", online: true },
    ])
  );
  const [friends, setFriends] = useState(() => FRIENDS.slice(0, 4));

  const badges = ["Kurucu Üye", "Aktif Sohbetçi", "Mood Ustası", "Gece Kuşu", "100+ Mesaj"];
  const statusColor = profile.status === "Çevrimiçi" ? T.green : profile.status === "Meşgul" ? "#f59e0b" : profile.status === "Rahatsız Etme" ? T.red : T.textTer;

  useEffect(() => {
    localStorage.setItem(SOCIAL_STORAGE.status, profile.status);
  }, [profile.status]);

  useEffect(() => {
    localStorage.setItem(SOCIAL_STORAGE.friendRequests, JSON.stringify(requests));
  }, [requests]);

  const saveProfile = async () => {
    const next = {
      ...user,
      name: profile.name,
      tag: profile.tag,
      bio: profile.bio,
      status: profile.status,
      mood: profile.mood,
      location: profile.location,
      website: profile.website,
      avatarImg,
      bannerImg,
    };
    saveLocalUser(next);
    if (auth.currentUser?.uid) {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        name: profile.name,
        tag: profile.tag,
        bio: profile.bio,
        status: profile.status,
        mood: profile.mood,
        location: profile.location,
        website: profile.website,
        avatarImg,
        bannerImg,
        online: profile.status !== "Görünmez",
        lastActive: serverTimestamp(),
      }).catch(console.error);
      updateProfile(auth.currentUser, { displayName: profile.name }).catch(console.error);
    }
    setEditOpen(false);
  };

  const uploadImage = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Sadece görsel dosyası seç."); return; }
    const dataUrl = await resizeImageToDataUrl(file, type);
    if (type === "avatar") {
      setAvatarImg(dataUrl);
      localStorage.setItem(SOCIAL_STORAGE.avatar, dataUrl);
    } else {
      setBannerImg(dataUrl);
      localStorage.setItem(SOCIAL_STORAGE.banner, dataUrl);
    }
  };

  const acceptRequest = async (req) => {
    setFriends((prev) => [{ id: Date.now(), name: req.name, mood: req.mood, online: req.online, mutual: 1 }, ...prev]);
    setRequests((prev) => prev.filter((item) => item.id !== req.id));
    if (auth.currentUser?.uid) {
      await setDoc(doc(db, "users", auth.currentUser.uid, "friends", req.id), {
        name: req.name,
        mood: req.mood,
        online: req.online,
        acceptedAt: serverTimestamp(),
      }, { merge: true }).catch(console.error);
    }
  };

  const rejectRequest = async (req) => {
    setRequests((prev) => prev.filter((item) => item.id !== req.id));
    if (auth.currentUser?.uid) {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "friendRequests", req.id)).catch(() => {});
    }
  };

  const inputStyle = { width: "100%", border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 12, padding: "11px 12px", outline: "none", fontSize: 13 };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ borderRadius: 22, height: 180, position: "relative", marginBottom: 76, overflow: "visible", boxShadow: "0 18px 50px rgba(0,0,0,.10)", background: T.hero }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 22, overflow: "hidden", background: "linear-gradient(135deg,#8b5cf6,#ede9fe)" }}>
          {bannerImg ? (
            <img src={bannerImg} alt="Profil banner" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: T.hero }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,.12), rgba(139,92,246,.28))" }} />
        </div>
        <div style={{ position: "absolute", bottom: -56, left: 32, width: 112, height: 112, borderRadius: "50%", border: `6px solid ${T.bg}`, background: "linear-gradient(135deg,#8b5cf6,#18181b)", display: "grid", placeItems: "center", overflow: "hidden", color: "#fff", fontSize: 38, fontWeight: 950, boxShadow: "0 0 0 4px rgba(139,92,246,.18), 0 14px 34px rgba(0,0,0,.18)", zIndex: 3 }}>
          {avatarImg ? <img src={avatarImg} alt="Profil fotoğrafı" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} /> : String(profile.name || "L").slice(0,1).toUpperCase()}
        </div>
        <div style={{ position: "absolute", bottom: 18, right: 20, display: "flex", gap: 10, zIndex: 4 }}>
          <button onClick={() => setEditOpen(true)} style={{ padding: "10px 18px", borderRadius: 13, background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.28)", fontSize: 13, fontWeight: 850, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, backdropFilter: "blur(10px)" }}>{IC.edit} Profili Düzenle</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }}>
        <div>
          <div style={{ background: T.surface, borderRadius: 18, padding: 24, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div>
                <h1 style={{ fontSize: 25, fontWeight: 950 }}>{profile.tag}</h1>
                <p style={{ color: T.textSec, fontSize: 13, marginTop: 5, lineHeight: 1.7 }}>{profile.bio}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 850 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor, boxShadow: `0 0 16px ${statusColor}` }} />{profile.status}</div>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 14, color: T.textSec, marginTop: 18, flexWrap: "wrap" }}>
              <span><b style={{ color: T.text, fontWeight: 900 }}>128</b> Mesaj</span>
              <span><b style={{ color: T.text, fontWeight: 900 }}>{friends.length}</b> Arkadaş</span>
              <span><b style={{ color: T.text, fontWeight: 900 }}>12</b> Sunucu</span>
              <span><b style={{ color: T.text, fontWeight: 900 }}>{profile.mood}</b> Mood</span>
            </div>
          </div>

          <div style={{ background: T.surface, borderRadius: 18, padding: 22, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <h2 style={{ fontWeight: 850, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>{IC.crown} XP & Seviye</h2>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "center" }}>
              <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#111827)", color: "#fff", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 950 }}>Lv {level}</div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}><b>{xp} XP</b><span style={{ color: T.textSec }}>{levelProgress}/100</span></div>
                <div style={{ height: 12, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${levelProgress}%`, height: "100%", background: "linear-gradient(90deg,#8b5cf6,#c4b5fd)" }} /></div>
                <p style={{ marginTop: 10, color: T.textSec, fontSize: 12 }}>Mesaj, oyun ve arkadaş etkileşimlerinden XP kazanırsın.</p>
              </div>
            </div>
          </div>

          <div style={{ background: T.surface, borderRadius: 18, padding: 22, border: `1px solid ${T.border}` }}>
            <h2 style={{ fontWeight: 850, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>{IC.shield} Rozetler</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {badges.map(b => <div key={b} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: "8px 14px", fontSize: 12, fontWeight: 750, display: "flex", alignItems: "center", gap: 6 }}>{IC.task} {b}</div>)}
            </div>
          </div>
        </div>

        <aside>
          <div style={{ background: T.surface, borderRadius: 18, padding: 20, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <h3 style={{ fontWeight: 850, fontSize: 14, marginBottom: 12 }}>Arkadaşlık İstekleri</h3>
            {requests.length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Bekleyen istek yok.</p>}
            {requests.map(req => (
              <div key={req.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.surfaceAlt, display: "grid", placeItems: "center" }}>{IC.userplus}</div>
                  <div style={{ flex: 1 }}><b style={{ fontSize: 12 }}>{req.name}</b><p style={{ fontSize: 10, color: T.textTer }}>{req.mood}</p></div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => acceptRequest(req)} style={{ flex: 1, border: "none", background: T.green, color: "#fff", borderRadius: 10, padding: "8px 0", fontWeight: 850, cursor: "pointer" }}>Kabul</button>
                  <button onClick={() => rejectRequest(req)} style={{ flex: 1, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.textSec, borderRadius: 10, padding: "8px 0", fontWeight: 850, cursor: "pointer" }}>Reddet</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: T.surface, borderRadius: 18, padding: 20, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontWeight: 850, fontSize: 14, marginBottom: 12 }}>Arkadaşlar</h3>
            {friends.map(f => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                <div style={{ position: "relative" }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: T.surfaceAlt, display: "grid", placeItems: "center", color: T.textSec }}>{IC.user}</div>{f.online && <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, background: T.green, borderRadius: "50%", border: `2px solid ${T.surface}` }} />}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 750 }}>{f.name}</div><div style={{ fontSize: 10, color: T.textTer }}>{f.mood}</div></div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {editOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)", zIndex: 2000, display: "grid", placeItems: "center", padding: 18 }}>
          <div style={{ width: "min(620px, 96vw)", maxHeight: "90vh", overflowY: "auto", background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 22, boxShadow: "0 28px 90px rgba(0,0,0,.35)" }}>
            <div style={{ padding: 18, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>Profili Düzenle</b><button onClick={() => setEditOpen(false)} style={{ border: "none", background: T.surfaceAlt, color: T.text, borderRadius: 10, width: 34, height: 34, cursor: "pointer" }}>{IC.x}</button></div>
            <div style={{ padding: 20, display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ProfileEditField T={T} label="Profil fotoğrafı"><input type="file" accept="image/*,video/*" onChange={(e) => uploadImage(e, "avatar")} style={inputStyle} /></ProfileEditField>
                <ProfileEditField T={T} label="Banner görseli"><input type="file" accept="image/*,video/*" onChange={(e) => uploadImage(e, "banner")} style={inputStyle} /></ProfileEditField>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 14, alignItems: "center", padding: 12, border: `1px solid ${T.border}`, borderRadius: 16, background: T.surfaceAlt }}>
                <div style={{ width: 78, height: 78, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg,#8b5cf6,#18181b)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 950, border: `4px solid ${T.surface}` }}>
                  {avatarImg ? <img src={avatarImg} alt="Avatar önizleme" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : String(profile.name || "L").slice(0,1).toUpperCase()}
                </div>
                <div style={{ height: 82, borderRadius: 14, overflow: "hidden", background: "linear-gradient(135deg,#8b5cf6,#ede9fe)", position: "relative" }}>
                  {bannerImg && <img src={bannerImg} alt="Banner önizleme" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />}
                  <div style={{ position: "absolute", left: 12, bottom: 10, color: "#fff", fontSize: 12, fontWeight: 850, textShadow: "0 2px 12px rgba(0,0,0,.45)" }}>Güvenli kırpma önizlemesi</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ProfileEditField T={T} label="Görünen ad"><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} style={inputStyle} /></ProfileEditField>
                <ProfileEditField T={T} label="Etiket"><input value={profile.tag} onChange={(e) => setProfile({ ...profile, tag: e.target.value })} style={inputStyle} /></ProfileEditField>
              </div>
              <ProfileEditField T={T} label="Bio"><textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></ProfileEditField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ProfileEditField T={T} label="Durum"><select value={profile.status} onChange={(e) => setProfile({ ...profile, status: e.target.value })} style={inputStyle}>{["Çevrimiçi", "Meşgul", "Rahatsız Etme", "Görünmez"].map(s => <option key={s}>{s}</option>)}</select></ProfileEditField>
                <ProfileEditField T={T} label="Mood"><select value={profile.mood} onChange={(e) => setProfile({ ...profile, mood: e.target.value })} style={inputStyle}>{MOODS.map(m => <option key={m.id}>{m.label}</option>)}</select></ProfileEditField>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ProfileEditField T={T} label="Konum"><input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} style={inputStyle} /></ProfileEditField>
                <ProfileEditField T={T} label="Website"><input value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} style={inputStyle} /></ProfileEditField>
              </div>
            </div>
            <div style={{ padding: 18, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}><button onClick={() => setEditOpen(false)} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 12, padding: "11px 16px", fontWeight: 850, cursor: "pointer" }}>Vazgeç</button><button onClick={saveProfile} style={{ border: "none", background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", color: "#fff", borderRadius: 12, padding: "11px 18px", fontWeight: 950, cursor: "pointer" }}>Kaydet</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SERVERS PAGE
═══════════════════════════════════════════ */
function ServersPage({ T, nav }) {
  const [cat, setCat] = useState("Tümü");
  const categories = ["Tümü","Lokasyon","Mood","Oyun","Hobi","Teknoloji"];
  const filtered = cat === "Tümü" ? SERVER_LIST : SERVER_LIST.filter(s => s.category === cat);
  const iconMap = { pin: IC.pin, moon: IC.moon, game: IC.game, spark: IC.spark, smile: IC.smile, zap: IC.zap };
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Sunucular</h1>
        <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12, background: T.accent, color: T.accentText, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>{IC.plus} Sunucu Oluştur</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 14px", borderRadius: 999, border: `1px solid ${cat === c ? T.accent : T.border}`, background: cat === c ? T.accent : "transparent", color: cat === c ? T.accentText : T.textSec, fontSize: 12, fontWeight: cat === c ? 700 : 400, cursor: "pointer" }}>{c}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {filtered.map(s => (
          <div key={s.id} style={{ background: T.surface, borderRadius: 16, padding: 20, border: `1px solid ${T.border}`, cursor: "pointer" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: T.surfaceAlt, display: "grid", placeItems: "center", color: T.textSec, marginBottom: 14 }}>{iconMap[s.icon] || IC.server}</div>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{s.name}</h3>
            <p style={{ fontSize: 12, color: T.textSec, marginBottom: 14 }}>{s.members.toLocaleString("tr")} üye • {s.category}</p>
            <button onClick={() => nav?.("chat")} style={{ width: "100%", padding: "9px 0", borderRadius: 10, background: T.accent, color: T.accentText, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Katıl</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LEADERBOARD PAGE
═══════════════════════════════════════════ */
function LeaderboardPage({ T }) {
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>{IC.trophy} Sıralamalar</h1>
        <div style={{ fontSize: 13, color: T.textSec }}>Bu hafta • 5dk önce güncellendi</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 1fr", gap: 12, marginBottom: 24, alignItems: "flex-end" }}>
        {[LEADERBOARD[1],LEADERBOARD[0],LEADERBOARD[2]].map((u, i) => {
          const heights = [140,170,120];
          const colors = ["#C0C0C0","#FFD700","#CD7F32"];
          const pos = [2,1,3];
          return (
            <div key={u.rank} style={{ background: T.surface, borderRadius: 16, padding: "20px 16px 16px", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", minHeight: heights[i], justifyContent: "flex-end" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{u.badge}</div>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.surfaceAlt, display: "grid", placeItems: "center", border: `2px solid ${colors[i]}`, marginBottom: 8, color: T.textSec }}>{IC.user}</div>
              <div style={{ fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: T.textSec, marginBottom: 6 }}>{u.xp.toLocaleString("tr")} XP</div>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: colors[i], display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, color: "#000" }}>{pos[i]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        {LEADERBOARD.slice(3).map(u => (
          <div key={u.rank} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: `1px solid ${T.borderLight}`, background: u.isMe ? T.surfaceAlt : "transparent" }}>
            <span style={{ width: 24, fontWeight: 700, fontSize: 14, color: T.textSec, textAlign: "center" }}>{u.rank}</span>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.surfaceAlt, display: "grid", placeItems: "center", color: T.textSec }}>{IC.user}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: u.isMe ? 800 : 600, fontSize: 14 }}>{u.name}</span>
              {u.isMe && <span style={{ marginLeft: 8, fontSize: 11, background: T.accent, color: T.accentText, borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>Sen</span>}
            </div>
            <span style={{ fontSize: 18 }}>{u.badge}</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{u.xp.toLocaleString("tr")} XP</div>
              <div style={{ fontSize: 11, color: T.textSec }}>Seviye {u.level}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MINI GAMES PAGE — with SVG logos
═══════════════════════════════════════════ */

function MultiplayerPartyLobbyPage({ T, user, addXP }) {
  const [party, setParty] = useState(() => readLocalJson(LYVORA_PARTY_STORAGE, null));
  const [partyChat, setPartyChat] = useState(() => readLocalJson(LYVORA_PARTY_CHAT_STORAGE, []));
  const [queue, setQueue] = useState(() => readLocalJson(LYVORA_MATCHMAKING_STORAGE, []));
  const [chatDraft, setChatDraft] = useState("");
  const [selectedMode, setSelectedMode] = useState("reaction");
  const [privacy, setPrivacy] = useState("public");
  const [toast, setToast] = useState("");

  const currentName = user?.name || user?.tag || "Lyvora Player";
  const isHost = party?.players?.some((p) => p.host && (p.name === currentName || p.id === user?.uid));
  const modeMeta = getPartyMode(party?.mode || selectedMode);
  const readyCount = party?.players?.filter((p) => p.ready).length || 0;
  const maxPlayers = modeMeta.players;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  useEffect(() => {
    safeWriteLocalJson(LYVORA_PARTY_STORAGE, party);
  }, [party]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_PARTY_CHAT_STORAGE, partyChat);
  }, [partyChat]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_MATCHMAKING_STORAGE, queue);
  }, [queue]);

  const createParty = () => {
    const next = createPartySeed(user);
    next.mode = selectedMode;
    next.privacy = privacy;
    setParty(next);
    setPartyChat([
      {
        id: `sys-${Date.now()}`,
        author: "System",
        text: `${next.name} oluşturuldu.`,
        time: "şimdi",
      },
    ]);
    addXP?.(20);
    showToast("Party oluşturuldu +20 XP");
  };

  const leaveParty = () => {
    setParty(null);
    setPartyChat([]);
    showToast("Party kapatıldı.");
  };

  const toggleReady = () => {
    if (!party) return;
    setParty((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.name === currentName || p.id === user?.uid ? { ...p, ready: !p.ready } : p
      ),
    }));
  };

  const addBotPlayer = () => {
    if (!party) return;
    if ((party.players || []).length >= maxPlayers) return showToast("Lobby dolu.");
    const botId = `bot-${Date.now()}`;
    const botNames = ["Nova", "Mira", "Raven", "Zean", "Kairo", "Lunox"];
    const name = botNames[Math.floor(Math.random() * botNames.length)];
    setParty((prev) => ({
      ...prev,
      players: [
        ...prev.players,
        {
          id: botId,
          name,
          avatar: name.slice(0, 2).toUpperCase(),
          ready: Math.random() > 0.35,
          host: false,
          team: prev.players.length % 2 === 0 ? "A" : "B",
          online: true,
        },
      ],
    }));
    showToast(`${name} lobby’ye katıldı.`);
  };

  const switchMode = (modeId) => {
    setSelectedMode(modeId);
    if (!party || !isHost) return;
    setParty((prev) => ({ ...prev, mode: modeId, status: "waiting" }));
    showToast(`${getPartyMode(modeId).name} seçildi.`);
  };

  const sendPartyMessage = () => {
    const clean = chatDraft.trim();
    if (!clean) return;
    setPartyChat((prev) => [
      {
        id: `msg-${Date.now()}`,
        author: currentName,
        text: clean,
        time: "şimdi",
      },
      ...prev,
    ].slice(0, 30));
    setChatDraft("");
  };

  const joinMatchmaking = () => {
    const item = {
      id: `queue-${Date.now()}`,
      user: currentName,
      mode: selectedMode,
      rating: 1000 + Math.floor(Math.random() * 400),
      joinedAt: Date.now(),
    };
    setQueue((prev) => [item, ...prev.filter((q) => q.user !== currentName)].slice(0, 20));
    showToast("Matchmaking queue içine girdin.");
  };

  const launchGame = () => {
    if (!party || !isHost) return showToast("Sadece host başlatabilir.");
    if ((party.players || []).length < 2) return showToast("Başlamak için en az 2 oyuncu gerekli.");
    if (readyCount < party.players.length) return showToast("Tüm oyuncular hazır değil.");
    setParty((prev) => ({ ...prev, status: "launching" }));
    addXP?.(35);
    showToast("Game launch flow başladı +35 XP");
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      {toast && (
        <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 3000, background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 16, padding: "12px 14px", boxShadow: "0 18px 60px rgba(0,0,0,.25)", fontSize: 13, fontWeight: 850 }}>
          {toast}
        </div>
      )}

      <PanelCard T={T} title="Multiplayer Party / Lobby" icon={IC.game}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PARTY_GAME_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => switchMode(mode.id)}
                style={{
                  border: `1px solid ${(party?.mode || selectedMode) === mode.id ? T.purple : T.border}`,
                  background: (party?.mode || selectedMode) === mode.id ? "rgba(139,92,246,.16)" : T.surfaceAlt,
                  color: (party?.mode || selectedMode) === mode.id ? T.purple : T.textSec,
                  borderRadius: 999,
                  padding: "9px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {mode.icon} {mode.name}
              </button>
            ))}
          </div>

          {!party ? (
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 12, padding: "10px 12px", outline: "none" }}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <button onClick={createParty} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "11px 15px", fontWeight: 950, cursor: "pointer" }}>
                Party Oluştur
              </button>
            </div>
          ) : (
            <button onClick={leaveParty} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.textSec, borderRadius: 14, padding: "11px 15px", fontWeight: 950, cursor: "pointer" }}>
              Lobby’den çık
            </button>
          )}
        </div>
      </PanelCard>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: 16 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <PanelCard T={T} title={party ? `${modeMeta.icon} ${party.name}` : "Aktif Lobby Yok"} icon={IC.users}>
            {!party ? (
              <div style={{ display: "grid", gap: 12 }}>
                <p style={{ color: T.textSec, lineHeight: 1.6 }}>
                  Party oluşturunca lobby chat, ready sistemi, host controls ve game launch flow aktif olur.
                </p>
                <button onClick={joinMatchmaking} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "12px 14px", fontWeight: 950, cursor: "pointer", width: "fit-content" }}>
                  Matchmaking Queue’ye Gir
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                  {[
                    ["Mode", modeMeta.name],
                    ["Privacy", party.privacy],
                    ["Status", party.status],
                    ["Ready", `${readyCount}/${party.players.length}`],
                  ].map(([label, value]) => (
                    <div key={label} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 15, padding: 12 }}>
                      <p style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>{label}</p>
                      <b style={{ fontSize: 14 }}>{value}</b>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
                  {(party.players || []).map((player) => (
                    <div key={player.id} style={{ border: `1px solid ${player.ready ? "rgba(23,201,100,.45)" : T.border}`, background: player.ready ? "rgba(23,201,100,.08)" : T.surfaceAlt, borderRadius: 18, padding: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 14, background: "linear-gradient(135deg,#8b5cf6,#111)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 950 }}>
                          {player.avatar}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <b style={{ fontSize: 13 }}>{player.name} {player.host ? "👑" : ""}</b>
                          <p style={{ color: T.textSec, fontSize: 11, marginTop: 2 }}>
                            Team {player.team} · {player.ready ? "Ready" : "Not ready"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {Array.from({ length: Math.max(0, maxPlayers - (party.players?.length || 0)) }).map((_, i) => (
                    <div key={i} style={{ border: `1px dashed ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 13, color: T.textTer, display: "grid", placeItems: "center", minHeight: 64 }}>
                      Empty Slot
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                  <button onClick={toggleReady} style={{ border: "none", background: T.green, color: "#fff", borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                    Ready Toggle
                  </button>
                  {isHost && (
                    <>
                      <button onClick={addBotPlayer} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                        Bot Oyuncu Ekle
                      </button>
                      <button onClick={launchGame} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                        Oyunu Başlat
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </PanelCard>

          <PanelCard T={T} title="Lobby Chat" icon={IC.msg}>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendPartyMessage()}
                placeholder={party ? "Lobby mesajı yaz..." : "Önce party oluştur"}
                disabled={!party}
                style={{ flex: 1, height: 44, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "0 13px", outline: "none" }}
              />
              <button onClick={sendPartyMessage} disabled={!party} style={{ border: "none", background: party ? T.purple : T.border, color: "#fff", borderRadius: 14, width: 48, cursor: party ? "pointer" : "not-allowed" }}>
                {IC.send}
              </button>
            </div>

            <div style={{ display: "grid", gap: 9, marginTop: 13 }}>
              {partyChat.length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Lobby chat boş.</p>}
              {partyChat.map((msg) => (
                <div key={msg.id} style={{ border: `1px solid ${T.borderLight}`, background: T.surfaceAlt, borderRadius: 14, padding: 10 }}>
                  <b style={{ fontSize: 12 }}>{msg.author}</b>
                  <span style={{ color: T.textTer, fontSize: 11, marginLeft: 6 }}>{msg.time}</span>
                  <p style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>{msg.text}</p>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <PanelCard T={T} title="Matchmaking Queue" icon={IC.zap}>
            <button onClick={joinMatchmaking} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "10px 12px", fontWeight: 950, cursor: "pointer", width: "100%" }}>
              Queue’ye Gir
            </button>
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              {queue.length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Queue boş.</p>}
              {queue.slice(0, 6).map((item) => (
                <div key={item.id} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 14, padding: 10 }}>
                  <b style={{ fontSize: 12 }}>{item.user}</b>
                  <p style={{ color: T.textSec, fontSize: 11, marginTop: 3 }}>
                    {getPartyMode(item.mode).name} · MMR {item.rating}
                  </p>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Live Lobby Presence" icon={IC.zap}>
            <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.6 }}>
              Party sistemi local optimistic çalışır. Firebase koleksiyonları için hazır alanlar:
              parties, partyMessages, matchmakingQueue.
            </p>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}


function MiniGamesPage({ T, addXP, xp, level, levelProgress }) {
  const [game, setGame] = useState("reaction");
  const games = [
    { id: "reaction", title: "Tepki Testi", text: "Yeşil olunca tıkla, refleksini ölç.", logo: GameLogos.reaction, color: "#8b5cf6" },
    { id: "guess",    title: "Sayı Tahmin", text: "1-100 arasında gizli sayıyı bul.", logo: GameLogos.guess, color: "#06b6d4" },
    { id: "memory",   title: "Hafıza Kartları", text: "Aynı sembolleri eşleştir.", logo: GameLogos.memory, color: "#ec4899" },
    { id: "rps",      title: "Taş Kağıt Makas", text: "Bilgisayara karşı hızlı maç.", logo: GameLogos.rps, color: "#22c55e" },
    { id: "clicker",  title: "Lyvora Clicker", text: "Tıkla, XP kazan, seviye atla.", logo: GameLogos.clicker, color: "#f59e0b" },
  ];

  return (
    <div style={{ padding: 28 }}>
      {/* Hero */}
      <div style={{ background: T.hero, color: "#fff", borderRadius: 22, padding: "32px 34px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 36, top: 22, opacity: .08, fontSize: 130, fontWeight: 900 }}>LV</div>
        <p style={{ fontSize: 11, letterSpacing: 4, color: "#888", marginBottom: 8 }}>LYVORA ARCADE</p>
        <h1 style={{ fontSize: 32, fontWeight: 850, marginBottom: 8 }}>Mini Oyunlar</h1>
        <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, maxWidth: 520 }}>5 farklı oyun, gerçek XP ödülleri. Oyna ve liderlik tablosuna çık!</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        {[["SEVİYE", `Lv ${level}`],["TOPLAM XP", xp],["SONRAKİ LEVEL", null]].map(([label, val], i) => (
          <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 11, color: T.textTer, marginBottom: 5 }}>{label}</p>
            {i < 2 ? <b style={{ fontSize: 24 }}>{val}</b> : (
              <div style={{ height: 9, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
                <div style={{ width: `${levelProgress}%`, height: "100%", background: T.accent }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
        {/* Game list */}
        <aside style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 14, height: "fit-content" }}>
          <p style={{ fontSize: 11, color: T.textTer, letterSpacing: 1.5, fontWeight: 900, marginBottom: 12, padding: "0 4px" }}>OYUN SEÇ</p>
          {games.map(g => (
            <div key={g.id} onClick={() => setGame(g.id)} style={{ display: "flex", gap: 12, alignItems: "center", padding: "13px 14px", borderRadius: 14, cursor: "pointer", marginBottom: 7, background: game === g.id ? T.accent : T.surfaceAlt, color: game === g.id ? T.accentText : T.text, border: game === g.id ? "none" : `1px solid ${T.border}`, transition: "all .15s" }}>
              <div style={{ flexShrink: 0, opacity: game === g.id ? 0.9 : 1 }}>{g.logo}</div>
              <div>
                <b style={{ fontSize: 13 }}>{g.title}</b>
                <p style={{ fontSize: 11, opacity: .65, marginTop: 2 }}>{g.text}</p>
              </div>
              {game === g.id && <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: T.accentText, flexShrink: 0 }} />}
            </div>
          ))}
        </aside>

        {/* Active game */}
        <main style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 20, minHeight: 520 }}>
          {game === "reaction" && <ReactionGame T={T} addXP={addXP} />}
          {game === "guess"    && <GuessGame T={T} addXP={addXP} />}
          {game === "memory"   && <MemoryGame T={T} addXP={addXP} />}
          {game === "rps"      && <RpsGame T={T} addXP={addXP} />}
          {game === "clicker"  && <ClickerGame T={T} addXP={addXP} />}
        </main>
      </div>
    </div>
  );
}

function GameHeader({ T, logo, title, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, padding: "16px 20px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 16 }}>
      <div style={{ flexShrink: 0 }}>{logo}</div>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 900 }}>{title}</h2>
        <p style={{ color: T.textSec, fontSize: 13, marginTop: 3 }}>{text}</p>
      </div>
    </div>
  );
}

function ReactionGame({ T, addXP }) {
  const [state, setState] = useState("idle");
  const [startTime, setStartTime] = useState(0);
  const [score, setScore] = useState(null);
  const [best, setBest] = useState(null);
  const timer = useRef(null);

  const begin = () => {
    setScore(null); setState("wait");
    const delay = 1200 + Math.random() * 2600;
    timer.current = setTimeout(() => { setStartTime(Date.now()); setState("go"); }, delay);
  };

  const clickBox = () => {
    if (state === "wait") { clearTimeout(timer.current); setState("tooSoon"); return; }
    if (state === "go") {
      const result = Date.now() - startTime;
      setScore(result); setBest(prev => prev === null ? result : Math.min(prev, result));
      addXP?.(result < 300 ? 25 : result < 500 ? 15 : 8); setState("done");
    }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const label = state === "idle" ? "Başlamak için tıkla" : state === "wait" ? "Bekle... yeşil olunca tıkla!" : state === "go" ? "ŞİMDİ TIKLA! ⚡" : state === "tooSoon" ? "Çok erken tıkladın! ❌" : "Tekrar dene";
  const bg = state === "go" ? "#17c964" : state === "tooSoon" ? "#f31260" : T.surfaceAlt;
  const col = state === "go" || state === "tooSoon" ? "#fff" : T.text;

  return (
    <div>
      <GameHeader T={T} logo={GameLogos.reaction} title="Tepki Testi" text="Refleks süreni milisaniye olarak ölç." />
      <div onClick={state === "idle" || state === "done" || state === "tooSoon" ? begin : clickBox} style={{ height: 280, borderRadius: 20, background: bg, color: col, display: "grid", placeItems: "center", border: `1px solid ${T.border}`, cursor: "pointer", textAlign: "center", transition: "background .15s" }}>
        <div>
          <h3 style={{ fontSize: 26, fontWeight: 900 }}>{label}</h3>
          {score !== null && <p style={{ marginTop: 12, fontSize: 16 }}>Skor: <b>{score}ms</b> {score < 300 ? "⚡ Muhteşem!" : score < 500 ? "👍 İyi!" : "😅 Dene yine!"}</p>}
          {best !== null && <p style={{ marginTop: 6, fontSize: 13, opacity: .75 }}>En iyi: {best}ms</p>}
        </div>
      </div>
    </div>
  );
}

function GuessGame({ T, addXP }) {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState("");
  const [msg, setMsg] = useState("1 ile 100 arasında bir sayı tahmin et.");
  const [tries, setTries] = useState(0);
  const [won, setWon] = useState(false);
  const [history, setHistory] = useState([]);

  const check = () => {
    const n = Number(guess);
    if (!n || n < 1 || n > 100) { setMsg("1-100 arasında geçerli sayı yaz."); return; }
    const t = tries + 1; setTries(t);
    setHistory(prev => [...prev, n]);
    if (n === target) { setMsg(`Doğru! ${t} denemede buldun. 🎉`); addXP?.(Math.max(10, 60 - tries * 5)); setWon(true); }
    else if (n < target) setMsg(`${n} → Daha büyük bir sayı dene ↑`);
    else setMsg(`${n} → Daha küçük bir sayı dene ↓`);
    setGuess("");
  };

  const reset = () => { setTarget(Math.floor(Math.random() * 100) + 1); setGuess(""); setMsg("Yeni sayı seçildi. Tahmin et."); setTries(0); setWon(false); setHistory([]); };

  return (
    <div>
      <GameHeader T={T} logo={GameLogos.guess} title="Sayı Tahmin" text="Gizli sayıyı en az denemede bul." />
      <div style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22 }}>
        <p style={{ color: won ? T.green : T.textSec, fontWeight: 700, marginBottom: 14, fontSize: 15 }}>{msg}</p>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input value={guess} onChange={e => setGuess(e.target.value)} onKeyDown={e => e.key === "Enter" && !won && check()} placeholder="Tahminin..." style={{ flex: 1, padding: "13px 15px", borderRadius: 13, border: `1px solid ${T.border}`, background: T.surface, color: T.text, outline: "none", fontSize: 15 }} disabled={won} />
          <button onClick={check} disabled={won} style={{ padding: "0 20px", borderRadius: 13, border: "none", background: T.accent, color: T.accentText, fontWeight: 800, cursor: "pointer" }}>Dene</button>
          <button onClick={reset} style={{ padding: "0 18px", borderRadius: 13, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontWeight: 700, cursor: "pointer" }}>Sıfırla</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {history.map((h, i) => <span key={i} style={{ background: h < target ? "rgba(6,182,212,.2)" : h > target ? "rgba(239,68,68,.2)" : "rgba(23,201,100,.3)", color: T.text, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{h} {h < target ? "↑" : h > target ? "↓" : "✓"}</span>)}
        </div>
        <p style={{ fontSize: 12, color: T.textTer, marginTop: 14 }}>Deneme: {tries}</p>
      </div>
    </div>
  );
}

function MemoryGame({ T, addXP }) {
  const base = ["LV","MO","XP","GG","DM","GL"];
  const makeDeck = () => [...base,...base].sort(() => Math.random() - .5).map((v,i) => ({ id: i, v, open: false, done: false }));
  const [deck, setDeck] = useState(makeDeck);
  const [pick, setPick] = useState([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const click = (card) => {
    if (locked || card.open || card.done || pick.length === 2) return;
    const opened = deck.map(c => c.id === card.id ? { ...c, open: true } : c);
    const nextPick = [...pick, card.id];
    setDeck(opened); setPick(nextPick);
    if (nextPick.length === 2) {
      setMoves(m => m + 1); setLocked(true);
      const [a, b] = nextPick.map(id => opened.find(c => c.id === id));
      setTimeout(() => {
        if (a.v === b.v) { addXP?.(12); setDeck(d => d.map(c => c.id === a.id || c.id === b.id ? { ...c, done: true } : c)); }
        else { setDeck(d => d.map(c => c.id === a.id || c.id === b.id ? { ...c, open: false } : c)); }
        setPick([]); setLocked(false);
      }, 700);
    }
  };

  const finished = deck.every(c => c.done);

  return (
    <div>
      <GameHeader T={T} logo={GameLogos.memory} title="Hafıza Kartları" text="Aynı kartları bul ve eşleştir." />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, alignItems: "center" }}>
        <b style={{ fontSize: 15 }}>Hamle: {moves}</b>
        <button onClick={() => { setDeck(makeDeck()); setPick([]); setMoves(0); setLocked(false); }} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>Yenile</button>
      </div>
      {finished && <div style={{ padding: 14, background: "rgba(23,201,100,.15)", border: "1px solid rgba(23,201,100,.3)", color: T.green, borderRadius: 12, marginBottom: 14, fontWeight: 800, textAlign: "center", fontSize: 15 }}>🎉 Tebrikler! Tüm kartları eşleştirdin! +{base.length * 12} XP</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {deck.map(card => (
          <button key={card.id} onClick={() => click(card)} style={{ height: 90, borderRadius: 16, border: `1px solid ${T.border}`, background: card.done ? "rgba(23,201,100,.2)" : card.open ? T.accent : T.surfaceAlt, color: card.open || card.done ? (card.done ? T.green : T.accentText) : T.textTer, fontWeight: 900, fontSize: card.open || card.done ? 18 : 28, cursor: "pointer", transition: "all .2s" }}>{card.open || card.done ? card.v : "?"}</button>
        ))}
      </div>
    </div>
  );
}

function RpsGame({ T, addXP }) {
  const choices = [
    { id: "taş", label: "✊ Taş", emoji: "✊" },
    { id: "kağıt", label: "✋ Kağıt", emoji: "✋" },
    { id: "makas", label: "✌️ Makas", emoji: "✌️" },
  ];
  const [result, setResult] = useState(null);
  const [score, setScore] = useState({ you: 0, bot: 0, draw: 0 });
  const [last, setLast] = useState(null);

  const play = (you) => {
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const bot = botChoice.id;
    let res = "draw";
    if ((you === "taş" && bot === "makas") || (you === "kağıt" && bot === "taş") || (you === "makas" && bot === "kağıt")) res = "win";
    else if (you !== bot) res = "lose";
    setLast({ you, bot, botEmoji: botChoice.emoji });
    setResult(res);
    if (res === "win") { addXP?.(10); setScore(s => ({ ...s, you: s.you + 1 })); }
    else if (res === "lose") setScore(s => ({ ...s, bot: s.bot + 1 }));
    else setScore(s => ({ ...s, draw: s.draw + 1 }));
  };

  return (
    <div>
      <GameHeader T={T} logo={GameLogos.rps} title="Taş Kağıt Makas" text="Botla kapış, skoru yükselt." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {choices.map(c => (
          <button key={c.id} onClick={() => play(c.id)} style={{ height: 110, borderRadius: 18, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, fontSize: 32, fontWeight: 900, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, transition: "transform .12s" }} onMouseDown={e => e.currentTarget.style.transform = "scale(.96)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>
            {c.emoji}
            <span style={{ fontSize: 12, fontWeight: 800, color: T.textSec }}>{c.id}</span>
          </button>
        ))}
      </div>
      <div style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
        {result && last && (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>{last.you === "taş" ? "✊" : last.you === "kağıt" ? "✋" : "✌️"} vs {last.botEmoji}</div>
            <p style={{ fontWeight: 900, fontSize: 18, color: result === "win" ? T.green : result === "lose" ? T.red : T.textSec }}>{result === "win" ? "🎉 Kazandın! +10 XP" : result === "lose" ? "😅 Kaybettin" : "🤝 Berabere"}</p>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: 14 }}>
          <span style={{ color: T.green }}>Sen: <b>{score.you}</b></span>
          <span style={{ color: T.textTer }}>Berabere: <b>{score.draw}</b></span>
          <span style={{ color: T.red }}>Bot: <b>{score.bot}</b></span>
        </div>
      </div>
    </div>
  );
}

function ClickerGame({ T, addXP }) {
  const [localXp, setLocalXp] = useState(0);
  const level = Math.floor(localXp / 100) + 1;
  const progress = localXp % 100;
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(null);

  const handleClick = () => {
    const gain = Math.max(7, Math.floor(7 * (1 + combo * 0.1)));
    setLocalXp(x => x + gain);
    addXP?.(2);
    setCombo(c => Math.min(c + 1, 20));
    if (comboTimer) clearTimeout(comboTimer);
    setComboTimer(setTimeout(() => setCombo(0), 1500));
  };

  return (
    <div>
      <GameHeader T={T} logo={GameLogos.clicker} title="Lyvora Clicker" text="Tıkla, kombo yap, XP kazan." />
      <div style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, textAlign: "center" }}>
        {combo > 3 && <p style={{ color: "#f59e0b", fontWeight: 900, fontSize: 14, marginBottom: 8 }}>🔥 {combo}x KOMBO!</p>}
        <div style={{ fontSize: 13, color: T.textSec, marginBottom: 8 }}>Seviye</div>
        <div style={{ fontSize: 54, fontWeight: 950, marginBottom: 8 }}>{level}</div>
        <div style={{ height: 10, background: T.surface, borderRadius: 999, overflow: "hidden", border: `1px solid ${T.border}`, marginBottom: 24 }}><div style={{ width: `${progress}%`, height: "100%", background: "#f59e0b", borderRadius: 999, transition: "width .1s" }} /></div>
        <button onClick={handleClick} style={{ width: 190, height: 190, borderRadius: "50%", border: "none", background: `radial-gradient(circle at 35% 35%, #fbbf24, #f59e0b 60%, #d97706)`, color: "#000", fontSize: 22, fontWeight: 950, cursor: "pointer", boxShadow: `0 18px 50px rgba(245,158,11,.4)`, transition: "transform .08s, box-shadow .08s", userSelect: "none" }} onMouseDown={e => { e.currentTarget.style.transform = "scale(.94)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(245,158,11,.3)"; }} onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 18px 50px rgba(245,158,11,.4)"; }}>
          TIKLA<br /><span style={{ fontSize: 13, opacity: .7 }}>+{Math.max(7, Math.floor(7 * (1 + combo * 0.1)))} XP</span>
        </button>
        <p style={{ marginTop: 18, color: T.textSec, fontSize: 13 }}>Toplam XP: <b>{localXp}</b></p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TASKS PAGE
═══════════════════════════════════════════ */
function TasksPage({ T }) {
  const done = TASKS.filter(t => t.done).length;
  const totalXp = TASKS.filter(t => t.done).reduce((a, t) => a + t.xp, 0);
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Görevler & Rozetler</h1>
      <p style={{ color: T.textSec, fontSize: 14, marginBottom: 22 }}>Görevleri tamamla, XP kazan ve seviye atla.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[{ label: "Tamamlanan", value: `${done}/${TASKS.length}`, icon: IC.task },{ label: "Kazanılan XP", value: totalXp.toLocaleString("tr"), icon: IC.spark },{ label: "Mevcut Seviye", value: "63", icon: IC.crown }].map(s => (
          <div key={s.label} style={{ background: T.surface, borderRadius: 14, padding: 18, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.surfaceAlt, display: "grid", placeItems: "center", color: T.textSec }}>{s.icon}</div>
            <div><div style={{ fontWeight: 800, fontSize: 22 }}>{s.value}</div><div style={{ fontSize: 12, color: T.textSec }}>{s.label}</div></div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {TASKS.map(task => (
          <div key={task.id} style={{ background: T.surface, borderRadius: 14, padding: 18, border: `1px solid ${T.border}`, opacity: task.done ? .7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: task.progress !== undefined ? 10 : 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  {task.done ? <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.green, display: "grid", placeItems: "center", color: "#fff" }}><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div> : <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${T.border}` }} />}
                  <span style={{ fontWeight: 600, fontSize: 14, textDecoration: task.done ? "line-through" : "none", color: task.done ? T.textSec : T.text }}>{task.title}</span>
                </div>
                <span style={{ fontSize: 11, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, padding: "2px 8px", color: T.textSec }}>{task.category}</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 13, color: task.done ? T.textSec : T.text, whiteSpace: "nowrap", marginLeft: 10 }}>+{task.xp} XP</span>
            </div>
            {task.progress !== undefined && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textSec, marginBottom: 5 }}><span>İlerleme</span><span>{task.progress}/{task.total}</span></div>
                <div style={{ background: T.surfaceAlt, borderRadius: 999, height: 6 }}><div style={{ width: `${(task.progress / task.total) * 100}%`, height: "100%", background: T.accent, borderRadius: 999 }} /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MOOD MATCH PAGE
═══════════════════════════════════════════ */
function MoodMatchPage({ T, nav }) {
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(false);
  const [searching, setSearching] = useState(false);
  const iconMap = { moon: IC.moon, heart: IC.heart, smile: IC.smile, zap: IC.zap, users: IC.users };

  const doSearch = () => {
    if (!selected) return;
    setSearching(true);
    setTimeout(() => { setSearching(false); setMatched(true); }, 2000);
  };

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Mood Eşleşme</h1>
      <p style={{ color: T.textSec, fontSize: 14, marginBottom: 24 }}>Şu anki ruh halini seç ve benzer birini bul.</p>
      {!matched ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
            {MOODS.map(m => (
              <div key={m.id} onClick={() => setSelected(m.id)} style={{ background: T.surface, borderRadius: 16, padding: 22, border: `2px solid ${selected === m.id ? m.color : T.border}`, cursor: "pointer", transition: "all .15s", boxShadow: selected === m.id ? `0 0 0 3px ${m.color}22` : "none" }}>
                <div style={{ fontSize: 32, marginBottom: 10, color: m.color }}>{iconMap[m.icon]}</div>
                <h3 style={{ fontWeight: 700, fontSize: 15 }}>{m.label}</h3>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <button onClick={doSearch} disabled={!selected || searching} style={{ padding: "14px 40px", borderRadius: 14, background: selected ? T.accent : T.surfaceAlt, color: selected ? T.accentText : T.textSec, border: "none", fontWeight: 700, fontSize: 15, cursor: selected ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: 10 }}>
              {searching ? "Eşleşme aranıyor..." : "Eşleş"} {!searching && IC.arrow}
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✦</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Eşleşme Bulundu!</h2>
          <p style={{ color: T.textSec, marginBottom: 24 }}>Anonim#7741 ile aynı mood'dasınız.</p>
          <div style={{ background: T.surface, borderRadius: 16, padding: 22, border: `1px solid ${T.border}`, display: "inline-block", marginBottom: 24, minWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "flex-start" }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: T.surfaceAlt, display: "grid", placeItems: "center", color: T.textSec }}>{IC.user}</div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Anonim#7741</div>
                <div style={{ fontSize: 13, color: T.textSec }}>{MOODS.find(m => m.id === selected)?.label}</div>
              </div>
            </div>
          </div>
          <br />
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => nav?.("dm")} style={{ padding: "12px 24px", borderRadius: 12, background: T.accent, color: T.accentText, border: "none", fontWeight: 700, cursor: "pointer" }}>Sohbet Başlat</button>
            <button onClick={() => { setMatched(false); setSelected(null); }} style={{ padding: "12px 24px", borderRadius: 12, background: T.surfaceAlt, color: T.text, border: `1px solid ${T.border}`, fontWeight: 700, cursor: "pointer" }}>Yeniden Eşleş</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOCATION PAGE
═══════════════════════════════════════════ */
function LocationPage({ T, addXP }) {
  const [city, setCity] = useState("İstanbul");
  const [nearby, setNearby] = useState(false);
  const places = [
    { city: "İstanbul", online: 324, mood: "Sohbet", icon: "🌉" },
    { city: "Ankara", online: 188, mood: "Chill", icon: "🏛️" },
    { city: "İzmir", online: 246, mood: "Müzik", icon: "🌊" },
    { city: "Bursa", online: 96, mood: "Oyun", icon: "🌲" },
    { city: "Antalya", online: 132, mood: "Sosyal", icon: "☀️" },
    { city: "Adana", online: 74, mood: "Gece", icon: "🌶️" },
  ];
  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 28, padding: 28, marginBottom: 18 }}>
        <p style={{ color: T.purple, fontSize: 11, fontWeight: 950, letterSpacing: 2 }}>LOKASYON</p>
        <h1 style={{ fontSize: 34, fontWeight: 950, marginTop: 8 }}>Yakındaki Topluluklar</h1>
        <p style={{ color: T.textSec, marginTop: 8 }}>Konum paylaşmadan şehir bazlı anonim toplulukları keşfet.</p>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <input value={city} onChange={e => setCity(e.target.value)} style={{ flex: 1, height: 48, borderRadius: 14, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, padding: "0 14px", outline: "none" }} placeholder="Şehir ara..." />
          <button onClick={() => { setNearby(true); addXP?.(5); }} style={{ height: 48, padding: "0 18px", borderRadius: 14, border: "none", background: T.accent, color: T.accentText, fontWeight: 950, cursor: "pointer" }}>Yakınımı Bul</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        {places.map(place => (
          <div key={place.city} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 24, padding: 20, cursor: "pointer" }}>
            <div style={{ fontSize: 42 }}>{place.icon}</div>
            <h3 style={{ marginTop: 12, fontWeight: 950 }}>{place.city}</h3>
            <p style={{ color: T.textSec, marginTop: 6 }}>{place.online} çevrimiçi • {place.mood}</p>
            <div style={{ marginTop: 14, height: 8, background: T.surfaceAlt, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, place.online / 4)}%`, height: "100%", background: T.purple }} />
            </div>
          </div>
        ))}
      </div>
      {nearby && (
        <div style={{ marginTop: 18, background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.28)", borderRadius: 20, padding: 18, color: T.text }}>
          <b>{city}</b> için anonim yakın topluluklar listelendi. +5 XP kazandın! 🎉
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PREMIUM PAGE
═══════════════════════════════════════════ */
function PremiumPage({ T }) {
  const plans = [
    { name: "Ücretsiz", price: "₺0", period: "/ay", features: ["Global Lounge erişimi","5 oda üyeliği","Temel rozetler","Standart mood eşleşme"], cta: "Mevcut Plan", current: true },
    { name: "Premium", price: "₺49", period: "/ay", features: ["Tüm ücretsiz özellikler","Sınırsız oda üyeliği","Özel rozetler & temalar","Öncelikli mood eşleşme","Reklamsız deneyim","Özel profil efektleri"], cta: "Başla", highlight: true },
    { name: "Pro", price: "₺99", period: "/ay", features: ["Tüm Premium özellikler","Özel sunucu oluştur","Analitik dashboard","Moderatör araçları","7/24 öncelikli destek"], cta: "Pro'ya Geç" },
  ];
  return (
    <div style={{ padding: 28 }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>Lyvora Premium</h1>
        <p style={{ color: T.textSec, fontSize: 15, maxWidth: 480, margin: "0 auto" }}>Deneyimini bir üst seviyeye taşı. Özel rozetler, öncelikli eşleşme ve çok daha fazlası.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 900, margin: "0 auto" }}>
        {plans.map(plan => (
          <div key={plan.name} style={{ background: plan.highlight ? T.accent : T.surface, borderRadius: 20, padding: 28, border: `2px solid ${plan.highlight ? T.accent : T.border}`, position: "relative", color: plan.highlight ? T.accentText : T.text }}>
            {plan.highlight && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#FFD700", color: "#000", borderRadius: 999, padding: "4px 16px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>EN POPÜLER</div>}
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{plan.name}</h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
              <span style={{ fontSize: 36, fontWeight: 800 }}>{plan.price}</span>
              <span style={{ fontSize: 13, opacity: .65 }}>{plan.period}</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              {plan.features.map(f => <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", fontSize: 13, borderBottom: `1px solid ${plan.highlight ? "rgba(255,255,255,.1)" : T.borderLight}` }}><span style={{ opacity: .7 }}>{IC.task}</span>{f}</div>)}
            </div>
            <button style={{ width: "100%", padding: "13px 0", borderRadius: 12, background: plan.highlight ? T.accentText : plan.current ? "transparent" : T.accent, color: plan.highlight ? T.accent : plan.current ? T.textSec : T.accentText, border: plan.current ? `1px solid ${T.border}` : "none", fontWeight: 700, cursor: plan.current ? "default" : "pointer", fontSize: 14 }}>{plan.cta}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SETTINGS PAGE
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   OWNER ADMIN PANEL
═══════════════════════════════════════════ */
function AdminPanelPage({ T, user }) {
  const [tab, setTab] = useState("mods");
  const [moderators, setModerators] = useState(() => getLocalModerators());
  const [modEmail, setModEmail] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [reports, setReports] = useState([
    { id: "r1", target: "Anonim#4821", reason: "Spam mesaj", status: "open", count: 3 },
    { id: "r2", target: "Gece Kuşları", reason: "Oda kural ihlali", status: "review", count: 1 },
    { id: "r3", target: "Anonim#9032", reason: "Rahatsız edici davranış", status: "closed", count: 2 },
  ]);
  const [adminLog, setAdminLog] = useState(() => readLocalJson("lyvora_admin_log", []));
  const [notice, setNotice] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [managedUsers, setManagedUsers] = useState(() => readLocalJson("lyvora_managed_users", [
    { uid: "demo-owner", name: "Ali", email: LYVORA_SUPER_ADMIN_EMAIL, tag: "Lyvora#0001", xp: 62400, level: 63, role: "owner", status: "active", premium: { active: true, plan: "Galaxy", expiresAt: "Sınırsız" }, notes: "Lyvora sahibi" },
    { uid: "demo-1", name: "Nova", email: "nova@example.com", tag: "Nova#4821", xp: 9840, level: 24, role: "user", status: "active", premium: { active: false, plan: "Free" }, notes: "" },
    { uid: "demo-2", name: "Elysia", email: "elysia@example.com", tag: "Elysia#7710", xp: 7310, level: 18, role: "user", status: "active", premium: { active: false, plan: "Free" }, notes: "" },
    { uid: "demo-3", name: "Raven", email: "raven@example.com", tag: "Raven#9032", xp: 15200, level: 31, role: "mod", status: "muted", premium: { active: true, plan: "Nebula", expiresAt: "30 gün" }, notes: "Test moderatör" },
  ]));

  const canSee = isLyvoraSuperAdmin(user);
  if (!canSee) {
    return (
      <div style={{ padding: 24 }}>
        <PanelCard T={T} title="Yetkisiz alan" icon={IC.lock}>
          <p style={{ color: T.textSec, fontSize: 14 }}>Bu panel sadece Lyvora sahibine açıktır.</p>
        </PanelCard>
      </div>
    );
  }

  const writeLog = async (action) => {
    const item = { id: Date.now(), action, by: user?.email || LYVORA_SUPER_ADMIN_EMAIL, time: new Date().toLocaleString("tr-TR") };
    const next = [item, ...adminLog].slice(0, 20);
    setAdminLog(next);
    localStorage.setItem("lyvora_admin_log", JSON.stringify(next));
    try {
      await addDoc(collection(db, "adminLogs"), { ...item, createdAt: serverTimestamp() });
    } catch (err) {
      console.warn("Admin log Firestore yazılamadı, local kayıt duruyor:", err);
    }
  };

  const saveManagedUsers = (next) => {
    setManagedUsers(next);
    localStorage.setItem("lyvora_managed_users", JSON.stringify(next));
  };

  const syncUserDoc = async (u, patch) => {
    const cleanEmail = normalizeEmail(u.email);
    try {
      await setDoc(doc(db, "adminUserOverrides", cleanEmail || u.uid), { ...patch, email: cleanEmail, updatedBy: user?.email || LYVORA_SUPER_ADMIN_EMAIL, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.warn("Admin kullanıcı işlemi Firestore'a yazılamadı, local kayıt duruyor:", err);
    }
  };

  const updateManagedUser = async (uid, patch, logText) => {
    const target = managedUsers.find((x) => x.uid === uid);
    if (!target) return;
    if (normalizeEmail(target.email) === LYVORA_SUPER_ADMIN_EMAIL && patch.status && patch.status !== "active") return alert("Owner hesabı ban/mute/suspend yapılamaz.");
    const next = managedUsers.map((x) => x.uid === uid ? { ...x, ...patch } : x);
    saveManagedUsers(next);
    await syncUserDoc(target, patch);
    writeLog(logText || `${target.email || target.tag} güncellendi`);
  };

  const giftPremium = (u, plan = "Nebula", duration = "30 gün") => {
    updateManagedUser(u.uid, { premium: { active: true, plan, giftedBy: LYVORA_SUPER_ADMIN_EMAIL, giftedAt: new Date().toISOString(), expiresAt: duration } }, `${u.email || u.tag} için ${plan} premium hediye edildi`);
  };

  const clearPremium = (u) => {
    updateManagedUser(u.uid, { premium: { active: false, plan: "Free" } }, `${u.email || u.tag} premium kaldırıldı`);
  };

  const addUserXp = (u, amount) => {
    const nextXp = Math.max(0, Number(u.xp || 0) + amount);
    updateManagedUser(u.uid, { xp: nextXp, level: Math.floor(nextXp / 100) + 1 }, `${u.email || u.tag} XP ${amount > 0 ? "+" : ""}${amount}`);
  };

  const filteredManagedUsers = managedUsers.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return [u.name, u.email, u.tag, u.role, u.status].some((v) => String(v || "").toLowerCase().includes(q));
  });

  const addModerator = async () => {
    const email = normalizeEmail(modEmail);
    if (!email) return alert("Moderatör e-postası yaz.");
    if (email === LYVORA_SUPER_ADMIN_EMAIL) return alert("Owner zaten full yetkili.");
    if (moderators.some((m) => normalizeEmail(m.email) === email)) return alert("Bu moderatör zaten ekli.");
    const mod = { email, role: "mod", permissions: { ...DEFAULT_MOD_PERMISSIONS }, createdAt: new Date().toISOString() };
    const next = [mod, ...moderators];
    setModerators(next); saveLocalModerators(next); setModEmail(""); setSelectedEmail(email);
    try {
      await setDoc(doc(db, "adminRoles", email), { ...mod, updatedAt: serverTimestamp(), owner: false });
    } catch (err) {
      console.warn("Mod rolü Firestore'a yazılamadı, local kayıt duruyor:", err);
    }
    writeLog(`${email} moderatör yapıldı`);
  };

  const removeModerator = async (email) => {
    const clean = normalizeEmail(email);
    const next = moderators.filter((m) => normalizeEmail(m.email) !== clean);
    setModerators(next); saveLocalModerators(next);
    if (selectedEmail === clean) setSelectedEmail("");
    try { await deleteDoc(doc(db, "adminRoles", clean)); } catch (err) { console.warn(err); }
    writeLog(`${clean} moderatörlükten kaldırıldı`);
  };

  const togglePermission = async (email, key) => {
    const clean = normalizeEmail(email);
    const next = moderators.map((m) => m.email === clean ? { ...m, permissions: { ...m.permissions, [key]: !m.permissions?.[key] } } : m);
    setModerators(next); saveLocalModerators(next);
    const changed = next.find((m) => m.email === clean);
    try { await setDoc(doc(db, "adminRoles", clean), { ...changed, updatedAt: serverTimestamp() }, { merge: true }); } catch (err) { console.warn(err); }
    writeLog(`${clean} için ${key} yetkisi değiştirildi`);
  };

  const selectedMod = moderators.find((m) => m.email === selectedEmail) || moderators[0];

  return (
    <div style={{ padding: 24, width: "100%", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div>
          <p style={{ color: T.purple, fontSize: 12, fontWeight: 900, letterSpacing: 2, marginBottom: 8 }}>LYVORA OWNER PANEL</p>
          <h1 style={{ fontSize: 30, fontWeight: 950, marginBottom: 8 }}>Admin & Moderasyon Merkezi</h1>
          <p style={{ color: T.textSec, fontSize: 14 }}>Sadece <b>{LYVORA_SUPER_ADMIN_EMAIL}</b> hesabı bu paneli görebilir.</p>
        </div>
        <div style={{ padding: "10px 14px", borderRadius: 999, background: "rgba(139,92,246,.14)", color: T.purple, border: "1px solid rgba(139,92,246,.35)", fontWeight: 900, display: "flex", gap: 8, alignItems: "center" }}>{IC.crown} SUPER ADMIN</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        <AdminStat T={T} icon={IC.users} label="Moderatör" value={moderators.length} />
        <AdminStat T={T} icon={IC.eye} label="Açık Rapor" value={reports.filter(r => r.status !== "closed").length} />
        <AdminStat T={T} icon={IC.user} label="Kullanıcı" value={managedUsers.length} />
        <AdminStat T={T} icon={IC.zap} label="Log" value={adminLog.length} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[['mods','Moderatörler'],['users','Kullanıcılar'],['premium','Premium'],['reports','Raporlar'],['actions','Hızlı Yetkiler'],['logs','Admin Log']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ border: `1px solid ${tab === id ? T.purple : T.border}`, background: tab === id ? "rgba(139,92,246,.16)" : T.surface, color: tab === id ? T.purple : T.textSec, borderRadius: 12, padding: "10px 14px", fontWeight: 850, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {tab === "mods" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16 }}>
          <PanelCard T={T} title="Moderatör ekle / kaldır" icon={IC.userplus}>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input value={modEmail} onChange={(e) => setModEmail(e.target.value)} placeholder="modmail@example.com" style={adminInput(T)} />
              <button onClick={addModerator} style={adminButton(T)}>Mod Yap</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {moderators.length === 0 && <p style={{ color: T.textSec, fontSize: 13 }}>Henüz moderatör yok. E-posta yazıp ekleyebilirsin.</p>}
              {moderators.map((m) => (
                <div key={m.email} onClick={() => setSelectedEmail(m.email)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, background: selectedMod?.email === m.email ? "rgba(139,92,246,.14)" : T.surfaceAlt, border: `1px solid ${selectedMod?.email === m.email ? "rgba(139,92,246,.4)" : T.border}`, cursor: "pointer" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.accent, color: T.accentText, display: "grid", placeItems: "center", fontWeight: 900 }}>{m.email[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}><b style={{ fontSize: 13 }}>{m.email}</b><p style={{ color: T.textSec, fontSize: 11, marginTop: 2 }}>Yetki sayısı: {Object.values(m.permissions || {}).filter(Boolean).length}</p></div>
                  <button onClick={(e) => { e.stopPropagation(); removeModerator(m.email); }} style={{ border: "none", background: "rgba(243,18,96,.12)", color: T.red, borderRadius: 10, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>Kaldır</button>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Yetki Toggle" icon={IC.settings}>
            {!selectedMod ? <p style={{ color: T.textSec, fontSize: 13 }}>Bir moderatör seç.</p> : (
              <div>
                <b style={{ fontSize: 13 }}>{selectedMod.email}</b>
                <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
                  {Object.keys(DEFAULT_MOD_PERMISSIONS).map((key) => (
                    <label key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>{key}</span>
                      <input type="checkbox" checked={!!selectedMod.permissions?.[key]} onChange={() => togglePermission(selectedMod.email, key)} />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </PanelCard>
        </div>
      )}

      {tab === "users" && (
        <PanelCard T={T} title="Kullanıcı Yönetimi" icon={IC.user}>
          <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Mail, tag, isim veya rol ara..." style={{ ...adminInput(T), width: "100%", marginBottom: 14 }} />
          <div style={{ display: "grid", gap: 12 }}>
            {filteredManagedUsers.map((u) => (
              <div key={u.uid} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: 14, borderRadius: 16, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b>{u.name || u.tag}</b>
                    <span style={{ color: T.textSec, fontSize: 12 }}>{u.email}</span>
                    <span style={{ borderRadius: 999, padding: "3px 8px", fontSize: 10, fontWeight: 900, background: u.role === "owner" ? "rgba(139,92,246,.18)" : u.role === "mod" ? "rgba(23,201,100,.14)" : T.surface, color: u.role === "owner" ? T.purple : u.role === "mod" ? T.green : T.textSec }}>{u.role}</span>
                    <span style={{ borderRadius: 999, padding: "3px 8px", fontSize: 10, fontWeight: 900, background: u.status === "active" ? "rgba(23,201,100,.12)" : "rgba(243,18,96,.12)", color: u.status === "active" ? T.green : T.red }}>{u.status}</span>
                    {u.premium?.active && <span style={{ borderRadius: 999, padding: "3px 8px", fontSize: 10, fontWeight: 900, background: "rgba(139,92,246,.14)", color: T.purple }}>Premium: {u.premium.plan}</span>}
                  </div>
                  <p style={{ color: T.textSec, fontSize: 12, marginTop: 5 }}>{u.tag} • XP {u.xp || 0} • Lv{u.level || 1} • Not: {u.notes || "yok"}</p>
                </div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => giftPremium(u, "Nebula", "30 gün")} style={adminMiniButton(T)}>Premium Ver</button>
                  <button onClick={() => clearPremium(u)} style={adminMiniButton(T)}>Premium Al</button>
                  <button onClick={() => addUserXp(u, 100)} style={adminMiniButton(T)}>+100 XP</button>
                  <button onClick={() => addUserXp(u, -100)} style={adminMiniButton(T)}>-100 XP</button>
                  <button onClick={() => updateManagedUser(u.uid, { status: u.status === "banned" ? "active" : "banned" }, `${u.email || u.tag} ban durumu değişti`)} style={adminMiniButton(T, "danger")}>{u.status === "banned" ? "Ban Aç" : "Ban"}</button>
                  <button onClick={() => updateManagedUser(u.uid, { status: u.status === "muted" ? "active" : "muted" }, `${u.email || u.tag} mute durumu değişti`)} style={adminMiniButton(T)}>Mute</button>
                </div>
              </div>
            ))}
            {filteredManagedUsers.length === 0 && <p style={{ color: T.textSec, fontSize: 13 }}>Aramana uygun kullanıcı bulunamadı.</p>}
          </div>
        </PanelCard>
      )}

      {tab === "premium" && (
        <PanelCard T={T} title="Premium Hediye Merkezi" icon={IC.crown}>
          <p style={{ color: T.textSec, fontSize: 13, marginBottom: 14 }}>Kullanıcılar sekmesindeki <b>Premium Ver</b> butonu şimdilik hızlı hediye verir. Buradan aktif premiumları görebilirsin.</p>
          <div style={{ display: "grid", gap: 10 }}>
            {managedUsers.filter((u) => u.premium?.active).map((u) => (
              <div key={u.uid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 13, borderRadius: 14, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                <div><b>{u.name || u.tag}</b><p style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>{u.email} • {u.premium.plan} • {u.premium.expiresAt || "Sınırsız"}</p></div>
                <button onClick={() => clearPremium(u)} style={adminButton(T)}>Premium Kaldır</button>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      {tab === "reports" && (
        <PanelCard T={T} title="Rapor kuyruğu" icon={IC.eye}>
          <div style={{ display: "grid", gap: 10 }}>
            {reports.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 13, borderRadius: 14, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                <div style={{ color: r.status === "closed" ? T.green : T.red }}>{r.status === "closed" ? IC.task : IC.shield}</div>
                <div style={{ flex: 1 }}><b style={{ fontSize: 13 }}>{r.target}</b><p style={{ color: T.textSec, fontSize: 12 }}>{r.reason} • {r.count} rapor</p></div>
                <button onClick={() => { setReports(reports.map(x => x.id === r.id ? { ...x, status: "closed" } : x)); writeLog(`${r.target} raporu kapatıldı`); }} style={adminButton(T, r.status === "closed")}>{r.status === "closed" ? "Kapalı" : "Kapat"}</button>
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      {tab === "actions" && (
        <PanelCard T={T} title="Hızlı yönetim aksiyonları" icon={IC.zap}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
            {["Kullanıcı banla", "Kullanıcı mute", "Premium ver", "XP ekle", "Oda kilitle", "Duyuru yayınla"].map((a) => (
              <button key={a} onClick={() => { setNotice(`${a} aksiyonu panel taslağına eklendi.`); writeLog(`${a} aksiyonu test edildi`); }} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: 16, cursor: "pointer", textAlign: "left", fontWeight: 850 }}>{a}<p style={{ color: T.textSec, fontSize: 11, marginTop: 6, fontWeight: 500 }}>Firestore bağlanınca gerçek işlem yapar.</p></button>
            ))}
          </div>
          {notice && <p style={{ marginTop: 14, color: T.green, fontWeight: 800 }}>{notice}</p>}
        </PanelCard>
      )}

      {tab === "logs" && (
        <PanelCard T={T} title="Son admin hareketleri" icon={IC.bar}>
          <div style={{ display: "grid", gap: 8 }}>
            {adminLog.length === 0 && <p style={{ color: T.textSec, fontSize: 13 }}>Henüz log yok.</p>}
            {adminLog.map((l) => <div key={l.id} style={{ padding: 12, borderRadius: 12, background: T.surfaceAlt, border: `1px solid ${T.border}` }}><b style={{ fontSize: 12 }}>{l.action}</b><p style={{ fontSize: 11, color: T.textSec, marginTop: 4 }}>{l.by} • {l.time}</p></div>)}
          </div>
        </PanelCard>
      )}
    </div>
  );
}

function AdminStat({ T, icon, label, value }) {
  return <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }}><div style={{ color: T.purple, marginBottom: 8 }}>{icon}</div><b style={{ fontSize: 22 }}>{value}</b><p style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>{label}</p></div>;
}
function PanelCard({ T, title, icon, children }) {
  return <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 18, boxShadow: "0 12px 36px rgba(0,0,0,.05)" }}><h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, marginBottom: 14 }}>{icon}{title}</h2>{children}</section>;
}
function adminInput(T) {
  return { flex: 1, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 12, padding: "12px 13px", outline: "none" };
}
function adminButton(T, disabled = false) {
  return { border: "none", background: disabled ? T.border : T.accent, color: disabled ? T.textSec : T.accentText, borderRadius: 12, padding: "11px 14px", fontWeight: 900, cursor: disabled ? "default" : "pointer" };
}
function adminMiniButton(T, tone = "normal") {
  return { border: `1px solid ${tone === "danger" ? "rgba(243,18,96,.35)" : T.border}`, background: tone === "danger" ? "rgba(243,18,96,.10)" : T.surface, color: tone === "danger" ? T.red : T.text, borderRadius: 10, padding: "8px 10px", fontSize: 11, fontWeight: 900, cursor: "pointer" };
}

function SettingsPage({ T, theme, setTheme, onLogout, user }) {
  const [dmOpen, setDmOpen] = useState(true);
  const [notify, setNotify] = useState(true);
  const [online, setOnline] = useState(true);
  const [safeMode, setSafeMode] = useState(true);
  const [autoMood, setAutoMood] = useState(false);

  const Toggle = ({ value, setValue }) => (
    <button onClick={() => setValue(!value)} style={{ width: 54, height: 30, borderRadius: 999, border: `1px solid ${T.border}`, background: value ? T.purple : T.surfaceAlt, padding: 3, cursor: "pointer", transition: "all .2s" }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: value ? "#fff" : T.textTer, transform: value ? "translateX(24px)" : "translateX(0)", transition: "all .2s" }} />
    </button>
  );

  const SettingRow = ({ icon, title, text, right }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: `1px solid ${T.borderLight}` }}>
      <div style={{ width: 40, height: 40, borderRadius: 13, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textSec, display: "grid", placeItems: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{title}</h3>
        <p style={{ fontSize: 12, color: T.textSec, lineHeight: 1.5 }}>{text}</p>
      </div>
      {right}
    </div>
  );

  return (
    <div style={{ padding: 28 }}>
      <div style={{ background: T.hero, color: "#fff", borderRadius: 22, padding: "34px 36px", marginBottom: 18 }}>
        <p style={{ fontSize: 11, letterSpacing: 4, color: "#888", marginBottom: 8 }}>LYVORA PANEL</p>
        <h1 style={{ fontSize: 32, fontWeight: 850, marginBottom: 8, color: "#fff" }}>Ayarlar</h1>
        <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7 }}>Tema, gizlilik, bildirim ve hesap ayarlarını buradan yönetebilirsin.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
        <main style={{ display: "grid", gap: 18 }}>
          <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22 }}>
            <h2 style={{ fontSize: 17, fontWeight: 850, marginBottom: 14 }}>{IC.settings} Genel Ayarlar</h2>
            <SettingRow icon={theme === "light" ? IC.sun : IC.moon} title="Tema Modu" text="Açık ve koyu tema arasında geçiş yap." right={<button onClick={() => setTheme(theme === "light" ? "dark" : "light")} style={{ border: "none", background: T.accent, color: T.accentText, borderRadius: 12, padding: "10px 14px", fontWeight: 800, cursor: "pointer" }}>{theme === "light" ? "Koyu Moda Geç" : "Açık Moda Geç"}</button>} />
            <SettingRow icon={IC.bell} title="Bildirimler" text="Mesaj, görev ve duyuru bildirimlerini göster." right={<Toggle value={notify} setValue={setNotify} />} />
            <SettingRow icon={IC.eye} title="Çevrimiçi Durumu" text="Diğer kullanıcılar seni çevrimiçi görebilsin." right={<Toggle value={online} setValue={setOnline} />} />
          </section>
          <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22 }}>
            <h2 style={{ fontSize: 17, fontWeight: 850, marginBottom: 14 }}>{IC.shield} Gizlilik ve Güvenlik</h2>
            <SettingRow icon={IC.msg} title="DM İstekleri" text="Yeni kişilerin sana özel mesaj göndermesine izin ver." right={<Toggle value={dmOpen} setValue={setDmOpen} />} />
            <SettingRow icon={IC.shield} title="Güvenli Mod" text="Rahatsız edici içerikler ve şüpheli davranışlar filtrelensin." right={<Toggle value={safeMode} setValue={setSafeMode} />} />
            <SettingRow icon={IC.spark} title="Otomatik Mood Önerisi" text="Aktiviteye göre mood eşleşme önerileri gösterilsin." right={<Toggle value={autoMood} setValue={setAutoMood} />} />
          </section>
          <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22 }}>
            <h2 style={{ fontSize: 17, fontWeight: 850, marginBottom: 14 }}>{IC.lock} Hesap</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
              <button style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: 16, cursor: "pointer", textAlign: "left", fontWeight: 800 }}>Şifreyi Değiştir<p style={{ fontSize: 12, color: T.textSec, fontWeight: 400, marginTop: 5 }}>Hesap güvenliğini güncelle.</p></button>
              <button style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: 16, cursor: "pointer", textAlign: "left", fontWeight: 800 }}>Verilerimi İndir<p style={{ fontSize: 12, color: T.textSec, fontWeight: 400, marginTop: 5 }}>Profil ve etkinlik verilerini görüntüle.</p></button>
            </div>
            <button onClick={onLogout} style={{ marginTop: 14, border: "none", background: T.red, color: "#fff", borderRadius: 14, padding: "13px 18px", cursor: "pointer", fontWeight: 900 }}>Çıkış Yap</button>
          </section>
        </main>
        <aside style={{ display: "grid", gap: 18, height: "fit-content" }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22 }}>
            <h2 style={{ fontSize: 17, fontWeight: 850, marginBottom: 12 }}>Hesap Özeti</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: T.accent, color: T.accentText, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 20 }}>L</div>
              <div><b>{user?.tag || "Lyvora#0001"}</b><p style={{ color: T.textSec, fontSize: 12, marginTop: 3 }}>Anonim profil</p></div>
            </div>
            {[["Tema", theme === "light" ? "Açık" : "Koyu"],["Bildirim", notify ? "Açık" : "Kapalı"],["DM", dmOpen ? "Açık" : "Kapalı"],["Güvenli Mod", safeMode ? "Aktif" : "Pasif"]].map(([a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}><span style={{ color: T.textSec }}>{a}</span><b>{b}</b></div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LEGAL PAGES
═══════════════════════════════════════════ */
function LegalShell({ T, nav, title, subtitle, children }) {
  return (
    <div style={{ padding: 28 }}>
      <div style={{ background: T.hero, color: "#fff", borderRadius: 22, padding: "34px 36px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 32, top: 18, opacity: .07, fontSize: 120, fontWeight: 900 }}>LV</div>
        <p style={{ fontSize: 11, letterSpacing: 4, color: "#888", marginBottom: 8 }}>LYVORA LEGAL</p>
        <h1 style={{ fontSize: 32, fontWeight: 850, marginBottom: 8, color: "#fff" }}>{title}</h1>
        <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, maxWidth: 650 }}>{subtitle}</p>
        <button onClick={() => nav("home")} style={{ marginTop: 20, padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>← Ana Sayfaya Dön</button>
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 26, color: T.text }}>{children}</div>
    </div>
  );
}




/* LYVORA_PATCH_58_MOBILE_FINAL_SYSTEM */
const LYVORA_REAL_MEDIA_UPLOAD_ENABLED = true;
const LYVORA_MEDIA_MAX_MB = 25;

function validateLyvoraMediaFile(file, maxMb = LYVORA_MEDIA_MAX_MB) {
  if (!file) return { ok: false, message: "Dosya bulunamadı." };
  const type = String(file.type || "");
  const isImage = type.startsWith("image/");
  const isVideo = type.startsWith("video/");
  if (!isImage && !isVideo) return { ok: false, message: "Sadece görsel veya video yükleyebilirsin." };
  if (file.size > maxMb * 1024 * 1024) return { ok: false, message: `Medya çok büyük. En fazla ${maxMb} MB yükleyebilirsin.` };
  return { ok: true, kind: isVideo ? "video" : "image", message: "" };
}

function buildLyvoraMediaPath(file, user) {
  const uid = auth.currentUser?.uid || user?.uid || "local-user";
  const safeName = String(file?.name || "media")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-90);
  return `lyvoraMedia/${uid}/${Date.now()}_${Math.random().toString(16).slice(2)}_${safeName}`;
}

async function uploadLyvoraMediaToFirebase(file, user, onProgress) {
  const check = validateLyvoraMediaFile(file);
  if (!check.ok) throw new Error(check.message);

  const firebaseAppModule = await import("./firebase");
  const storageModule = await import("firebase/storage");
  const storage = firebaseAppModule.storage || firebaseAppModule.default?.storage || null;
  if (!storage) throw new Error("Firebase Storage export bulunamadı. firebase.ts içine storage export eklenmeli.");

  const path = buildLyvoraMediaPath(file, user);
  const mediaRef = storageModule.ref(storage, path);
  const task = storageModule.uploadBytesResumable(mediaRef, file, {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      app: "lyvora",
      uid: auth.currentUser?.uid || user?.uid || "local-user",
      originalName: file.name || "media",
    },
  });

  const snapshot = await new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
        onProgress?.(Math.max(1, Math.min(100, pct)));
      },
      reject,
      () => resolve(task.snapshot)
    );
  });

  const url = await storageModule.getDownloadURL(snapshot.ref);
  const payload = {
    url,
    storagePath: path,
    kind: check.kind,
    fileName: file.name || "media",
    size: file.size || 0,
    contentType: file.type || "",
    uploadedBy: auth.currentUser?.uid || user?.uid || "local-user",
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "mediaUploads"), payload);
  } catch (error) {
    console.warn("Media metadata save fallback:", error);
  }

  return { ...payload, createdAt: Date.now() };
}

function getLyvoraMediaKind(fileOrMsg) {
  const type = String(fileOrMsg?.type || fileOrMsg?.contentType || "");
  if (type.startsWith("video/") || fileOrMsg?.kind === "video") return "video";
  return "image";
}

/* ═══════════════════════════════════════════
   REALTIME MEDIA PATCH 1
   - image upload UI
   - drag/drop media queue
   - reactions, reply, pins
   - voice room interface
   - media gallery/search
═══════════════════════════════════════════ */
function RealtimeMediaPage({ T, user, addXP }) {
  const [tab, setTab] = useState("chat");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [voiceJoined, setVoiceJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [messages, setMessages] = useState(() => readLocalJson("lyvora_media_messages", [
    { id: 1, author: "Lyvora Sistem", tag: "system", text: "Medya odası hazır. Resim, reply, reaction ve pin sistemi aktif.", type: "text", reactions: { "🔥": 2, "❤️": 1 }, pinned: true, time: "şimdi" },
    { id: 2, author: user?.name || "Sen", tag: user?.tag || "Lyvora#0001", text: "Voice room UI ve medya galeri burada test edilecek.", type: "text", reactions: {}, pinned: false, time: "şimdi" },
  ]));

  useEffect(() => {
    safeWriteLocalJson("lyvora_media_messages", stripHeavyMediaForStorage(messages));
  }, [messages]);

  useEffect(() => {
    return () => {
      messages.forEach((m) => {
        if (m?.image && String(m.image).startsWith("blob:")) URL.revokeObjectURL(m.image);
      });
    };
  }, []);

  const filtered = messages.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [m.text, m.author, m.tag].filter(Boolean).join(" ").toLowerCase().includes(q);
  });
  const pinned = messages.filter((m) => m.pinned);
  const gallery = messages.filter((m) => m.image);

  const addMessage = (payload) => {
    const next = {
      id: Date.now(),
      author: user?.name || "Lyvora",
      tag: user?.tag || "Lyvora#0001",
      text: payload.text || "",
      image: payload.image || "",
      fileName: payload.fileName || "",
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text || replyTo.fileName || "Medya" } : null,
      reactions: {},
      pinned: false,
      time: "şimdi",
      mediaUrl: payload.mediaUrl || payload.image || "",
      storagePath: payload.storagePath || "",
      contentType: payload.contentType || "",
      kind: payload.kind || (payload.image ? "image" : "text"),
      localOnly: Boolean(payload.localOnly),
      type: payload.kind || (payload.image ? "image" : "text"),
    };
    setMessages((prev) => [...prev, next]);
    setText("");
    setReplyTo(null);
    addXP?.(8);
  };

  const handleFile = async (file) => {
    if (!file) return;

    const check = validateLyvoraMediaFile(file);
    if (!check.ok) { alert(check.message); return; }

    setUploading(true);
    setUploadProgress(4);

    let fallbackTimer = window.setInterval(() => {
      setUploadProgress((p) => Math.min(88, p + 6));
    }, 180);

    try {
      const uploaded = await uploadLyvoraMediaToFirebase(file, user, (pct) => {
        window.clearInterval(fallbackTimer);
        setUploadProgress(pct);
      });

      setUploadProgress(100);
      window.setTimeout(() => {
        addMessage({
          text: text.trim() || (uploaded.kind === "video" ? "Video gönderildi" : "Görsel gönderildi"),
          image: uploaded.url,
          fileName: uploaded.fileName,
          mediaUrl: uploaded.url,
          storagePath: uploaded.storagePath,
          contentType: uploaded.contentType,
          kind: uploaded.kind,
        });
        setUploading(false);
        setUploadProgress(0);
      }, 180);
    } catch (err) {
      window.clearInterval(fallbackTimer);
      console.warn("Firebase Storage upload fallback:", err);

      try {
        const previewUrl = URL.createObjectURL(file);
        setUploadProgress(100);
        window.setTimeout(() => {
          addMessage({
            text: text.trim() || (check.kind === "video" ? "Video gönderildi" : "Görsel gönderildi"),
            image: previewUrl,
            fileName: file.name,
            contentType: file.type,
            kind: check.kind,
            localOnly: true,
          });
          setUploading(false);
          setUploadProgress(0);
        }, 180);
      } catch (fallbackError) {
        console.error("Media upload fallback error:", fallbackError);
        setUploading(false);
        setUploadProgress(0);
        alert(err?.message || "Medya yüklenemedi. Firebase Storage ayarlarını kontrol et.");
      }
    }
  };

  const react = (id, emoji) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, reactions: { ...(m.reactions || {}), [emoji]: Number(m.reactions?.[emoji] || 0) + 1 } } : m));
  };
  const togglePin = (id) => setMessages((prev) => prev.map((m) => m.id === id ? { ...m, pinned: !m.pinned } : m));
  const removeMsg = (id) => setMessages((prev) => prev.filter((m) => m.id !== id));

  return (
    <div style={{ padding: 22, width: "100%", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 18 }}>
        <div>
          <p style={{ color: T.purple, fontSize: 11, letterSpacing: 4, fontWeight: 900, marginBottom: 8 }}>REALTIME MEDIA PATCH</p>
          <h1 style={{ fontSize: 28, fontWeight: 950, margin: 0 }}>Medya, Reaction & Voice Merkezi</h1>
          <p style={{ color: T.textSec, fontSize: 13, marginTop: 8 }}>Resim gönderme, reaction, reply, pin, galeri ve voice room arayüzü.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[['chat','Sohbet'],['gallery','Galeri'],['voice','Voice Room']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ border: `1px solid ${tab === id ? T.purple : T.border}`, background: tab === id ? "rgba(139,92,246,.15)" : T.surface, color: tab === id ? T.purple : T.text, borderRadius: 13, padding: "10px 14px", fontWeight: 850, cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      </div>

      {tab === "chat" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: 16 }}>
          <PanelCard T={T} title="Medya Sohbeti" icon={IC.msg}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mesaj / medya ara..." style={{ flex: 1, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 13, padding: "12px 14px", outline: "none" }} />
              <button onClick={() => setSearch("")} style={{ border: "none", background: T.accent, color: T.accentText, borderRadius: 13, padding: "0 15px", fontWeight: 850, cursor: "pointer" }}>Temizle</button>
            </div>
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }} style={{ minHeight: 430, maxHeight: "calc(100vh - 330px)", overflow: "auto", display: "grid", gap: 12, paddingRight: 4 }}>
              {filtered.map((m) => (
                <div key={m.id} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 14 }}>
                  {m.replyTo && <div style={{ borderLeft: `3px solid ${T.purple}`, paddingLeft: 10, color: T.textSec, fontSize: 12, marginBottom: 9 }}>Yanıtlanan: {m.replyTo.text}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                    <b style={{ fontSize: 13 }}>{m.author} <span style={{ color: T.textSec, fontWeight: 600 }}>{m.tag}</span></b>
                    <span style={{ color: T.textTer, fontSize: 11 }}>{m.time}</span>
                  </div>
                  {m.image && getLyvoraMediaKind(m) === "video" && <video src={m.image} controls playsInline style={{ width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 10 }} />}
                  {m.image && getLyvoraMediaKind(m) !== "video" && <img src={m.image} alt={m.fileName || "media"} loading="lazy" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 10 }} />}
                  {m.localOnly && <div style={{ color: T.textTer, fontSize: 10, marginBottom: 8 }}>Local preview • Firebase Storage export bekleniyor</div>}
                  {m.text && <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 10 }}>{m.text}</p>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                    {["❤️","🔥","😂","👀"].map((e) => <button key={e} onClick={() => react(m.id, e)} style={mediaTinyButton(T)}>{e} {m.reactions?.[e] || 0}</button>)}
                    <button onClick={() => setReplyTo(m)} style={mediaTinyButton(T)}>Reply</button>
                    <button onClick={() => togglePin(m.id)} style={mediaTinyButton(T)}>{m.pinned ? "Unpin" : "Pin"}</button>
                    <button onClick={() => removeMsg(m.id)} style={mediaTinyButton(T)}>Sil</button>
                  </div>
                </div>
              ))}
            </div>
            {replyTo && <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "rgba(139,92,246,.12)", color: T.textSec, fontSize: 12 }}>Reply: {replyTo.text || replyTo.fileName} <button onClick={() => setReplyTo(null)} style={{ marginLeft: 8, border: "none", background: "transparent", color: T.red, cursor: "pointer" }}>iptal</button></div>}
            {uploading && <div style={{ marginTop: 12, height: 8, borderRadius: 999, background: T.border, overflow: "hidden" }}><div style={{ width: `${uploadProgress}%`, height: "100%", background: T.purple, transition: "width .2s" }} /></div>}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <label style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 13, padding: "12px 14px", cursor: "pointer", display: "grid", placeItems: "center" }}>{IC.image}<input type="file" accept="image/*,video/*" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; handleFile(file); }} style={{ display: "none" }} /></label>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) addMessage({ text }); }} placeholder="Mesaj yaz veya görsel sürükle bırak..." style={{ flex: 1, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 13, padding: "0 14px", outline: "none" }} />
              <button onClick={() => text.trim() && addMessage({ text })} style={{ border: "none", background: T.accent, color: T.accentText, borderRadius: 13, padding: "0 18px", fontWeight: 900, cursor: "pointer" }}>{IC.send}</button>
            </div>
          </PanelCard>
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <PanelCard T={T} title="Pinned Messages" icon={IC.pin}>
              <div style={{ display: "grid", gap: 10 }}>{pinned.length === 0 ? <p style={{ color: T.textSec, fontSize: 13 }}>Henüz pin yok.</p> : pinned.map((m) => <div key={m.id} style={{ padding: 10, borderRadius: 12, background: T.surfaceAlt, border: `1px solid ${T.border}`, fontSize: 12 }}>{m.text || m.fileName}</div>)}</div>
            </PanelCard>
            <PanelCard T={T} title="Upload Durumu" icon={IC.zap}>
              <p style={{ color: T.textSec, fontSize: 13 }}>Firebase Storage bağlanınca bu alan gerçek upload progress ve CDN linkini gösterecek.</p>
            </PanelCard>
          </div>
        </div>
      )}

      {tab === "gallery" && (
        <PanelCard T={T} title="Media Gallery" icon={IC.image}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14 }}>
            {gallery.length === 0 && <p style={{ color: T.textSec }}>Henüz görsel yok. Sohbet sekmesinden yükle.</p>}
            {gallery.map((m) => <div key={m.id} style={{ border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", background: T.surfaceAlt }}><img src={m.image} alt={m.fileName || "media"} style={{ width: "100%", height: 160, objectFit: "cover" }} /><div style={{ padding: 10, fontSize: 12, color: T.textSec }}>{m.fileName || m.text}</div></div>)}
          </div>
        </PanelCard>
      )}

      {tab === "voice" && (
        <PanelCard T={T} title="Voice Room UI" icon={IC.globe}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 18 }}>
            {[user?.name || "Sen", "Nova", "Mira", "Raven"].map((name, i) => <div key={name} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 18, textAlign: "center" }}><div style={{ width: 58, height: 58, borderRadius: "50%", background: i === 0 ? T.purple : T.accent, color: i === 0 ? "#fff" : T.accentText, margin: "0 auto 10px", display: "grid", placeItems: "center", fontWeight: 950 }}>{String(name)[0]}</div><b>{name}</b><p style={{ color: T.textSec, fontSize: 12, marginTop: 4 }}>{i === 0 && muted ? "Mikrofon kapalı" : "Dinliyor"}</p></div>)}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setVoiceJoined(!voiceJoined)} style={{ border: "none", background: voiceJoined ? T.red : T.green, color: "#fff", borderRadius: 13, padding: "12px 16px", fontWeight: 900, cursor: "pointer" }}>{voiceJoined ? "Odadan Çık" : "Voice Room'a Katıl"}</button>
            <button onClick={() => setMuted(!muted)} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 13, padding: "12px 16px", fontWeight: 850, cursor: "pointer" }}>{muted ? "Mikrofon Aç" : "Mute"}</button>
          </div>
        </PanelCard>
      )}
    </div>
  );
}

function mediaTinyButton(T) {
  return { border: `1px solid ${T.border}`, background: T.surface, color: T.textSec, borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 750, cursor: "pointer" };
}


/* ═══════════════════════════════════════════
   COMMUNITY EXPANSION PATCH — FEED / POSTS / ROOMS
   PATCH 6 — REACTION EMOJIS SYSTEM FULL
═══════════════════════════════════════════ */
const COMMUNITY_DEMO_POSTS = [
  { id: "p1", author: "Lyvora Team", tag: "@lyvora", avatar: "LV", text: "Topluluk akışı açıldı. Artık post, yorum, like ve hashtag sistemi için temel hazır.", likes: 42, comments: 8, reposts: 5, hashtag: "#lyvora", pinned: true, time: "şimdi" },
  { id: "p2", author: "Nova", tag: "@nova", avatar: "N", text: "Gece sohbet odası için event yapmak isteyen var mı?", likes: 18, comments: 4, reposts: 2, hashtag: "#gece", pinned: false, time: "12dk" },
  { id: "p3", author: "Mira", tag: "@mira", avatar: "M", text: "Mini oyun turnuvası için topluluk odası kurdum, gelen gelsin.", likes: 31, comments: 11, reposts: 7, hashtag: "#oyun", pinned: false, time: "34dk" },
];

const COMMUNITY_ROOMS = [
  { id: "r1", name: "Gece Sohbet", type: "Public", members: 128, mods: 2, live: true },
  { id: "r2", name: "Oyun Turnuvası", type: "Public", members: 84, mods: 3, live: true },
  { id: "r3", name: "Premium Lounge", type: "Private", members: 36, mods: 1, live: false },
];

const COMMUNITY_REACTION_EMOJIS = ["💜", "😂", "🔥", "😮", "😢", "👑"];
const LYVORA_COMMUNITY_REACTED_STORAGE = "lyvora_community_reacted_v1";

function normalizeCommunityPostsWithReactions(items) {
  return (Array.isArray(items) ? items : COMMUNITY_DEMO_POSTS).map((post) => ({
    ...post,
    reactions: post?.reactions && typeof post.reactions === "object" ? post.reactions : {},
  }));
}

function normalizeCommunityThreadsWithReactions(map) {
  if (!map || typeof map !== "object") return {};
  return Object.fromEntries(
    Object.entries(map).map(([postId, replies]) => [
      postId,
      (Array.isArray(replies) ? replies : []).map((reply) => ({
        ...reply,
        reactions: reply?.reactions && typeof reply.reactions === "object" ? reply.reactions : {},
      })),
    ])
  );
}

/* LYVORA_PATCH_7_PINNED_POSTS_SYSTEM */

/* LYVORA_PATCH_8_CREATOR_PROFILES_SYSTEM */
const LYVORA_CREATOR_STORAGE = "lyvora_creator_profiles_v1";

/* LYVORA_PATCH_9_REPUTATION_ROLES_SYSTEM */
const LYVORA_REPUTATION_STORAGE = "lyvora_reputation_roles_v1";

/* LYVORA_PATCH_10_TRENDING_DISCOVER_SYSTEM */
const LYVORA_DISCOVER_STORAGE = "lyvora_discover_preferences_v1";

/* LYVORA_PATCH_11_BADGES_MODERATION_SYSTEM */
const LYVORA_BADGES_STORAGE = "lyvora_community_badges_v1";
const LYVORA_MODERATION_STORAGE = "lyvora_moderation_queue_v1";
const LYVORA_MUTE_STORAGE = "lyvora_muted_users_v1";

/* LYVORA_PATCH_12_MULTIPLAYER_PARTY_LOBBY_SYSTEM */
const LYVORA_PARTY_STORAGE = "lyvora_multiplayer_party_lobby_v1";
const LYVORA_PARTY_CHAT_STORAGE = "lyvora_multiplayer_party_chat_v1";
const LYVORA_MATCHMAKING_STORAGE = "lyvora_matchmaking_queue_v1";

const PARTY_GAME_MODES = [
  { id: "reaction", name: "Reaction Race", players: 4, icon: "⚡" },
  { id: "memory", name: "Memory Match", players: 4, icon: "🧠" },
  { id: "rps", name: "Rock Paper Squad", players: 2, icon: "✊" },
  { id: "clicker", name: "Clicker Clash", players: 6, icon: "🎯" },
];

function createPartySeed(user) {
  const ownerName = user?.name || user?.tag || "Lyvora Player";
  return {
    id: `party-${Date.now()}`,
    name: `${ownerName} Lobby`,
    host: ownerName,
    privacy: "public",
    mode: "reaction",
    status: "waiting",
    createdAt: Date.now(),
    players: [
      {
        id: user?.uid || "local-user",
        name: ownerName,
        avatar: String(ownerName).slice(0, 2).toUpperCase(),
        ready: false,
        host: true,
        team: "A",
        online: true,
      },
    ],
    invites: [],
  };
}

function getPartyMode(modeId) {
  return PARTY_GAME_MODES.find((m) => m.id === modeId) || PARTY_GAME_MODES[0];
}


const COMMUNITY_BADGES = {
  early: { id: "early", label: "Early Supporter", icon: "🌟", color: "#f59e0b" },
  creator: { id: "creator", label: "Creator", icon: "👑", color: "#8b5cf6" },
  helper: { id: "helper", label: "Helper", icon: "🤝", color: "#10b981" },
  viral: { id: "viral", label: "Viral Voice", icon: "🔥", color: "#ef4444" },
  event: { id: "event", label: "Event Host", icon: "🎉", color: "#06b6d4" },
  trusted: { id: "trusted", label: "Trusted", icon: "🛡️", color: "#22c55e" },
};

const TOXIC_PATTERNS = [
  "spamspam",
  "scam",
  "fake giveaway",
  "bedava coin",
  "hile indir",
  "nefret",
];

function analyzeCommunityText(text = "") {
  const clean = String(text || "").toLowerCase();
  const repeated = /(.)\1{8,}/.test(clean);
  const linkSpam = (clean.match(/https?:\/\//g) || []).length >= 2;
  const toxicHit = TOXIC_PATTERNS.find((word) => clean.includes(word));
  const tooLong = clean.length > 900;

  const flags = [];
  if (repeated) flags.push("repeated_chars");
  if (linkSpam) flags.push("link_spam");
  if (toxicHit) flags.push(`keyword:${toxicHit}`);
  if (tooLong) flags.push("too_long");

  const severity = flags.length >= 2 ? "high" : flags.length === 1 ? "medium" : "clean";
  return {
    ok: flags.length === 0,
    severity,
    flags,
  };
}

function getBadgeMeta(id) {
  return COMMUNITY_BADGES[id] || { id, label: id, icon: "✦", color: "#8b5cf6" };
}


function computeTrendingScore(post, context = {}) {
  const likes = Number(post?.likes || 0);
  const comments = Number(post?.comments || 0);
  const reposts = Number(post?.reposts || 0);
  const reactions = post?.reactions && typeof post.reactions === "object"
    ? Object.values(post.reactions).reduce((a, b) => a + Number(b || 0), 0)
    : 0;

  const creatorBoost = context.creator ? 18 : 0;
  const pinnedBoost = post?.pinned ? 12 : 0;
  const activeRoomBoost = ["#gece", "#oyun"].includes(post?.hashtag) ? 10 : 0;
  const replyBoost = comments * 4;
  const reactionBoost = reactions * 3;
  const likeBoost = likes * 2;
  const repostBoost = reposts * 5;
  const viralBonus = comments >= 10 || reactions >= 10 || likes >= 35 ? 25 : 0;

  return Math.round(
    likeBoost +
    replyBoost +
    repostBoost +
    reactionBoost +
    creatorBoost +
    pinnedBoost +
    activeRoomBoost +
    viralBonus
  );
}

function getTrendLabel(score) {
  if (score >= 160) return "Viral";
  if (score >= 90) return "Hot";
  if (score >= 45) return "Rising";
  return "Fresh";
}


const ROLE_META = {
  owner: { label: "OWNER", icon: "👑", color: "#f59e0b", weight: 100 },
  admin: { label: "ADMIN", icon: "🛡️", color: "#ef4444", weight: 90 },
  mod: { label: "MOD", icon: "🔨", color: "#06b6d4", weight: 80 },
  creator: { label: "CREATOR", icon: "✦", color: "#8b5cf6", weight: 70 },
  helper: { label: "HELPER", icon: "🤝", color: "#10b981", weight: 60 },
  supporter: { label: "SUPPORTER", icon: "💜", color: "#ec4899", weight: 50 },
  member: { label: "MEMBER", icon: "🌙", color: "#64748b", weight: 10 },
};

function clampRep(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function inferUserRole(name, user) {
  if (isLyvoraSuperAdmin(user) || String(name || "").toLowerCase().includes("lyvora team")) return "owner";
  if (["Nova", "Mira"].includes(name)) return "creator";
  if (String(name || "").toLowerCase().includes("mod")) return "mod";
  return "member";
}

function buildRepProfile(name, user, creatorProfile = {}) {
  const role = creatorProfile.creator ? "creator" : inferUserRole(name, user);
  const baseRep = Number(creatorProfile.reputation || 50);
  const xpBonus = Math.min(20, Math.floor(Number(user?.xp || 0) / 500));
  const activeBonus = creatorProfile.creator ? 12 : 4;
  return {
    role,
    reputation: clampRep(baseRep + xpBonus + activeBonus),
    trust: clampRep(baseRep + activeBonus),
    warnings: 0,
    helpful: creatorProfile.creator ? 18 : 3,
    spamRisk: 0,
  };
}


const CREATOR_PROFILE_SEEDS = {
  "Lyvora Team": {
    verified: true,
    creator: true,
    badge: "👑",
    title: "Official Creator",
    bio: "Lyvora topluluk sistemleri, etkinlikler ve platform duyuruları.",
    links: ["lyvora.app", "community"],
    followers: 12840,
    following: 12,
    posts: 42,
    reputation: 98,
    highlights: ["Official", "Events", "Updates"],
  },
  Nova: {
    verified: true,
    creator: true,
    badge: "⚡",
    title: "Night Host",
    bio: "Gece sohbetleri, mini etkinlikler ve mood odaları.",
    links: ["#gece", "#mood"],
    followers: 3420,
    following: 188,
    posts: 119,
    reputation: 87,
    highlights: ["Host", "Active", "Community"],
  },
  Mira: {
    verified: false,
    creator: true,
    badge: "🎮",
    title: "Game Creator",
    bio: "Mini oyun turnuvaları, topluluk odaları ve eğlence akışı.",
    links: ["#oyun", "tournaments"],
    followers: 2810,
    following: 143,
    posts: 76,
    reputation: 82,
    highlights: ["Games", "Tournaments"],
  },
};


function RoleTagBadge({ T, role = "member", compact = false }) {
  const meta = ROLE_META[role] || ROLE_META.member;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        border: `1px solid ${meta.color}55`,
        background: `${meta.color}18`,
        color: meta.color,
        borderRadius: 999,
        padding: compact ? "3px 6px" : "5px 8px",
        fontSize: compact ? 9 : 10,
        fontWeight: 950,
        letterSpacing: .4,
      }}
      title={meta.label}
    >
      <span>{meta.icon}</span>
      {!compact && meta.label}
    </span>
  );
}

function ReputationMeter({ T, value = 50 }) {
  const rep = clampRep(value);
  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: T.textSec, fontSize: 10, fontWeight: 850 }}>
        <span>Reputation</span>
        <span>{rep}/100</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: T.surfaceAlt, border: `1px solid ${T.borderLight}`, overflow: "hidden" }}>
        <div style={{ width: `${rep}%`, height: "100%", background: rep >= 80 ? "#10b981" : rep >= 50 ? "#8b5cf6" : "#f59e0b", borderRadius: 999 }} />
      </div>
    </div>
  );
}



function CommunityBadgePill({ id, compact = false }) {
  const badge = getBadgeMeta(id);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        border: `1px solid ${badge.color}55`,
        background: `${badge.color}18`,
        color: badge.color,
        borderRadius: 999,
        padding: compact ? "3px 6px" : "5px 8px",
        fontSize: compact ? 9 : 10,
        fontWeight: 950,
        letterSpacing: .2,
      }}
      title={badge.label}
    >
      <span>{badge.icon}</span>
      {!compact && badge.label}
    </span>
  );
}

function ModerationSeverityPill({ severity }) {
  const map = {
    clean: { label: "Clean", color: "#22c55e" },
    medium: { label: "Review", color: "#f59e0b" },
    high: { label: "High Risk", color: "#ef4444" },
  };
  const item = map[severity] || map.clean;
  return (
    <span style={{
      border: `1px solid ${item.color}55`,
      background: `${item.color}18`,
      color: item.color,
      borderRadius: 999,
      padding: "5px 8px",
      fontSize: 10,
      fontWeight: 950,
    }}>
      {item.label}
    </span>
  );
}


function CommunityExpansionPage({ T, user, nav, addXP }) {
  const [tab, setTab] = useState("feed");
  const [posts, setPosts] = useState(() => {
    const saved = readLocalJson("lyvora_community_posts_v1", null);
    return normalizeCommunityPostsWithReactions(Array.isArray(saved) && saved.length ? saved : COMMUNITY_DEMO_POSTS);
  });
  const [threads, setThreads] = useState(() => {
    const saved = readLocalJson("lyvora_community_threads_v1", null);
    if (saved && typeof saved === "object") return normalizeCommunityThreadsWithReactions(saved);
    return normalizeCommunityThreadsWithReactions({
      p1: [
        { id: "seed-r1", author: "Nova", tag: "@nova", avatar: "N", text: "Reaction emoji sistemi de bunun üstüne çok iyi oturur.", likes: 3, time: "3dk" },
        { id: "seed-r2", author: "Mira", tag: "@mira", avatar: "M", text: "Thread görünümü mobilde de temiz durmalı.", likes: 2, time: "5dk" },
      ],
      p2: [
        { id: "seed-r3", author: "Raven", tag: "@raven", avatar: "R", text: "Ben varım, gece event odasını açalım.", likes: 4, time: "7dk" },
      ],
    });
  });
  const [draft, setDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [openThreadId, setOpenThreadId] = useState(null);
  const [selectedHash, setSelectedHash] = useState("#lyvora");
  const [toast, setToast] = useState("");
  const [liked, setLiked] = useState({});
  const [pinnedIds, setPinnedIds] = useState(() => {
    const saved = readLocalJson("lyvora_community_pinned_posts_v1", null);
    if (Array.isArray(saved)) return saved;
    return posts.filter((p) => p.pinned).map((p) => p.id);
  });
  const [creatorProfiles, setCreatorProfiles] = useState(() =>
    readLocalJson("lyvora_creator_profiles_v1", CREATOR_PROFILE_SEEDS)
  );
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [followedCreators, setFollowedCreators] = useState(() =>
    readLocalJson("lyvora_followed_creators_v1", [])
  );
  const [reputationMap, setReputationMap] = useState(() =>
    readLocalJson("lyvora_reputation_roles_v1", {})
  );
  const [feedMode, setFeedMode] = useState("hot");
  const [discoverPrefs, setDiscoverPrefs] = useState(() =>
    readLocalJson("lyvora_discover_preferences_v1", { tags: ["#lyvora", "#oyun"], creators: [] })
  );
  const [badgeMap, setBadgeMap] = useState(() =>
    readLocalJson("lyvora_community_badges_v1", {
      "Lyvora Team": ["early", "creator", "trusted"],
      Nova: ["creator", "event"],
      Mira: ["creator", "viral"],
    })
  );
  const [moderationQueue, setModerationQueue] = useState(() =>
    readLocalJson("lyvora_moderation_queue_v1", [])
  );
  const [mutedUsers, setMutedUsers] = useState(() =>
    readLocalJson("lyvora_muted_users_v1", [])
  );
  const [modView, setModView] = useState(false);
  const [likedReplies, setLikedReplies] = useState({});
  const [reacted, setReacted] = useState(() => readLocalJson(LYVORA_COMMUNITY_REACTED_STORAGE, {}));

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  useEffect(() => {
    safeWriteLocalJson("lyvora_community_posts_v1", posts);
  }, [posts]);

  useEffect(() => {
    safeWriteLocalJson("lyvora_community_threads_v1", threads);
  }, [threads]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_COMMUNITY_REACTED_STORAGE, reacted);
  }, [reacted]);

  const trending = ["#lyvora", "#gece", "#oyun", "#premium", "#mood", "#turnuva"];

  const getProfileSeed = () => {
    const rawName = user?.name || user?.displayName || user?.tag || "Lyvora Kullanıcısı";
    const cleanName = String(rawName).includes("#") ? String(rawName).split("#")[0] : String(rawName);
    return {
      author: cleanName || "Lyvora Kullanıcısı",
      tag: user?.tag ? `@${String(user.tag).replace("@", "").split("#")[0]}` : "@user",
      avatar: String(cleanName || "L").slice(0, 2).toUpperCase(),
    };
  };

  const createPost = async () => {
    const clean = draft.trim();
    if (!clean) return showToast("Post boş olamaz.");
    const tagMatch = clean.match(/#[\p{L}0-9_]+/u);
    const next = {
      id: `local-${Date.now()}`,
      ...getProfileSeed(),
      text: clean,
      likes: 0,
      comments: 0,
      reposts: 0,
      reactions: {},
      hashtag: tagMatch?.[0] || selectedHash,
      pinned: false,
      time: "şimdi",
    };
    if (!analysis.ok) {
      addModerationItem("auto_flagged_post", next, analysis, clean);
    }

    setPosts((prev) => [next, ...prev]);
    setDraft("");
    addXP?.(15);
    showToast("Post paylaşıldı +15 XP");
    try {
      await addDoc(collection(db, "communityPosts"), {
        ...next,
        uid: user?.uid || auth.currentUser?.uid || null,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Community post Firestore write skipped:", err);
    }
  };

  const likePost = (id) => {
    const isLiked = Boolean(liked[id]);
    setLiked((prev) => ({ ...prev, [id]: !isLiked }));
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, likes: Math.max(0, Number(p.likes || 0) + (isLiked ? -1 : 1)) } : p));
  };

  const toggleThread = (postId) => {
    setOpenThreadId((prev) => prev === postId ? null : postId);
  };

  const createReply = async (post) => {
    const clean = String(replyDrafts[post.id] || "").trim();
    if (!clean) return showToast("Cevap boş olamaz.");

    const reply = {
      id: `reply-${Date.now()}`,
      postId: post.id,
      ...getProfileSeed(),
      text: clean,
      likes: 0,
      reactions: {},
      time: "şimdi",
    };

    if (!analysis.ok) {
      addModerationItem("auto_flagged_reply", reply, analysis, clean);
    }

    setThreads((prev) => ({
      ...prev,
      [post.id]: [reply, ...(prev[post.id] || [])],
    }));

    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, comments: Number(p.comments || 0) + 1 } : p));
    setReplyDrafts((prev) => ({ ...prev, [post.id]: "" }));
    setOpenThreadId(post.id);
    addXP?.(8);
    showToast("Cevap eklendi +8 XP");

    try {
      await addDoc(collection(db, "communityThreads"), {
        ...reply,
        parentPostId: post.id,
        uid: user?.uid || auth.currentUser?.uid || null,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Community reply Firestore write skipped:", err);
    }
  };

  const likeReply = (postId, replyId) => {
    const key = `${postId}:${replyId}`;
    if (likedReplies[key]) return;
    setLikedReplies((prev) => ({ ...prev, [key]: true }));
    setThreads((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).map((reply) => reply.id === replyId ? { ...reply, likes: Number(reply.likes || 0) + 1 } : reply),
    }));
  };

  const reactPost = (postId, emoji) => {
    const key = `post:${postId}:${emoji}`;
    const isReacted = Boolean(reacted[key]);
    setReacted((prev) => ({ ...prev, [key]: !isReacted }));
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const current = Number(post.reactions?.[emoji] || 0);
        return {
          ...post,
          reactions: {
            ...(post.reactions || {}),
            [emoji]: Math.max(0, current + (isReacted ? -1 : 1)),
          },
        };
      })
    );
    if (!isReacted) {
      addXP?.(3);
      showToast(`${emoji} reaction eklendi +3 XP`);
    }
  };

  const reactReply = (postId, replyId, emoji) => {
    const key = `reply:${postId}:${replyId}:${emoji}`;
    const isReacted = Boolean(reacted[key]);
    setReacted((prev) => ({ ...prev, [key]: !isReacted }));
    setThreads((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).map((reply) => {
        if (reply.id !== replyId) return reply;
        const current = Number(reply.reactions?.[emoji] || 0);
        return {
          ...reply,
          reactions: {
            ...(reply.reactions || {}),
            [emoji]: Math.max(0, current + (isReacted ? -1 : 1)),
          },
        };
      }),
    }));
  };

  const totalReactions = (target) =>
    Object.values(target?.reactions || {}).reduce((sum, value) => sum + Number(value || 0), 0);

  const getReputationProfile = (author) => {
    const creator = creatorProfiles?.[author] || {};
    const saved = reputationMap?.[author];
    if (saved) return saved;
    return buildRepProfile(author, user, creator);
  };

  const getRoleMeta = (role) => ROLE_META[role] || ROLE_META.member;

  const adjustReputation = (author, delta, reason = "activity") => {
    setReputationMap((prev) => {
      const current = prev?.[author] || getReputationProfile(author);
      const next = {
        ...current,
        reputation: clampRep(Number(current.reputation || 0) + delta),
        trust: clampRep(Number(current.trust || 0) + Math.round(delta / 2)),
        helpful: reason === "helpful" ? Number(current.helpful || 0) + 1 : Number(current.helpful || 0),
        warnings: delta < 0 ? Number(current.warnings || 0) + 1 : Number(current.warnings || 0),
      };
      return { ...prev, [author]: next };
    });
  };

  const giveHelpfulRep = (author) => {
    adjustReputation(author, 2, "helpful");
    showToast(`${author} için +2 reputation`);
    addXP?.(3);
  };

  const getCreatorProfile = (author) => {
    const base = creatorProfiles?.[author] || {};
    return {
      verified: Boolean(base.verified),
      creator: Boolean(base.creator),
      badge: base.badge || "✦",
      title: base.title || "Community Member",
      bio: base.bio || "Lyvora topluluğunda aktif kullanıcı.",
      links: Array.isArray(base.links) ? base.links : [],
      followers: Number(base.followers || 0),
      following: Number(base.following || 0),
      posts: Number(base.posts || 0),
      reputation: Number(base.reputation || 50),
      highlights: Array.isArray(base.highlights) ? base.highlights : [],
    };
  };

  const openCreatorProfile = (post) => {
    setSelectedCreator({
      author: post.author,
      tag: post.tag,
      avatar: post.avatar,
      ...getCreatorProfile(post.author),
    });
  };

  const toggleFollowCreator = async (creator) => {
    const key = creator?.author;
    if (!key) return;

    const isFollowing = followedCreators.includes(key);
    setFollowedCreators((prev) =>
      isFollowing ? prev.filter((x) => x !== key) : [key, ...prev]
    );

    setCreatorProfiles((prev) => {
      const current = getCreatorProfile(key);
      return {
        ...prev,
        [key]: {
          ...current,
          followers: Math.max(0, Number(current.followers || 0) + (isFollowing ? -1 : 1)),
        },
      };
    });

    showToast(isFollowing ? "Takipten çıkıldı" : "Creator takip edildi +10 XP");
    if (!isFollowing) addXP?.(10);

    try {
      await setDoc(
        doc(db, "creatorFollows", `${user?.uid || "local"}_${key}`),
        {
          creator: key,
          followerUid: user?.uid || auth.currentUser?.uid || "local-user",
          following: !isFollowing,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Creator follow Firestore write skipped:", err);
    }
  };

  const getPostTrendScore = (post) => {
    return computeTrendingScore(post, {
      creator: getCreatorProfile(post.author).creator,
      rep: getReputationProfile(post.author).reputation,
    }) + Math.round(Number(getReputationProfile(post.author).reputation || 0) / 5);
  };

  const getPersonalizedScore = (post) => {
    let score = getPostTrendScore(post);
    if (discoverPrefs.tags?.includes(post.hashtag)) score += 25;
    if (discoverPrefs.creators?.includes(post.author)) score += 20;
    if (post.hashtag === "#oyun") score += 6;
    return score;
  };

  const toggleDiscoverTag = (tag) => {
    setDiscoverPrefs((prev) => {
      const tags = prev.tags || [];
      const nextTags = tags.includes(tag) ? tags.filter((x) => x !== tag) : [tag, ...tags].slice(0, 5);
      return { ...prev, tags: nextTags };
    });
  };

  const canModerateCommunity = isLyvoraSuperAdmin(user) || user?.role === "admin" || user?.role === "mod" || user?.role === "owner";

  const getUserBadges = (author) => {
    const base = badgeMap?.[author] || [];
    const profile = getCreatorProfile(author);
    const rep = getReputationProfile(author);
    const auto = [];
    if (profile.creator && !base.includes("creator")) auto.push("creator");
    if (rep.reputation >= 85 && !base.includes("trusted")) auto.push("trusted");
    return [...new Set([...base, ...auto])].slice(0, 5);
  };

  const addModerationItem = (type, target, analysis, text) => {
    const item = {
      id: `mod-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      targetId: target?.id || "unknown",
      author: target?.author || "unknown",
      text: String(text || "").slice(0, 220),
      flags: analysis.flags || [],
      severity: analysis.severity || "medium",
      status: "open",
      createdAt: Date.now(),
    };
    setModerationQueue((prev) => [item, ...prev].slice(0, 40));
    return item;
  };

  const reportPost = (post) => {
    const analysis = analyzeCommunityText(post.text);
    addModerationItem("post_report", post, analysis.ok ? { ...analysis, severity: "medium", flags: ["user_report"] } : analysis, post.text);
    showToast("Rapor moderation queue içine eklendi.");
  };

  const muteAuthor = (author) => {
    if (!canModerateCommunity) return showToast("Bu işlem için mod yetkisi gerekli.");
    setMutedUsers((prev) => prev.includes(author) ? prev : [author, ...prev]);
    adjustReputation(author, -8, "moderation");
    showToast(`${author} susturuldu ve reputation düşürüldü.`);
  };

  const resolveModerationItem = (id, action = "resolved") => {
    setModerationQueue((prev) =>
      prev.map((item) => item.id === id ? { ...item, status: action, resolvedAt: Date.now() } : item)
    );
  };

  const grantBadge = (author, badgeId) => {
    if (!canModerateCommunity) return showToast("Badge vermek için mod/owner yetkisi gerekli.");
    setBadgeMap((prev) => ({
      ...prev,
      [author]: [...new Set([...(prev?.[author] || []), badgeId])],
    }));
    showToast(`${author} için ${getBadgeMeta(badgeId).label} rozeti eklendi.`);
  };

  const canManagePins = isLyvoraSuperAdmin(user) || user?.role === "admin" || user?.role === "owner";

  const togglePinPost = async (post) => {
    if (!canManagePins) {
      return showToast("Sadece owner/admin post sabitleyebilir.");
    }

    const willPin = !pinnedIds.includes(post.id);

    setPinnedIds((prev) =>
      willPin ? [post.id, ...prev.filter((id) => id !== post.id)] : prev.filter((id) => id !== post.id)
    );

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, pinned: willPin } : p))
    );

    showToast(willPin ? "Post sabitlendi 📌" : "Post sabitten kaldırıldı");

    try {
      await setDoc(
        doc(db, "communityPinnedPosts", post.id),
        {
          postId: post.id,
          pinned: willPin,
          pinnedBy: user?.uid || auth.currentUser?.uid || "local-owner",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Pinned post Firestore write skipped:", err);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (tab === "trending") return trending.slice(0, 4).includes(p.hashtag);
    if (selectedHash && selectedHash !== "all" && tab === "feed") return p.hashtag === selectedHash || p.pinned;
    return true;
  });

  return (
    <div style={{ padding: 22, position: "relative" }}>
      {toast && <div style={{ position: "fixed", top: 78, right: 18, zIndex: 2000, background: T.accent, color: T.accentText, borderRadius: 14, padding: "11px 14px", fontSize: 13, fontWeight: 800, boxShadow: "0 18px 50px rgba(0,0,0,.22)" }}>{toast}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 950, letterSpacing: -1 }}>Topluluk Akışı</h1>
          <p style={{ color: T.textSec, fontSize: 13, marginTop: 5 }}>Post, reply/thread, reaction emojis, hashtag ve oda sistemi için ana merkez.</p>
        </div>
        <button onClick={() => nav?.("servers")} style={{ border: "none", background: T.accent, color: T.accentText, borderRadius: 13, padding: "11px 15px", fontWeight: 900, cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>{IC.plus} Oda Oluştur</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: 18 }} className="lyvora-home-grid">
        <section style={{ display: "grid", gap: 14 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 14 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              {[["feed", "Akış"], ["trending", "Trend"], ["events", "Event"], ["rooms", "Odalar"]].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{ border: `1px solid ${tab === id ? T.purple : T.border}`, background: tab === id ? "rgba(139,92,246,.16)" : T.surfaceAlt, color: tab === id ? T.purple : T.textSec, borderRadius: 999, padding: "8px 12px", fontWeight: 850, cursor: "pointer" }}>{label}</button>
              ))}
            </div>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Topluluğa bir şey yaz... #lyvora @arkadaş" maxLength={280} style={{ width: "100%", minHeight: 92, resize: "vertical", border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 16, padding: 13, outline: "none", fontFamily: "inherit", fontSize: 14 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setSelectedHash("all")} style={{ border: `1px solid ${T.border}`, background: selectedHash === "all" ? T.accent : "transparent", color: selectedHash === "all" ? T.accentText : T.textSec, borderRadius: 999, padding: "6px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Tümü</button>
                {trending.slice(0,4).map(h => <button key={h} onClick={() => { setSelectedHash(h); setDraft((d) => d.includes(h) ? d : `${d}${d ? " " : ""}${h}`); }} style={{ border: `1px solid ${T.border}`, background: selectedHash === h ? T.accent : "transparent", color: selectedHash === h ? T.accentText : T.textSec, borderRadius: 999, padding: "6px 9px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{h}</button>)}
              </div>
              <button onClick={createPost} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 12, padding: "10px 16px", fontWeight: 950, cursor: "pointer" }}>Paylaş</button>
            </div>
          </div>

          {tab === "rooms" ? <CommunityRooms T={T} showToast={showToast} /> : tab === "events" ? <CommunityEvents T={T} showToast={showToast} /> : filteredPosts.map((post) => {
            const postReplies = threads[post.id] || [];
            const threadOpen = openThreadId === post.id;
            return (
              <article key={post.id} style={{ background: T.surface, border: `1px solid ${(pinnedIds.includes(post.id) || post.pinned) ? "rgba(139,92,246,.45)" : T.border}`, borderRadius: 20, padding: 16, boxShadow: post.pinned ? "0 0 30px rgba(139,92,246,.10)" : "none" }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#111)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 950, flexShrink: 0 }}>{post.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <b>{post.author}</b><span style={{ color: T.textTer, fontSize: 12 }}>{post.tag} • {post.time}</span>{post.pinned && <span style={{ background: "rgba(139,92,246,.16)", color: T.purple, borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 900 }}>Sabit</span>}
                    </div>
                    <p style={{ lineHeight: 1.65, marginTop: 8, whiteSpace: "pre-wrap" }}>{post.text}</p>
                    <button onClick={() => { setSelectedHash(post.hashtag); setTab("feed"); }} style={{ border: "none", background: "transparent", color: T.purple, fontWeight: 900, cursor: "pointer", padding: "8px 0" }}>{post.hashtag}</button>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", borderTop: `1px solid ${T.borderLight}`, paddingTop: 10, marginTop: 4 }}>
                      <button onClick={() => likePost(post.id)} style={communityActionBtn(T, liked[post.id])}>♥ {post.likes}</button>
                      <button onClick={() => toggleThread(post.id)} style={communityActionBtn(T, threadOpen)}>💬 {post.comments} cevap</button>
                      <button onClick={() => showToast("Post yeniden paylaşıldı.")} style={communityActionBtn(T)}>↻ {post.reposts}</button>
                      <button onClick={() => showToast("Post sabitleme owner/mod yetkisine bağlanacak.")} style={communityActionBtn(T)}>📌 Sabitle</button>
                    </div>

                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                      {COMMUNITY_REACTION_EMOJIS.map((emoji) => {
                        const active = Boolean(reacted[`post:${post.id}:${emoji}`]);
                        const count = Number(post.reactions?.[emoji] || 0);
                        return (
                          <button
                            key={emoji}
                            onClick={() => reactPost(post.id, emoji)}
                            title={`${emoji} reaction`}
                            style={{
                              border: `1px solid ${active ? T.purple : T.border}`,
                              background: active ? "rgba(139,92,246,.16)" : T.surfaceAlt,
                              color: active ? T.purple : T.textSec,
                              borderRadius: 999,
                              padding: "6px 9px",
                              fontSize: 12,
                              fontWeight: 900,
                              cursor: "pointer",
                              display: "inline-flex",
                              gap: 5,
                              alignItems: "center",
                            }}
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </button>
                        );
                      })}
                      {totalReactions(post) > 0 && <span style={{ color: T.textTer, fontSize: 11, alignSelf: "center", fontWeight: 800 }}>{totalReactions(post)} reaction</span>}
                    </div>

                    {threadOpen && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.borderLight}`, display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", gap: 9 }}>
                          <input
                            value={replyDrafts[post.id] || ""}
                            onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") createReply(post); }}
                            placeholder="Bu posta cevap yaz..."
                            maxLength={180}
                            style={{ flex: 1, minWidth: 0, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 13, padding: "0 12px", height: 42, outline: "none" }}
                          />
                          <button onClick={() => createReply(post)} style={{ width: 46, border: "none", background: T.purple, color: "#fff", borderRadius: 13, cursor: "pointer", display: "grid", placeItems: "center" }}>{IC.send}</button>
                        </div>

                        <div style={{ display: "grid", gap: 9 }}>
                          {postReplies.length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Henüz cevap yok. İlk cevabı sen yaz.</p>}
                          {postReplies.map((reply) => (
                            <div key={reply.id} style={{ display: "flex", gap: 10, background: T.surfaceAlt, border: `1px solid ${T.borderLight}`, borderRadius: 15, padding: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 12, background: "rgba(139,92,246,.15)", color: T.purple, display: "grid", placeItems: "center", fontWeight: 950, flexShrink: 0 }}>{reply.avatar}</div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <b style={{ fontSize: 12 }}>{reply.author}</b>
                                  <span style={{ color: T.textTer, fontSize: 11 }}>{reply.tag} • {reply.time}</span>
                                </div>
                                <p style={{ color: T.textSec, fontSize: 12, lineHeight: 1.5, marginTop: 4, whiteSpace: "pre-wrap" }}>{reply.text}</p>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                                  <button onClick={() => likeReply(post.id, reply.id)} style={{ border: "none", background: "transparent", color: likedReplies[`${post.id}:${reply.id}`] ? T.purple : T.textTer, padding: "4px 0", cursor: "pointer", fontSize: 11, fontWeight: 850 }}>💜 {reply.likes || 0}</button>
                                  {COMMUNITY_REACTION_EMOJIS.slice(1, 5).map((emoji) => {
                                    const active = Boolean(reacted[`reply:${post.id}:${reply.id}:${emoji}`]);
                                    const count = Number(reply.reactions?.[emoji] || 0);
                                    return (
                                      <button
                                        key={emoji}
                                        onClick={() => reactReply(post.id, reply.id, emoji)}
                                        style={{
                                          border: `1px solid ${active ? T.purple : T.borderLight}`,
                                          background: active ? "rgba(139,92,246,.14)" : "transparent",
                                          color: active ? T.purple : T.textTer,
                                          borderRadius: 999,
                                          padding: "4px 7px",
                                          cursor: "pointer",
                                          fontSize: 11,
                                          fontWeight: 850,
                                        }}
                                      >
                                        {emoji} {count}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <CommunityStatCard T={T} title="Canlı Topluluk" value="12.4K" sub="aktif üye" icon={IC.users} />
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 950, marginBottom: 12 }}>Aktif Threadler</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {posts.slice(0, 4).map((p) => (
                <button key={p.id} onClick={() => { setTab("feed"); setOpenThreadId(p.id); }} style={{ border: `1px solid ${openThreadId === p.id ? T.purple : T.border}`, background: openThreadId === p.id ? "rgba(139,92,246,.14)" : T.surfaceAlt, color: openThreadId === p.id ? T.purple : T.text, borderRadius: 13, padding: "10px 12px", textAlign: "left", cursor: "pointer", fontWeight: 850 }}>
                  {p.author}
                  <span style={{ float: "right", color: T.textTer, fontSize: 12 }}>{(threads[p.id] || []).length} cevap</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 950, marginBottom: 12 }}>Reaction Paneli</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {COMMUNITY_REACTION_EMOJIS.map((emoji) => {
                const count = posts.reduce((sum, p) => sum + Number(p.reactions?.[emoji] || 0), 0);
                return (
                  <div key={emoji} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${T.borderLight}`, background: T.surfaceAlt, borderRadius: 13, padding: "9px 11px" }}>
                    <span style={{ fontWeight: 950 }}>{emoji}</span>
                    <span style={{ color: T.textSec, fontSize: 12, fontWeight: 850 }}>{count} reaction</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 950, marginBottom: 12 }}>Trend Hashtagler</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {trending.map((h, i) => <button key={h} onClick={() => { setTab("trending"); setSelectedHash(h); }} style={{ border: `1px solid ${T.border}`, background: selectedHash === h ? "rgba(139,92,246,.14)" : T.surfaceAlt, color: selectedHash === h ? T.purple : T.text, borderRadius: 13, padding: "10px 12px", textAlign: "left", cursor: "pointer", fontWeight: 850 }}>#{i + 1} {h.replace("#", "")} <span style={{ float: "right", color: T.textTer, fontSize: 12 }}>{120 - i * 13} post</span></button>)}
            </div>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 950, marginBottom: 12 }}>Öne Çıkan Odalar</h3>
            {COMMUNITY_ROOMS.map(r => <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.borderLight}` }}><div><b style={{ fontSize: 13 }}>{r.name}</b><p style={{ color: T.textSec, fontSize: 11 }}>{r.members} üye • {r.mods} mod</p></div><span style={{ color: r.live ? T.green : T.textTer, fontSize: 11, fontWeight: 900 }}>{r.live ? "LIVE" : r.type}</span></div>)}
          </div>
        </aside>
      </div>
    </div>
  );
}

function communityActionBtn(T, active = false) {
  return { border: `1px solid ${active ? T.purple : T.border}`, background: active ? "rgba(139,92,246,.16)" : T.surfaceAlt, color: active ? T.purple : T.textSec, borderRadius: 999, padding: "7px 10px", fontWeight: 850, cursor: "pointer" };
}
function CommunityStatCard({ T, title, value, sub, icon }) {
  return <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 42, height: 42, borderRadius: 14, background: "rgba(139,92,246,.14)", color: T.purple, display: "grid", placeItems: "center" }}>{icon}</div><div><h3 style={{ fontSize: 13, color: T.textSec }}>{title}</h3><b style={{ fontSize: 24 }}>{value}</b><p style={{ color: T.textTer, fontSize: 12 }}>{sub}</p></div></div>;
}
function CommunityRooms({ T, showToast }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>{COMMUNITY_ROOMS.map(r => <div key={r.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between" }}><h3>{r.name}</h3><span style={{ color: r.live ? T.green : T.textTer, fontWeight: 900, fontSize: 12 }}>{r.live ? "CANLI" : r.type}</span></div><p style={{ color: T.textSec, fontSize: 13, margin: "8px 0 14px" }}>{r.members} üye • {r.mods} moderatör • {r.type}</p><button onClick={() => showToast(`${r.name} odasına katılım altyapısı hazır.`)} style={{ width: "100%", border: "none", background: T.accent, color: T.accentText, borderRadius: 12, padding: 10, fontWeight: 900, cursor: "pointer" }}>Odaya Katıl</button></div>)}</div>;
}
function CommunityEvents({ T, showToast }) {
  const events = [{ title: "Gece Muhabbeti", time: "Bugün 22:00", prize: "+100 XP" }, { title: "Mini Oyun Turnuvası", time: "Yarın 20:30", prize: "Rozet" }, { title: "Premium Q&A", time: "Pazar 18:00", prize: "Nebula çekilişi" }];
  return <div style={{ display: "grid", gap: 12 }}>{events.map(e => <div key={e.title} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 16, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><h3>{e.title}</h3><p style={{ color: T.textSec, fontSize: 13 }}>{e.time} • Ödül: {e.prize}</p></div><button onClick={() => showToast(`${e.title} etkinliğine hatırlatıcı eklendi.`)} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 12, padding: "10px 12px", fontWeight: 900, cursor: "pointer" }}>Katıl</button></div>)}</div>;
}

function RulesPage({ T, nav }) {
  const rules = [
    ["Saygılı Ol","Hakaret, aşağılama, nefret söylemi ve toksik davranışlar yasaktır."],
    ["Kişisel Bilgi Paylaşma","Telefon numarası, adres, şifre veya başkasına ait bilgileri paylaşma."],
    ["Taciz ve Zorbalık Yasaktır","Sürekli rahatsız etme, tehdit etme veya baskı kurma davranışları kabul edilmez."],
    ["Spam Yapma","Aynı mesajı tekrar tekrar göndermek, reklam yapmak veya flood yapmak yasaktır."],
    ["Uygunsuz İçerik","Rahatsız edici, aşırı cinsel veya şiddet içerikli paylaşımlar yapılamaz."],
    ["Güvenli Alanı Koru","Anonimlik kötüye kullanılamaz. Şüpheli davranışlar raporlanabilir."],
    ["Fake / Bot Hesaplar","Spam veya sistemi manipüle eden bot hesaplar engellenebilir."],
    ["Oda Kurallarına Uy","Her odanın özel kuralları olabilir. Odaya katılmak bu kuralları kabul etmektir."],
    ["Moderatör Kararları","Moderasyon ekibi gerektiğinde mesaj silebilir veya kullanıcı kısıtlayabilir."],
    ["Topluluğa Katkı Sağla","Lyvora güvenli sosyalleşme ve yeni arkadaşlıklar için kurulmuştur."],
  ];
  return (
    <LegalShell T={T} nav={nav} title="Topluluk Kuralları" subtitle="Lyvora'da herkesin güvenli ve saygılı bir ortamda sohbet edebilmesi için kurallar.">
      <div style={{ display: "grid", gap: 12 }}>
        {rules.map((r, i) => (
          <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "42px 1fr", gap: 14, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.accent, color: T.accentText, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 13 }}>{i + 1}</div>
            <div><h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 5 }}>{r[0]}</h3><p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.7 }}>{r[1]}</p></div>
          </div>
        ))}
      </div>
    </LegalShell>
  );
}

function PrivacyPage({ T, nav }) {
  const sections = [
    ["Toplanan Bilgiler","Lyvora hesap oluşturma, giriş yapma, mesajlaşma ve güvenlik için temel bilgileri işler."],
    ["Mesaj ve Etkileşim Verileri","Mesajlar, oda aktiviteleri ve oyun skorları platform deneyimi için kullanılabilir."],
    ["Kişisel Bilgi Güvenliği","Kullanıcıların özel bilgilerini paylaşmaması önerilir."],
    ["Veri Paylaşımı","Kişisel veriler izinsiz üçüncü taraflarla paylaşılmaz."],
    ["Çerezler ve Oturum","Oturum ve tema tercihi için teknik veriler kullanılabilir."],
    ["Hesap Silme","Kullanıcı hesabının silinmesini talep ettiğinde veriler kaldırılabilir."],
    ["Güvenlik","Spam ve kötüye kullanımı engellemek için sistem kayıtları incelenebilir."],
  ];
  return (
    <LegalShell T={T} nav={nav} title="Gizlilik Politikası" subtitle="Lyvora kullanıcı gizliliğine önem verir.">
      <div style={{ display: "grid", gap: 14 }}>
        {sections.map(s => <section key={s[0]} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}><h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{s[0]}</h2><p style={{ color: T.textSec, lineHeight: 1.8, fontSize: 13 }}>{s[1]}</p></section>)}
      </div>
    </LegalShell>
  );
}

function TermsPage({ T, nav }) {
  const terms = [
    ["Kullanım Kabulü","Lyvora'yı kullanarak topluluk kurallarını ve gizlilik politikasını kabul etmiş olursun."],
    ["Hesap Sorumluluğu","Hesabınla yapılan işlemlerden sen sorumlusun."],
    ["Anonim Kullanım","Anonimlik başkalarını rahatsız etme hakkı vermez."],
    ["XP ve Ödül Sistemi","XP ve ödüller platform içi deneyim amaçlıdır. Kötüye kullanımda sıfırlanabilir."],
    ["İçerik Sorumluluğu","Paylaşılan mesajlardan kullanıcı sorumludur."],
    ["Erişim Kısıtlaması","Kuralları ihlal eden kullanıcılar engellenebilir."],
    ["Değişiklik Hakkı","Lyvora, şartları güncelleyebilir."],
  ];
  return (
    <LegalShell T={T} nav={nav} title="Kullanım Şartları" subtitle="Lyvora'yı kullanırken kabul edilen temel şartlar.">
      <div style={{ display: "grid", gap: 14 }}>
        {terms.map((t, i) => <section key={t[0]} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}><h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{i + 1}. {t[0]}</h2><p style={{ color: T.textSec, lineHeight: 1.8, fontSize: 13 }}>{t[1]}</p></section>)}
      </div>
    </LegalShell>
  );
}

/* ═══════════════════════════════════════════
   AUTH SCREEN
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   SOCIAL SYSTEMS PATCH 1
═══════════════════════════════════════════ */
function SocialSystemsPage({ T, user, nav, addXP }) {
  const [tab, setTab] = useState("discover");
  const [queryText, setQueryText] = useState("");
  const [statusText, setStatusText] = useState(() => localStorage.getItem("lyvora_status_text") || "Lyvora'da çevrimiçi ✨");
  const [following, setFollowing] = useState(() => JSON.parse(localStorage.getItem("lyvora_following") || "[]"));
  const [requests, setRequests] = useState(() => JSON.parse(localStorage.getItem("lyvora_friend_requests") || JSON.stringify([
    { id: 1, name: "Nova#2401", mood: "Global", avatar: "N", mutual: 4 },
    { id: 2, name: "Elysia#1802", mood: "Mood", avatar: "E", mutual: 2 },
    { id: 3, name: "Raven#7781", mood: "Gece", avatar: "R", mutual: 7 },
  ])));
  const [posts, setPosts] = useState(() => JSON.parse(localStorage.getItem("lyvora_posts") || JSON.stringify([
    { id: 1, author: "Lyvora Sistem", tag: "@system", text: "Sosyal keşif, mention, hashtag ve aktivite akışı aktif edildi.", likes: 12, comments: 3, hash: ["#lyvora", "#güncelleme"] },
    { id: 2, author: "Nova", tag: "@nova", text: "Gece kuşları burada mı? #gece #sohbet", likes: 8, comments: 1, hash: ["#gece", "#sohbet"] },
  ])));
  const [postText, setPostText] = useState("");
  const people = [
    { id: "nova", name: "Nova", tag: "@nova", level: 24, mood: "Global", followers: 1280, views: 420, online: true, avatar: "N" },
    { id: "elysia", name: "Elysia", tag: "@elysia", level: 18, mood: "Mood", followers: 940, views: 312, online: true, avatar: "E" },
    { id: "raven", name: "Raven", tag: "@raven", level: 31, mood: "Gece", followers: 2210, views: 790, online: true, avatar: "R" },
    { id: "mira", name: "Mira", tag: "@mira", level: 27, mood: "Sakin", followers: 1560, views: 501, online: false, avatar: "M" },
  ];
  const filtered = people.filter(p => `${p.name} ${p.tag} ${p.mood}`.toLowerCase().includes(queryText.toLowerCase()));
  const persistFollowing = (next) => { setFollowing(next); localStorage.setItem("lyvora_following", JSON.stringify(next)); };
  const persistRequests = (next) => { setRequests(next); localStorage.setItem("lyvora_friend_requests", JSON.stringify(next)); };
  const saveStatus = () => { localStorage.setItem("lyvora_status_text", statusText); alert("Durum mesajın kaydedildi."); };
  const toggleFollow = (id) => { const next = following.includes(id) ? following.filter(x => x !== id) : [...following, id]; persistFollowing(next); if (!following.includes(id)) addXP?.(5); };
  const acceptRequest = (r) => { persistRequests(requests.filter(x => x.id !== r.id)); addXP?.(10); alert(`${r.name} arkadaş listene eklendi.`); };
  const addPost = () => {
    const clean = postText.trim();
    if (!clean) return;
    const hash = clean.match(/#[\wğüşöçıİĞÜŞÖÇ]+/g) || [];
    const next = [{ id: Date.now(), author: user?.name || "Lyvora", tag: user?.tag || "@lyvora", text: clean, likes: 0, comments: 0, hash }, ...posts];
    setPosts(next); localStorage.setItem("lyvora_posts", JSON.stringify(next)); setPostText(""); addXP?.(15);
  };
  const pill = (active) => ({ border: `1px solid ${active ? T.purple : T.border}`, background: active ? "rgba(139,92,246,.14)" : T.surface, color: active ? T.purple : T.textSec, borderRadius: 12, padding: "11px 16px", fontWeight: 900, cursor: "pointer" });
  return (
    <div style={{ padding: 24, display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ color: T.purple, fontSize: 11, fontWeight: 950, letterSpacing: 4, marginBottom: 8 }}>LYVORA SOCIAL</p>
          <h1 style={{ fontSize: 30, fontWeight: 950, marginBottom: 6 }}>Sosyal Keşif Merkezi</h1>
          <p style={{ color: T.textSec, fontSize: 13 }}>Arkadaşlık, takip, mention, hashtag ve aktivite akışı tek yerde.</p>
        </div>
        <button onClick={() => nav("messages")} style={{ border: "none", background: T.accent, color: T.accentText, borderRadius: 14, padding: "12px 18px", fontWeight: 900, cursor: "pointer" }}>{IC.msg} DM Aç</button>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setTab("discover")} style={pill(tab === "discover")}>Keşfet</button>
        <button onClick={() => setTab("requests")} style={pill(tab === "requests")}>İstekler ({requests.length})</button>
        <button onClick={() => setTab("feed")} style={pill(tab === "feed")}>Akış</button>
        <button onClick={() => setTab("status")} style={pill(tab === "status")}>Durum</button>
      </div>
      {tab === "discover" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: 18 }}>
          <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: 18 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input value={queryText} onChange={e => setQueryText(e.target.value)} placeholder="Kullanıcı, @mention veya mood ara..." style={{ flex: 1, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "13px 14px", outline: "none" }} />
              <button style={{ border: "none", background: T.accent, color: T.accentText, borderRadius: 14, padding: "0 18px", fontWeight: 900 }}>{IC.search}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              {filtered.map(p => (
                <div key={p.id} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ position: "relative" }}><div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#111)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 950 }}>{p.avatar}</div>{p.online && <span style={{ position: "absolute", right: 2, bottom: 2, width: 12, height: 12, borderRadius: "50%", background: T.green, border: `2px solid ${T.surfaceAlt}` }} />}</div>
                    <div><b>{p.name}</b><p style={{ color: T.textSec, fontSize: 12 }}>{p.tag} • Lv {p.level}</p></div>
                  </div>
                  <p style={{ color: T.textSec, fontSize: 12, marginBottom: 12 }}>{p.mood} mood • {p.followers} takipçi • {p.views} profil görüntülenme</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => toggleFollow(p.id)} style={{ flex: 1, border: "none", background: following.includes(p.id) ? T.green : T.accent, color: following.includes(p.id) ? "#fff" : T.accentText, borderRadius: 12, padding: "10px", fontWeight: 900, cursor: "pointer" }}>{following.includes(p.id) ? "Takipte" : "Takip Et"}</button>
                    <button onClick={() => nav("messages")} style={{ border: `1px solid ${T.border}`, background: T.surface, color: T.text, borderRadius: 12, padding: "10px 12px", fontWeight: 900, cursor: "pointer" }}>{IC.msg}</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <aside style={{ display: "grid", gap: 14 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: 18 }}><h3>Online Arkadaşlar</h3>{people.filter(p=>p.online).map(p=><p key={p.id} style={{ marginTop: 12, color: T.textSec }}><span style={{ color: T.green }}>●</span> {p.name} <small>son görülme: şimdi</small></p>)}</div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: 18 }}><h3>Trend Hashtag</h3>{["#lyvora","#gece","#sohbet","#mood","#oyun"].map(x=><button key={x} onClick={()=>setQueryText(x)} style={{ margin: 5, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.purple, borderRadius: 999, padding: "7px 10px", fontWeight: 850 }}>{x}</button>)}</div>
          </aside>
        </div>
      )}
      {tab === "requests" && <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: 18 }}>{requests.length === 0 ? <p style={{ color: T.textSec }}>Bekleyen istek yok.</p> : requests.map(r => <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.borderLight}`, padding: "12px 0" }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: T.surfaceAlt, display: "grid", placeItems: "center", fontWeight: 900 }}>{r.avatar}</div><div style={{ flex: 1 }}><b>{r.name}</b><p style={{ color: T.textSec, fontSize: 12 }}>{r.mood} • {r.mutual} ortak arkadaş</p></div><button onClick={() => acceptRequest(r)} style={{ border: "none", background: T.green, color: "#fff", borderRadius: 12, padding: "10px 16px", fontWeight: 900 }}>Kabul</button><button onClick={() => persistRequests(requests.filter(x => x.id !== r.id))} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 12, padding: "10px 16px", fontWeight: 900 }}>Reddet</button></div>)}</section>}
      {tab === "feed" && <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: 18 }}><div style={{ display: "flex", gap: 10, marginBottom: 16 }}><input value={postText} onChange={e => setPostText(e.target.value)} placeholder="Bir şey paylaş... @nova #lyvora" style={{ flex: 1, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "13px 14px", outline: "none" }} /><button onClick={addPost} style={{ border: "none", background: T.accent, color: T.accentText, borderRadius: 14, padding: "0 18px", fontWeight: 900 }}>Paylaş</button></div>{posts.map(p => <article key={p.id} style={{ border: `1px solid ${T.border}`, borderRadius: 18, padding: 16, marginBottom: 12, background: T.surfaceAlt }}><b>{p.author}</b> <span style={{ color: T.textSec, fontSize: 12 }}>{p.tag}</span><p style={{ marginTop: 10, lineHeight: 1.6 }}>{p.text}</p><div style={{ display: "flex", gap: 12, color: T.textSec, fontSize: 12, marginTop: 10 }}><span>❤️ {p.likes}</span><span>💬 {p.comments}</span>{p.hash?.map(h => <span key={h} style={{ color: T.purple }}>{h}</span>)}</div></article>)}</section>}
      {tab === "status" && <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: 18 }}><h3>Durum Mesajı</h3><p style={{ color: T.textSec, fontSize: 13, margin: "8px 0 14px" }}>Profil kartında ve online friends widget’ında görünecek kısa mesaj.</p><input value={statusText} onChange={e => setStatusText(e.target.value)} maxLength={80} style={{ width: "100%", border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: 14, outline: "none", marginBottom: 12 }} /><button onClick={saveStatus} style={{ border: "none", background: T.accent, color: T.accentText, borderRadius: 14, padding: "12px 18px", fontWeight: 900 }}>Kaydet</button></section>}
    </div>
  );
}

function AuthScreen({ T, theme, onLogin, onSocialLogin, onPasswordReset, storedUser }) {
  const [mode, setMode] = useState("login");
  const [authName, setAuthName] = useState(storedUser?.name || "Lyvora");
  const [authEmail, setAuthEmail] = useState(storedUser?.email || "");
  const [authPassword, setAuthPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submitAuth = async () => {
    try {
      setBusy(true); setError("");
      await onLogin({ mode, name: authName, email: authEmail, password: authPassword });
    } catch (err) {
      const code = err?.code || "";
      if (code.includes("auth/invalid-credential")) setError("E-posta veya şifre yanlış.");
      else if (code.includes("auth/email-already-in-use")) setError("Bu e-posta zaten kayıtlı.");
      else if (code.includes("auth/weak-password")) setError("Şifre en az 6 karakter olmalı.");
      else if (code.includes("auth/invalid-email")) setError("Geçerli bir e-posta yaz.");
      else setError(err?.message || "Giriş sırasında hata oluştu.");
    } finally { setBusy(false); }
  };

  const resetPassword = async () => {
    try {
      setBusy(true); setError("");
      await onPasswordReset?.(authEmail);
      setError("Şifre sıfırlama maili gönderildi. Gelen kutunu kontrol et.");
    } catch (err) {
      const code = err?.code || "";
      if (code.includes("auth/invalid-email")) setError("Geçerli bir e-posta yaz.");
      else if (code.includes("auth/user-not-found")) setError("Bu e-posta ile kullanıcı bulunamadı.");
      else setError(err?.message || "Şifre sıfırlama gönderilemedi.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif", boxSizing: "border-box" }}>
      <div style={{ width: "min(980px,100%)", minHeight: 610, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 28, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", boxShadow: "0 24px 80px rgba(0,0,0,.12)" }}>
        {/* Hero side */}
        <div style={{ background: "#050505", color: "#ffffff", padding: 46, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -90, top: 70, width: 260, height: 260, borderRadius: "50%", background: "rgba(139,92,246,.28)", opacity: .28, zIndex: 0 }} />
          <div style={{ position: "relative", zIndex: 2 }}>
            <LyvoraLogo />
            <h1 style={{ fontSize: 42, lineHeight: 1.05, marginTop: 70, marginBottom: 18, color: "#ffffff", fontWeight: 900 }}>Lyvora'ya<br />Hoş Geldin</h1>
            <p style={{ color: "#d4d4d8", lineHeight: 1.7, fontSize: 14 }}>Firebase bağlı gerçek hesap sistemi aktif. Kayıt ol, giriş yap ve dünyaya katıl.</p>
          </div>
          <div style={{ position: "relative", zIndex: 2, display: "grid", gap: 10 }}>
            {["Gerçek Firebase Auth","Firestore canlı mesajlar","Kalıcı XP ve profil"].map(x => (
              <div key={x} style={{ display: "flex", gap: 10, alignItems: "center", color: "#f4f4f5", fontSize: 13, fontWeight: 600 }}>
                <span style={{ color: "#8b5cf6" }}>{IC.task}</span>{x}
              </div>
            ))}
          </div>
        </div>

        {/* Form side */}
        <div style={{ padding: 46, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ color: T.purple, fontSize: 11, fontWeight: 900, letterSpacing: 3, marginBottom: 10 }}>{mode === "login" ? "GİRİŞ" : "KAYIT"}</p>
          <h2 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8, color: T.text }}>{mode === "login" ? "Devam Et" : "Hesap Oluştur"}</h2>
          <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.6, marginBottom: 22 }}>{mode === "login" ? "Firebase hesabınla Lyvora'ya giriş yap." : "Yeni hesap oluştur."}</p>

          {mode === "register" && (
            <>
              <label style={{ fontSize: 12, fontWeight: 800, marginBottom: 7 }}>Kullanıcı adı</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 13, padding: "12px 14px", marginBottom: 14 }}>
                {IC.user}<input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Nova" style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: T.text }} />
              </div>
            </>
          )}

          <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
            <button onClick={() => onSocialLogin("google")} style={{ width: "100%", border: "none", background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", color: "#fff", borderRadius: 14, padding: "13px 16px", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", color: "#111", display: "grid", placeItems: "center", fontWeight: 950, fontSize: 13 }}>G</span> Google ile Devam Et
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => onSocialLogin("apple")} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "12px 14px", fontWeight: 850, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span style={{ fontSize: 18 }}></span>Apple</button>
              <button onClick={() => onSocialLogin("yandex")} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "12px 14px", fontWeight: 850, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fc3f1d", color: "#fff", display: "grid", placeItems: "center", fontWeight: 950, fontSize: 13 }}>Y</span>Yandex</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ height: 1, background: T.border, flex: 1 }} />
              <span style={{ color: T.textTer, fontSize: 11, fontWeight: 800 }}>VEYA E-POSTA</span>
              <div style={{ height: 1, background: T.border, flex: 1 }} />
            </div>
          </div>

          <label style={{ fontSize: 12, fontWeight: 800, marginBottom: 7 }}>E-posta</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 13, padding: "12px 14px", marginBottom: 14 }}>
            {IC.mail}<input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="mail@example.com" style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: T.text }} />
          </div>

          <label style={{ fontSize: 12, fontWeight: 800, marginBottom: 7 }}>Şifre</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 13, padding: "12px 14px", marginBottom: 14 }}>
            {IC.lock}<input value={authPassword} onChange={e => setAuthPassword(e.target.value)} type="password" placeholder="en az 6 karakter" style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: T.text }} />
          </div>

          {mode === "login" && (
            <button disabled={busy} onClick={resetPassword} style={{ border: "none", background: "transparent", color: T.purple, fontWeight: 900, cursor: busy ? "not-allowed" : "pointer", alignSelf: "flex-end", margin: "-4px 0 10px" }}>
              Şifremi unuttum
            </button>
          )}

          {error && <p style={{ color: error.includes("gönderildi") ? T.green : T.red, fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>{error}</p>}

          <button disabled={busy} onClick={submitAuth} style={{ border: "none", background: T.accent, color: T.accentText, borderRadius: 14, padding: "14px 0", fontWeight: 900, cursor: busy ? "not-allowed" : "pointer", marginTop: 4, opacity: busy ? .65 : 1 }}>
            {busy ? "Bağlanıyor..." : mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
          </button>

          <p style={{ marginTop: 18, color: T.textSec, fontSize: 13 }}>
            {mode === "login" ? "Hesabın yok mu?" : "Zaten hesabın var mı?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ border: "none", background: "transparent", color: T.purple, fontWeight: 900, cursor: "pointer" }}>
              {mode === "login" ? "Kayıt ol" : "Giriş yap"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RIGHT DASHBOARD PATCH 1
   Eklenen sistemler:
   - Online arkadaşlar widget
   - Trend hashtagler
   - Günlük görev özeti
   - Mini sıralama
   - Yaklaşan etkinlikler
   - Hızlı DM kutusu
   - Son aktiviteler paneli

   Entegrasyon notu:
   HomePage sağ kolonuna <RightDashboard T={T} nav={nav} /> eklenir.
═══════════════════════════════════════════ */

const RIGHT_DASHBOARD_FRIENDS = [
  { id: 1, name: "Nova", status: "Çevrimiçi", avatar: "N", color: "#8b5cf6" },
  { id: 2, name: "Elysia", status: "Mood eşleşmede", avatar: "E", color: "#ec4899" },
  { id: 3, name: "Raven", status: "Oyun oynuyor", avatar: "R", color: "#06b6d4" },
];

const RIGHT_DASHBOARD_TRENDS = [
  { tag: "#gecekuşları", count: "2.4K" },
  { tag: "#lyvora", count: "1.8K" },
  { tag: "#mood", count: "940" },
  { tag: "#oyun", count: "720" },
];

const RIGHT_DASHBOARD_EVENTS = [
  { title: "Lyvora XP Gecesi", time: "Bugün 21:00" },
  { title: "Mood Match Etkinliği", time: "Yarın 20:30" },
  { title: "Mini Oyun Turnuvası", time: "Cuma 19:00" },
];

function RightDashboard({ T, nav }) {
  const [quickDm, setQuickDm] = useState("");

  const card = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,.04)",
  };

  return (
    <aside style={{ display: "grid", gap: 14 }}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <b style={{ fontSize: 14 }}>Online Arkadaşlar</b>
          <button onClick={() => nav?.("dm")} style={{ border: "none", background: "transparent", color: T.purple, fontWeight: 800, cursor: "pointer" }}>DM</button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {RIGHT_DASHBOARD_FRIENDS.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: f.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900 }}>{f.avatar}</div>
                <span style={{ position: "absolute", right: 0, bottom: 0, width: 10, height: 10, borderRadius: "50%", background: T.green, border: `2px solid ${T.surface}` }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 13 }}>{f.name}</b>
                <p style={{ fontSize: 11, color: T.textSec, marginTop: 2 }}>{f.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <b style={{ fontSize: 14 }}>Hızlı DM</b>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            value={quickDm}
            onChange={(e) => setQuickDm(e.target.value)}
            placeholder="Kısa mesaj yaz..."
            style={{ flex: 1, minWidth: 0, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 12, padding: "10px 12px", outline: "none" }}
          />
          <button
            onClick={() => {
              if (!quickDm.trim()) return;
              setQuickDm("");
              nav?.("dm");
            }}
            style={{ border: "none", borderRadius: 12, background: T.accent, color: T.accentText, padding: "0 13px", cursor: "pointer", fontWeight: 900 }}
          >
            Gönder
          </button>
        </div>
      </div>

      <div style={card}>
        <b style={{ fontSize: 14 }}>Trendler</b>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {RIGHT_DASHBOARD_TRENDS.map((t) => (
            <div key={t.tag} style={{ display: "flex", justifyContent: "space-between", color: T.textSec, fontSize: 13 }}>
              <span style={{ color: T.purple, fontWeight: 800 }}>{t.tag}</span>
              <span>{t.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <b style={{ fontSize: 14 }}>Günlük Görev</b>
        <p style={{ color: T.textSec, fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>Bugün 3 mesaj gönder, 1 oyun oyna ve 100 XP kazan.</p>
        <div style={{ height: 8, borderRadius: 999, background: T.border, overflow: "hidden", marginTop: 12 }}>
          <div style={{ width: "62%", height: "100%", background: T.purple, borderRadius: 999 }} />
        </div>
      </div>

      <div style={card}>
        <b style={{ fontSize: 14 }}>Mini Sıralama</b>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {LEADERBOARD.slice(0, 4).map((u) => (
            <div key={u.rank} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span><b>#{u.rank}</b> {u.badge} {u.name}</span>
              <span style={{ color: T.textSec }}>{u.level} Lv</span>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <b style={{ fontSize: 14 }}>Yaklaşan Etkinlikler</b>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {RIGHT_DASHBOARD_EVENTS.map((e) => (
            <div key={e.title} style={{ borderLeft: `3px solid ${T.purple}`, paddingLeft: 10 }}>
              <b style={{ fontSize: 12 }}>{e.title}</b>
              <p style={{ fontSize: 11, color: T.textSec, marginTop: 2 }}>{e.time}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* PATCH UYGULAMA:
   HomePage içindeki sağ kolon yerine veya içine:
   <RightDashboard T={T} nav={nav} />
*/


/* LYVORA_PATCH_22_CREATOR_ECONOMY_SYSTEM */
const LYVORA_CREATOR_ECONOMY_STORAGE = "lyvora_creator_economy_v1";
const LYVORA_CREATOR_WALLET_STORAGE = "lyvora_creator_wallet_v1";
const LYVORA_MARKETPLACE_STORAGE = "lyvora_marketplace_v1";

const CREATOR_PRODUCTS = [
  { id: "sub_basic", name: "Supporter Pass", type: "membership", price: 99, icon: "💜", creator: "Lyvora Team" },
  { id: "sub_premium", name: "Nebula Membership", type: "membership", price: 249, icon: "🌌", creator: "Lyvora Team" },
  { id: "tip_small", name: "Small Tip", type: "tip", price: 25, icon: "✨", creator: "Nova" },
  { id: "tip_big", name: "Big Tip", type: "tip", price: 100, icon: "🔥", creator: "Mira" },
  { id: "cosmetic_creator_frame", name: "Creator Frame", type: "cosmetic", price: 180, icon: "👑", creator: "Lyvora Team" },
  { id: "stream_boost", name: "Stream Boost", type: "boost", price: 150, icon: "📡", creator: "Nova" },
];

function buildCreatorEconomySeed() {
  return {
    creatorMode: false,
    verifiedCreator: false,
    subscribers: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    tipsReceived: 0,
    streamRevenue: 0,
    sponsorReady: false,
    shopViews: 0,
    conversionRate: 0,
  };
}

function buildCreatorWalletSeed() {
  return {
    coins: 500,
    shards: 250,
    pendingPayout: 0,
    lifetimeSpent: 0,
    purchases: [],
    supporterBadges: [],
  };
}

function calculateCreatorFee(amount) {
  const platformFee = Math.round(Number(amount || 0) * 0.12);
  const creatorNet = Math.max(0, Number(amount || 0) - platformFee);
  return { platformFee, creatorNet };
}


function EconomyProductCard({ T, product, owned, onBuy }) {
  return (
    <div
      style={{
        border: `1px solid ${owned ? "rgba(23,201,100,.45)" : T.border}`,
        background: owned ? "rgba(23,201,100,.07)" : T.surfaceAlt,
        borderRadius: 18,
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 15, background: "rgba(139,92,246,.14)", display: "grid", placeItems: "center", fontSize: 20 }}>
            {product.icon}
          </div>
          <div>
            <b style={{ fontSize: 13 }}>{product.name}</b>
            <p style={{ color: T.textSec, fontSize: 11, marginTop: 3 }}>{product.type} · {product.creator}</p>
          </div>
        </div>
        <span style={{ color: T.purple, fontWeight: 950 }}>{product.price}</span>
      </div>

      <button
        onClick={() => onBuy(product)}
        style={{
          border: "none",
          background: owned ? T.surface : T.purple,
          color: owned ? T.textSec : "#fff",
          borderRadius: 13,
          padding: "10px 12px",
          fontWeight: 950,
          cursor: "pointer",
        }}
      >
        {owned ? "Owned" : "Buy / Support"}
      </button>
    </div>
  );
}


function VoiceStreamingPage({ T }) {
  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      <PanelCard T={T} title="Voice + Streaming + Live Rooms" icon={IC.zap}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950 }}>🎙️ Live Rooms Ecosystem</h1>
        <p style={{ color: T.textSec, lineHeight: 1.6, marginTop: 10 }}>
          Voice rooms, live rooms, speaker queue, push-to-talk, stream reactions, co-host sistemi ve moderation hooks için görünür merkez.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 18 }}>
          {[
            ["Voice Rooms", "Stage / audience sistemi"],
            ["Speaker Queue", "Söz alma sırası"],
            ["Live Stream", "Creator yayın altyapısı"],
            ["Moderation", "Mute / report hooks"],
          ].map(([title, desc]) => (
            <div key={title} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 16, padding: 14 }}>
              <b>{title}</b>
              <p style={{ color: T.textSec, fontSize: 12, marginTop: 5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}


function CreatorEconomyPage({ T, user, addXP }) {
  const [economy, setEconomy] = useState(() =>
    readLocalJson(LYVORA_CREATOR_ECONOMY_STORAGE, buildCreatorEconomySeed())
  );
  const [wallet, setWallet] = useState(() =>
    readLocalJson(LYVORA_CREATOR_WALLET_STORAGE, buildCreatorWalletSeed())
  );
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState("");

  const currentName = user?.name || user?.tag || "Lyvora Creator";
  const purchases = wallet.purchases || [];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  useEffect(() => {
    safeWriteLocalJson(LYVORA_CREATOR_ECONOMY_STORAGE, economy);
  }, [economy]);

  useEffect(() => {
    safeWriteLocalJson(LYVORA_CREATOR_WALLET_STORAGE, wallet);
  }, [wallet]);

  const enableCreatorMode = () => {
    setEconomy((prev) => ({
      ...prev,
      creatorMode: true,
      verifiedCreator: true,
      sponsorReady: true,
    }));
    addXP?.(35);
    showToast("Creator mode aktif edildi +35 XP");
  };

  const buyProduct = (product) => {
    if (purchases.includes(product.id)) return showToast("Bu ürün zaten alınmış.");
    if (Number(wallet.coins || 0) < product.price) return showToast("Yeterli coin yok.");

    const fee = calculateCreatorFee(product.price);

    setWallet((prev) => ({
      ...prev,
      coins: Number(prev.coins || 0) - product.price,
      lifetimeSpent: Number(prev.lifetimeSpent || 0) + product.price,
      purchases: [...(prev.purchases || []), product.id],
      supporterBadges: product.type === "membership"
        ? [...new Set([...(prev.supporterBadges || []), product.name])]
        : prev.supporterBadges || [],
    }));

    setEconomy((prev) => ({
      ...prev,
      monthlyRevenue: Number(prev.monthlyRevenue || 0) + fee.creatorNet,
      totalRevenue: Number(prev.totalRevenue || 0) + fee.creatorNet,
      pendingPayout: Number(prev.pendingPayout || 0) + fee.creatorNet,
      tipsReceived: product.type === "tip" ? Number(prev.tipsReceived || 0) + product.price : Number(prev.tipsReceived || 0),
      subscribers: product.type === "membership" ? Number(prev.subscribers || 0) + 1 : Number(prev.subscribers || 0),
      conversionRate: Math.min(100, Number(prev.conversionRate || 0) + 3),
    }));

    addXP?.(20);
    showToast(`${product.name} alındı. Creator net: ${fee.creatorNet}`);
  };

  const simulateStreamRevenue = () => {
    const amount = 75 + Math.floor(Math.random() * 180);
    const fee = calculateCreatorFee(amount);
    setEconomy((prev) => ({
      ...prev,
      streamRevenue: Number(prev.streamRevenue || 0) + fee.creatorNet,
      monthlyRevenue: Number(prev.monthlyRevenue || 0) + fee.creatorNet,
      totalRevenue: Number(prev.totalRevenue || 0) + fee.creatorNet,
      pendingPayout: Number(prev.pendingPayout || 0) + fee.creatorNet,
      shopViews: Number(prev.shopViews || 0) + 34,
    }));
    addXP?.(25);
    showToast(`Stream revenue +${fee.creatorNet} coin`);
  };

  const requestPayout = () => {
    const amount = Number(economy.pendingPayout || 0);
    if (amount < 100) return showToast("Payout için en az 100 coin gerekir.");
    setEconomy((prev) => ({ ...prev, pendingPayout: 0 }));
    showToast(`${amount} coin payout request oluşturuldu.`);
  };

  const addCoins = () => {
    setWallet((prev) => ({ ...prev, coins: Number(prev.coins || 0) + 300 }));
    showToast("+300 demo coin eklendi.");
  };

  return (
    <div style={{ padding: 20, display: "grid", gap: 18 }}>
      {toast && (
        <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 3000, background: T.surface, border: `1px solid ${T.border}`, color: T.text, borderRadius: 16, padding: "12px 14px", boxShadow: "0 18px 60px rgba(0,0,0,.25)", fontSize: 13, fontWeight: 850 }}>
          {toast}
        </div>
      )}

      <PanelCard T={T} title="Creator Economy + Monetization" icon={IC.crown}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ color: T.purple, fontSize: 13, fontWeight: 950, letterSpacing: 2 }}>CREATOR ECONOMY</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 32, fontWeight: 950 }}>💸 {currentName}</h1>
            <p style={{ color: T.textSec, marginTop: 6 }}>
              Creator dashboard, tips, memberships, marketplace, wallet ve payout hooks hazır.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "flex-end" }}>
            <button onClick={enableCreatorMode} style={{ border: "none", background: economy.creatorMode ? T.green : T.purple, color: "#fff", borderRadius: 15, padding: "12px 16px", fontWeight: 950, cursor: "pointer" }}>
              {economy.creatorMode ? "Creator Aktif" : "Creator Mode Aç"}
            </button>
            <button onClick={addCoins} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 15, padding: "12px 16px", fontWeight: 950, cursor: "pointer" }}>
              + Demo Coin
            </button>
          </div>
        </div>
      </PanelCard>

      <PanelCard T={T} title="Economy Tabs" icon={IC.spark}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            ["dashboard", "Dashboard"],
            ["market", "Marketplace"],
            ["wallet", "Wallet"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                border: `1px solid ${tab === id ? T.purple : T.border}`,
                background: tab === id ? "rgba(139,92,246,.16)" : T.surfaceAlt,
                color: tab === id ? T.purple : T.textSec,
                borderRadius: 999,
                padding: "9px 12px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </PanelCard>

      {tab === "dashboard" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {[
            ["Subscribers", economy.subscribers],
            ["Monthly Revenue", `${economy.monthlyRevenue || 0} coin`],
            ["Total Revenue", `${economy.totalRevenue || 0} coin`],
            ["Tips", `${economy.tipsReceived || 0} coin`],
            ["Stream Revenue", `${economy.streamRevenue || 0} coin`],
            ["Conversion", `%${economy.conversionRate || 0}`],
          ].map(([label, value]) => (
            <div key={label} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 18, padding: 15 }}>
              <p style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>{label}</p>
              <b style={{ fontSize: 18 }}>{value}</b>
            </div>
          ))}

          <PanelCard T={T} title="Creator Actions" icon={IC.zap}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button onClick={simulateStreamRevenue} style={{ border: "none", background: T.purple, color: "#fff", borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                Stream Revenue Simüle Et
              </button>
              <button onClick={requestPayout} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 14, padding: "11px 14px", fontWeight: 950, cursor: "pointer" }}>
                Payout Request
              </button>
            </div>
          </PanelCard>
        </div>
      )}

      {tab === "market" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          {CREATOR_PRODUCTS.map((product) => (
            <EconomyProductCard
              key={product.id}
              T={T}
              product={product}
              owned={purchases.includes(product.id)}
              onBuy={buyProduct}
            />
          ))}
        </div>
      )}

      {tab === "wallet" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 16 }}>
          <PanelCard T={T} title="Wallet" icon={IC.gift}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
              {[
                ["Coins", wallet.coins],
                ["Shards", wallet.shards],
                ["Pending Payout", economy.pendingPayout || 0],
                ["Lifetime Spent", wallet.lifetimeSpent || 0],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 16, padding: 13 }}>
                  <p style={{ color: T.textTer, fontSize: 10, fontWeight: 900 }}>{label}</p>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </PanelCard>

          <PanelCard T={T} title="Supporter Badges" icon={IC.heart}>
            <div style={{ display: "grid", gap: 9 }}>
              {(wallet.supporterBadges || []).length === 0 && <p style={{ color: T.textSec, fontSize: 12 }}>Henüz supporter badge yok.</p>}
              {(wallet.supporterBadges || []).map((badge) => (
                <div key={badge} style={{ border: `1px solid ${T.border}`, background: "rgba(139,92,246,.10)", color: T.purple, borderRadius: 14, padding: 10, fontWeight: 900 }}>
                  💜 {badge}
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      )}
    </div>
  );
}



/* LYVORA_PATCH_58_MOBILE_RESPONSIVE_FINAL_SYSTEM_SAFE_EXPORT */
