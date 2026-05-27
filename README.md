import { useState, useEffect, useRef } from "react";

const LYVORA_STORAGE = {
  user: "lyvora_user",
  loggedIn: "lyvora_logged_in",
  xp: "lyvora_xp",
  theme: "lyvora_theme",
};

function getStoredUser() {
  try {
    const raw = localStorage.getItem(LYVORA_STORAGE.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function createLyvoraUser(name = "Lyvora", email = "demo@lyvora.app") {
  const cleanName = String(name || "Lyvora").trim() || "Lyvora";
  const tag = `${cleanName.replace(/\s+/g, "")}#${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    name: cleanName,
    email,
    tag,
    bio: "Anonimlik bizim özgürlüğümüzdür.",
    createdAt: new Date().toISOString(),
  };
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

const ROOMS = [
  { id: 1, name: "Global Lounge", icon: "globe", count: "4.8K", city: null, active: true },
  { id: 2, name: "Gece Sohbeti", icon: "moon", count: "892", city: null },
  { id: 3, name: "İstanbul", icon: "pin", count: "1.2K", city: "TR" },
  { id: 4, name: "Ankara", icon: "pin", count: "634", city: "TR" },
  { id: 5, name: "İzmir", icon: "pin", count: "421", city: "TR" },
  { id: 6, name: "Pozitif Alan", icon: "smile", count: "1.1K", city: null },
  { id: 7, name: "Mini Oyunlar", icon: "game", count: "286", city: null },
];

const DM_LIST = [
  { id: 1, name: "Anonim#4821", mood: "Gece modu", online: true, unread: 2, last: "Selam nasılsın?" },
  { id: 2, name: "Anonim#7710", mood: "Kafam dolu", online: true, unread: 0, last: "Tamam görüşürüz" },
  { id: 3, name: "Anonim#2245", mood: "Sakin", online: false, unread: 1, last: "Bu platform gerçekten güzel" },
  { id: 4, name: "Anonim#9032", mood: "Mutlu", online: true, unread: 0, last: "Gg" },
  { id: 5, name: "Anonim#1167", mood: "Sosyal", online: false, unread: 0, last: "Yarın görüşelim" },
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

const SERVER_LIST = [
  { id: 1, name: "Türkiye Genel", members: 12400, category: "Lokasyon", icon: "pin" },
  { id: 2, name: "Gece Kuşları", members: 3200, category: "Mood", icon: "moon" },
  { id: 3, name: "Oyun Dünyası", members: 8900, category: "Oyun", icon: "game" },
  { id: 4, name: "Müzik Kulübü", members: 5600, category: "Hobi", icon: "spark" },
  { id: 5, name: "Film & Dizi", members: 7100, category: "Hobi", icon: "smile" },
  { id: 6, name: "Tech Sohbet", members: 4300, category: "Teknoloji", icon: "zap" },
];


function LyvoraLogo({ compact = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 10 }}>
      <div style={{
        width: compact ? 30 : 36,
        height: compact ? 30 : 36,
        borderRadius: 11,
        background: "linear-gradient(135deg,#8b5cf6,#050505 58%,#c4b5fd)",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontWeight: 950,
        fontSize: compact ? 12 : 14,
        letterSpacing: -1,
        boxShadow: "0 0 24px rgba(139,92,246,.35)",
        position: "relative",
        overflow: "hidden"
      }}>
        <span style={{ position: "relative", zIndex: 2 }}>LV</span>
        <span style={{
          position: "absolute",
          width: 46,
          height: 8,
          borderRadius: 999,
          border: "2px solid rgba(255,255,255,.28)",
          transform: "rotate(-28deg)"
        }} />
      </div>
      {!compact && <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: 1 }}>LYVORA</span>}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState(() => localStorage.getItem(LYVORA_STORAGE.loggedIn) === "true" ? "home" : "login");
  const [theme, setTheme] = useState(() => localStorage.getItem(LYVORA_STORAGE.theme) || "light");
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem(LYVORA_STORAGE.loggedIn) === "true");
  const [xp, setXp] = useState(() => Number(localStorage.getItem(LYVORA_STORAGE.xp) || 0));

  useEffect(() => {
    localStorage.setItem(LYVORA_STORAGE.theme, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LYVORA_STORAGE.xp, String(xp));
  }, [xp]);

  const addXP = (amount) => setXp(prev => prev + amount);
  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;
  const T = theme === "light" ? lightTheme : darkTheme;

  const handleLogin = (nextUser) => {
    const safeUser = nextUser || user || createLyvoraUser("Lyvora", "demo@lyvora.app");
    setUser(safeUser);
    localStorage.setItem(LYVORA_STORAGE.user, JSON.stringify(safeUser));
    localStorage.setItem(LYVORA_STORAGE.loggedIn, "true");
    setLoggedIn(true);
    setPage("home");
  };

  const handleLogout = () => {
    localStorage.setItem(LYVORA_STORAGE.loggedIn, "false");
    setLoggedIn(false);
    setPage("login");
  };

  const nav = (p) => { setPage(p); setNotifOpen(false); setMobileMenuOpen(false); };

  if (!loggedIn) return <AuthScreen T={T} theme={theme} onLogin={handleLogin} storedUser={user} />;

  return (
    <>
      <style id="lyvora-global-fullscreen">{`
        html, body, #root {
          width: 100% !important;
          min-width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
        }
        body {
          display: block !important;
          place-items: initial !important;
          background: ${theme === "dark" ? "#050505" : "#f2f2f2"} !important;
        }
        #root {
          display: block !important;
        }
        * {
          box-sizing: border-box;
        }
        @keyframes lyvoraRingSpin {
          0% { transform: translate(-50%, -50%) rotateX(72deg) rotateZ(0deg); }
          100% { transform: translate(-50%, -50%) rotateX(72deg) rotateZ(360deg); }
        }
        @keyframes lyvoraFloat {
          0%, 100% { transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-53%) scale(1.025); }
        }
        @keyframes lyvoraGlowPulse {
          0%, 100% { opacity: .35; }
          50% { opacity: .75; }
        }
        @keyframes lyvoraMsgIn {
          from { opacity: 0; transform: translateY(8px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        .lyvora-mobile-menu-btn { display: none; }
        .lyvora-bottom-nav { display: none; }
        .lyvora-mobile-overlay { display: none; }

        @media (max-width: 980px) {
          .lyvora-shell-grid {
            grid-template-columns: 1fr !important;
          }
          .lyvora-sidebar {
            position: fixed !important;
            left: 12px !important;
            top: 76px !important;
            bottom: 76px !important;
            width: 280px !important;
            z-index: 999 !important;
            transform: translateX(-115%) !important;
            transition: transform .25s ease !important;
            border-radius: 22px !important;
            box-shadow: 0 20px 70px rgba(0,0,0,.35) !important;
          }
          .lyvora-sidebar.open {
            transform: translateX(0) !important;
          }
          .lyvora-mobile-overlay {
            display: block;
            position: fixed;
            inset: 64px 0 0 0;
            background: rgba(0,0,0,.45);
            backdrop-filter: blur(8px);
            z-index: 998;
          }
          .lyvora-top-nav {
            display: none !important;
          }
          .lyvora-mobile-menu-btn {
            display: grid !important;
          }
          .lyvora-user-pill span {
            display: none !important;
          }
          .lyvora-bottom-nav {
            display: grid !important;
            grid-template-columns: repeat(5,1fr);
            position: fixed;
            left: 12px;
            right: 12px;
            bottom: 12px;
            height: 62px;
            z-index: 1000;
            border-radius: 22px;
            border: 1px solid rgba(139,92,246,.22);
            background: rgba(18,18,22,.82);
            backdrop-filter: blur(18px);
            box-shadow: 0 18px 60px rgba(0,0,0,.35);
            overflow: hidden;
          }
          .lyvora-page-main {
            padding-bottom: 86px !important;
          }
          .lyvora-home-grid {
            grid-template-columns: 1fr !important;
          }
          .lyvora-home-right {
            display: none !important;
          }
          .lyvora-hero {
            min-height: 430px !important;
            padding: 30px 24px !important;
          }
          .lyvora-planet {
            opacity: .36 !important;
            right: -85px !important;
            transform: translateY(-50%) scale(.78) !important;
          }
          .lyvora-cards-grid {
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
          }
          .lyvora-bottom-grid {
            grid-template-columns: 1fr !important;
          }
          .lyvora-chat-grid {
            grid-template-columns: 1fr !important;
            height: calc(100vh - 140px) !important;
            padding: 10px !important;
          }
          .lyvora-chat-rooms,
          .lyvora-chat-users {
            display: none !important;
          }
          .lyvora-chat-main {
            border-radius: 20px !important;
          }
          .lyvora-chat-header {
            padding: 14px !important;
          }
          .lyvora-chat-title h2 {
            font-size: 15px !important;
          }
          .lyvora-message-bubble {
            max-width: 86% !important;
          }
          .lyvora-login-card {
            grid-template-columns: 1fr !important;
            max-width: 440px !important;
          }
          .lyvora-login-hero {
            display: none !important;
          }
        }

        @media (max-width: 560px) {
          .lyvora-cards-grid {
            grid-template-columns: 1fr !important;
          }
          .lyvora-hero-title {
            font-size: 32px !important;
          }
          .lyvora-hero {
            min-height: 460px !important;
          }
          .lyvora-topbar {
            padding: 0 12px !important;
          }
          .lyvora-xp-pill {
            min-width: 104px !important;
          }
          .lyvora-chat-grid {
            padding: 8px !important;
          }
          .lyvora-message-bubble {
            max-width: 92% !important;
          }
        }

        @keyframes lyvoraTypingDot {
          0%, 80%, 100% { transform: translateY(0); opacity: .35; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    <div style={{ minHeight: "100vh", width: "100%", maxWidth: "none", background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif", position: "relative", overflowX: "hidden" }}>
      <Topbar T={T} theme={theme} setTheme={setTheme} page={page} nav={nav} notifOpen={notifOpen} setNotifOpen={setNotifOpen} onLogout={handleLogout} user={user} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} xp={xp} level={level} levelProgress={levelProgress} />
      <div className="lyvora-shell-grid" style={{ display: "grid", gridTemplateColumns: "250px minmax(0, 1fr)", minHeight: "calc(100vh - 64px)", width: "100%", maxWidth: "none" }}>
        {mobileMenuOpen && <div className="lyvora-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}
        <Sidebar T={T} page={page} nav={nav} mobileMenuOpen={mobileMenuOpen} />
        <main className="lyvora-page-main" style={{ overflow: "auto", minWidth: 0, width: "100%", maxWidth: "none" }}>
          {page === "home"        && <HomePage T={T} nav={nav} />}
          {page === "chat"        && <GlobalChatPage T={T} addXP={addXP} />}
          {page === "dm"          && <DMPage T={T} addXP={addXP} />}
          {page === "profile"     && <ProfilePage T={T} user={user} xp={xp} level={level} levelProgress={levelProgress} />}
          {page === "servers"     && <ServersPage T={T} nav={nav} />}
          {page === "leaderboard" && <LeaderboardPage T={T} />}
          {page === "tasks"       && <TasksPage T={T} />}
          {page === "games"       && <MiniGamesPage T={T} addXP={addXP} xp={xp} level={level} levelProgress={levelProgress} />}
          {page === "mood"        && <MoodMatchPage T={T} />}
          {page === "location"    && <LocationPage T={T} />}
          {page === "premium"     && <PremiumPage T={T} />}
          {page === "settings"     && <SettingsPage T={T} theme={theme} setTheme={setTheme} onLogout={handleLogout} user={user} />}
          {page === "rules"       && <RulesPage T={T} nav={nav} />}
          {page === "privacy"     && <PrivacyPage T={T} nav={nav} />}
          {page === "terms"       && <TermsPage T={T} nav={nav} />}
        </main>
      </div>

      <nav className="lyvora-bottom-nav">
        {[
          ["home", IC.home, "Ana"],
          ["chat", IC.globe, "Chat"],
          ["games", IC.game, "Oyun"],
          ["dm", IC.msg, "DM"],
          ["profile", IC.user, "Profil"],
        ].map(([id, icon, label]) => (
          <button key={id} onClick={() => nav(id)} style={{
            border: "none",
            background: page === id ? "rgba(139,92,246,.24)" : "transparent",
            color: page === id ? "#fff" : "rgba(255,255,255,.62)",
            display: "grid",
            placeItems: "center",
            gap: 2,
            fontSize: 10,
            fontWeight: 800,
            cursor: "pointer"
          }}>
            <span style={{ color: page === id ? "#a78bfa" : "inherit" }}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
    </>
  );
}

function Topbar({ T, theme, setTheme, page, nav, notifOpen, setNotifOpen, onLogout, user, mobileMenuOpen, setMobileMenuOpen, xp, level, levelProgress }) {
  const unread = NOTIFS.filter(n => !n.read).length;
  return (
    <header className="lyvora-topbar" style={{ height: 64, width: "100%", maxWidth: "none", background: T.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="lyvora-mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: T.surfaceAlt,
          color: T.text,
          placeItems: "center",
          cursor: "pointer"
        }}>{mobileMenuOpen ? IC.x : IC.more}</button>
        <div style={{ cursor: "pointer" }} onClick={() => nav("home")}><LyvoraLogo /></div>
      </div>
      <nav className="lyvora-top-nav" style={{ display: "flex", gap: 28, fontSize: 14 }}>
        {[["home","Ana Sayfa"],["servers","Sunucular"],["games","Oyunlar"],["leaderboard","Sıralamalar"],["mood","Mood"],["premium","Premium"]].map(([p,label]) => (
          <span key={p} style={{ cursor: "pointer", fontWeight: page === p ? 700 : 400, color: page === p ? T.text : T.textSec, borderBottom: page === p ? `2px solid ${T.purple}` : "2px solid transparent", paddingBottom: 2 }} onClick={() => nav(p)}>{label}</span>
        ))}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSec, display: "grid", placeItems: "center" }}>
          {theme === "light" ? IC.moon : IC.sun}
        </button>
        <span style={{ cursor: "pointer", color: T.textSec }}>{IC.search}</span>
        <div style={{ position: "relative" }}>
          <span style={{ cursor: "pointer", color: T.textSec, display: "grid", placeItems: "center" }} onClick={() => setNotifOpen(!notifOpen)}>{IC.bell}</span>
          {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, background: T.red, borderRadius: "50%", color: "#fff", fontSize: 9, display: "grid", placeItems: "center", fontWeight: 700 }}>{unread}</span>}
          {notifOpen && <NotifPanel T={T} onClose={() => setNotifOpen(false)} />}
        </div>

        <div className="lyvora-xp-pill" style={{ display: "flex", alignItems: "center", gap: 9, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, padding: "6px 12px", minWidth: 150 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.accent, color: T.accentText, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900 }}>Lv{level}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textSec, marginBottom: 3 }}>
              <span>XP</span><b>{xp}</b>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: T.border, overflow: "hidden" }}>
              <div style={{ width: `${levelProgress}%`, height: "100%", background: T.accent, borderRadius: 999 }} />
            </div>
          </div>
        </div>

        <div className="lyvora-user-pill" style={{ display: "flex", alignItems: "center", gap: 8, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 24, padding: "5px 12px 5px 6px", cursor: "pointer" }} onClick={() => nav("profile")}>
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

function NotifPanel({ T, onClose }) {
  const iconMap = { msg: IC.msg, task: IC.task, mega: IC.mega, user: IC.user, trophy: IC.trophy };
  return (
    <div style={{ position: "absolute", top: 40, right: 0, width: 340, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,.12)", zIndex: 200, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Bildirimler</span>
        <span style={{ cursor: "pointer", color: T.textSec }} onClick={onClose}>{IC.x}</span>
      </div>
      {NOTIFS.map(n => (
        <div key={n.id} style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.borderLight}`, background: n.read ? "transparent" : T.surfaceAlt, alignItems: "flex-start" }}>
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

function Sidebar({ T, page, nav, mobileMenuOpen }) {
  const items = [
    { id: "home", icon: IC.home, label: "Ana Sayfa" },
    { id: "chat", icon: IC.globe, label: "Global Chat" },
    { id: "games", icon: IC.game, label: "Mini Oyunlar", badge: "5" },
    { id: "dm", icon: IC.msg, label: "Mesajlar", badge: 3 },
    { id: "mood", icon: IC.spark, label: "Mood Eşleşme", badge: "Yeni" },
    { id: "location", icon: IC.pin, label: "Lokasyon" },
    { id: "servers", icon: IC.server, label: "Sunucular" },
    { id: "tasks", icon: IC.task, label: "Görevler" },
    { id: "leaderboard", icon: IC.trophy, label: "Sıralamalar" },
    { id: "profile", icon: IC.user, label: "Profilim" },
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
        <div onClick={() => nav("premium")} style={{
          background: "linear-gradient(135deg, rgba(139,92,246,.20), rgba(139,92,246,.06))",
          color: T.text,
          padding: 16,
          borderRadius: 16,
          cursor: "pointer",
          border: `1px solid rgba(139,92,246,.35)`,
          boxShadow: "0 0 28px rgba(139,92,246,.10)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: T.purple }}>{IC.crown}<span style={{ fontWeight: 800, fontSize: 14 }}>Premium</span></div>
          <p style={{ fontSize: 11, color: T.textSec, lineHeight: 1.5, marginBottom: 12 }}>Özel rozetler, temalar ve gelişmiş eşleşmeler seni bekliyor.</p>
          <button style={{ width: "100%", border: "none", background: T.purple, color: "#fff", borderRadius: 11, padding: "9px 0", fontWeight: 800, cursor: "pointer" }}>Sıraya Katıl</button>
        </div>

        <div style={{
          background: T.surfaceAlt,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 12,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
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

function HomePage({ T, nav }) {
  const heroSlides = [
    {
      kicker: "LYVORA NEDİR?",
      title: "ANONİM SOHBET EVRENİ",
      text: "Lyvora, kendini rahatça ifade edebileceğin güvenli ve modern bir sohbet dünyasıdır.",
      sub: "Kimliğini paylaşmadan yeni insanlarla tanış, odalara katıl ve topluluğun parçası ol.",
      primary: "Global Lounge",
      secondary: "Mood Eşleş",
      action: "chat",
      secondAction: "mood"
    },
    {
      kicker: "GÜVENLİ ALAN",
      title: "SAYGILI VE TEMİZ TOPLULUK",
      text: "Kişisel bilgilerini paylaşmadan, kuralları olan güvenli odalarda sohbet edebilirsin.",
      sub: "Rahatsız edenleri bildir, güvenli modla daha temiz bir deneyim yaşa.",
      primary: "Kuralları Gör",
      secondary: "Gizlilik",
      action: "rules",
      secondAction: "privacy"
    },
    {
      kicker: "MOOD & XP",
      title: "HİSSETTİĞİN GİBİ EŞLEŞ",
      text: "Ruh haline göre insanlarla eşleş, mesaj at, oyun oyna ve XP kazan.",
      sub: "Seviye atla, rozetler aç ve Lyvora profilini güçlendir.",
      primary: "Mood Eşleş",
      secondary: "Oyunlar",
      action: "mood",
      secondAction: "games"
    },
  ];
  const [heroSlide, setHeroSlide] = useState(0);
  const activeHero = heroSlides[heroSlide];

  return (
    <div style={{ padding: "10px 14px", width: "100%", maxWidth: "none", boxSizing: "border-box" }}>
      <div className="lyvora-home-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 390px", gap: 18, alignItems: "start", width: "100%", maxWidth: "none" }}>
        <div>
      <div className="lyvora-hero" style={{ background: T.hero, borderRadius: 20, overflow: "hidden", position: "relative", minHeight: 360, display: "flex", alignItems: "center", marginBottom: 22, padding: "44px 52px" }}>
        <Planet />
        {[[30,40],[260,60],[310,120],[60,170],[340,30],[170,190],[390,160],[420,80]].map(([x,y],i)=>(
          <div key={i} style={{ position:"absolute", left:x+380, top:y, width:5+Math.random()*4, height:5+Math.random()*4, borderRadius:"50%", background:"rgba(255,255,255,.15)" }} />
        ))}
        <div style={{ maxWidth: 440, position: "relative", zIndex: 2 }}>
          <p style={{ color: "#9b7cff", fontSize: 11, letterSpacing: 5, marginBottom: 10, fontWeight: 800 }}>{activeHero.kicker}</p>
          <h1 className="lyvora-hero-title" style={{ color: "#fff", fontSize: 38, fontWeight: 900, marginBottom: 14, lineHeight: 1.1, textShadow: "0 8px 30px rgba(139,92,246,.22)" }}>{activeHero.title}</h1>
          <p style={{ color: "#d7d7d7", fontSize: 14, lineHeight: 1.7, marginBottom: 4, maxWidth: 500 }}>{activeHero.text}</p>
          <p style={{ color: "#8f8f8f", fontSize: 13, lineHeight: 1.7, marginBottom: 26, maxWidth: 500 }}>{activeHero.sub}</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 12, border: "1.5px solid rgba(139,92,246,.65)", background: "rgba(139,92,246,.12)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 0 22px rgba(139,92,246,.14)" }} onClick={() => nav(activeHero.action)}>{IC.globe} {activeHero.primary}</button>
            <button style={{ padding: "11px 24px", borderRadius: 12, border: "none", background: "#fff", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer" }} onClick={() => nav(activeHero.secondAction)}>{activeHero.secondary}</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
            {heroSlides.map((s,i)=>(
              <button key={s.title} onClick={() => setHeroSlide(i)} title={s.kicker} style={{
                width: heroSlide === i ? 22 : 7,
                height: 7,
                borderRadius: 999,
                border: "none",
                background: heroSlide === i ? "#fff" : "rgba(255,255,255,.28)",
                cursor: "pointer",
                transition: "all .2s",
                boxShadow: heroSlide === i ? "0 0 18px rgba(139,92,246,.55)" : "none"
              }} />
            ))}
            <span style={{ color: "#8f8f8f", fontSize: 11, marginLeft: 6 }}>{heroSlide + 1}/3 • {activeHero.kicker}</span>
          </div>
        </div>
      </div>

      <div className="lyvora-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(130px,1fr))", gap: 16, marginBottom: 22 }}>
        {[
          { icon: IC.msg, title: "Global Chat", text: "Dünyadan anonim sohbet.", action: () => nav("chat") },
          { icon: IC.game, title: "Oyun Oyna", text: "Mini oyunlar ve ödüller.", action: () => nav("games"), action: () => nav("games") },
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
            <span style={{ fontSize: 12, color: T.textSec, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>Tümünü Gör {IC.arrow}</span>
          </div>
          {[
            { text: "Lyvora Bahar Etkinliği Başladı!", date: "20 Mayıs 2025" },
            { text: "Yeni Mini Oyun: Lyvora Race Yayında!", date: "18 Mayıs 2025" },
            { text: "Sunucu Bakımı Hakkında", date: "17 Mayıs 2025" },
            { text: "Ödül Sistemi Güncellendi!", date: "15 Mayıs 2025" },
          ].map((a) => (
            <div key={a.text} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, flexShrink: 0 }} />
                <span>{a.text}</span>
              </div>
              <span style={{ color: T.textTer, fontSize: 11, whiteSpace: "nowrap", marginLeft: 14 }}>{a.date}</span>
            </div>
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textTer }}>
        <span>© 2025 Lyvora. Tüm hakları saklıdır.</span>
        <div style={{ display: "flex", gap: 20 }}>
          <span onClick={() => nav("rules")} style={{ cursor: "pointer" }}>Kurallar</span>
          <span onClick={() => nav("privacy")} style={{ cursor: "pointer" }}>Gizlilik</span>
          <span onClick={() => nav("terms")} style={{ cursor: "pointer" }}>Şartlar</span>
        </div>
      </div>
        </div>
        <div className="lyvora-home-right"><HomeRightPanel T={T} nav={nav} /></div>
      </div>
    </div>
  );
}


function HomeRightPanel({ T, nav }) {
  return (
    <aside style={{ display: "grid", gap: 16, height: "fit-content" }}>
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 18px 45px rgba(0,0,0,.05)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 850 }}>
            <span style={{ color: T.purple }}>{IC.users}</span> Lyvora'dan Bireyler
          </h3>
          <button onClick={() => nav("chat")} style={{ background: "none", border: "none", color: T.textSec, cursor: "pointer", fontSize: 12 }}>Tümü →</button>
        </div>

        {LYVORA_PEOPLE.map(p => (
          <div key={p.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 0",
            borderBottom: `1px solid ${T.borderLight}`
          }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: p.online ? "linear-gradient(135deg,#8b5cf6,#222)" : T.surfaceAlt,
                color: p.online ? "#fff" : T.textTer,
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                border: `1px solid ${p.online ? "rgba(139,92,246,.5)" : T.border}`
              }}>{p.avatar}</div>
              <span style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: p.online ? T.green : T.textTer,
                border: `2px solid ${T.surface}`
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 12 }}>{p.name}</b>
              <p style={{ fontSize: 11, color: p.online ? T.green : T.textTer, marginTop: 2 }}>{p.status}</p>
            </div>
            <span style={{
              fontSize: 11,
              background: "rgba(139,92,246,.18)",
              color: T.text,
              border: `1px solid rgba(139,92,246,.25)`,
              borderRadius: 10,
              padding: "5px 8px",
              fontWeight: 800
            }}>Lv.{p.level}</span>
          </div>
        ))}

        <button onClick={() => nav("chat")} style={{
          marginTop: 14,
          width: "100%",
          border: `1px solid rgba(139,92,246,.55)`,
          background: "linear-gradient(135deg, rgba(139,92,246,.30), rgba(139,92,246,.12))",
          color: T.text,
          borderRadius: 13,
          padding: "12px 0",
          fontWeight: 850,
          cursor: "pointer"
        }}>Daha Fazlasını Gör →</button>
      </div>

      <div style={{
        background: "linear-gradient(135deg, rgba(139,92,246,.20), rgba(10,10,10,.55))",
        border: `1px solid rgba(139,92,246,.35)`,
        borderRadius: 18,
        padding: 18,
        color: T.text,
        boxShadow: "0 0 35px rgba(139,92,246,.10)"
      }}>
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

      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        padding: 18
      }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 850 }}>{IC.task} Günün Görevi</h3>
        <p style={{ fontSize: 12, color: T.textSec, marginTop: 10 }}>10 kişiye mesaj gönder.</p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textTer, marginTop: 12 }}>
          <span>6 / 10</span><b>XP 250</b>
        </div>
        <div style={{ height: 8, background: T.surfaceAlt, borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
          <div style={{ width: "60%", height: "100%", background: T.purple }} />
        </div>
        <button onClick={() => nav("dm")} style={{ marginTop: 14, width: "100%", border: `1px solid rgba(139,92,246,.4)`, background: "transparent", color: T.text, borderRadius: 12, padding: "10px 0", fontWeight: 800, cursor: "pointer" }}>Göreve Git →</button>
      </div>
    </aside>
  );
}



function Planet() {
  return (
    <div className="lyvora-planet" style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", animation: "lyvoraFloat 5s ease-in-out infinite" }}>
      <div style={{
        width: 310,
        height: 310,
        position: "relative",
        display: "grid",
        placeItems: "center",
        filter: "drop-shadow(0 0 48px rgba(139,92,246,.45))"
      }}>
        <div style={{
          position: "absolute",
          width: 210,
          height: 210,
          borderRadius: 42,
          transform: "rotate(45deg)",
          background: "linear-gradient(135deg, rgba(139,92,246,.28), rgba(255,255,255,.07), rgba(139,92,246,.13))",
          border: "2px solid rgba(139,92,246,.52)",
          boxShadow: "inset 0 0 45px rgba(139,92,246,.18), 0 0 70px rgba(139,92,246,.25)"
        }} />
        <div style={{
          position: "absolute",
          width: 230,
          height: 230,
          borderRadius: "50%",
          background: "radial-gradient(circle at 34% 26%, #5d4a8f, #17171c 52%, #030303)",
          boxShadow: "inset -42px -48px 75px rgba(0,0,0,.82), 0 0 95px rgba(139,92,246,.28)"
        }} />
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 380,
          height: 380,
          borderRadius: "50%",
          border: "12px solid rgba(139,92,246,.42)",
          boxSizing: "border-box",
          animation: "lyvoraRingSpin 8s linear infinite"
        }} />
        <div style={{
          position: "relative",
          zIndex: 3,
          color: "#bda7ff",
          fontSize: 74,
          fontWeight: 950,
          letterSpacing: -5,
          textShadow: "0 0 22px rgba(190,167,255,.98), 0 0 60px rgba(139,92,246,.80)"
        }}>LV</div>
        {[[-120,-88],[-92,104],[120,-58],[112,92],[0,-135]].map(([x,y],i)=>(
          <span key={i} style={{
            position: "absolute",
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            width: 16 + i * 3,
            height: 16 + i * 3,
            borderRadius: 6,
            background: "linear-gradient(135deg,#8b5cf6,#111)",
            transform: `rotate(${i * 28}deg)`,
            opacity: .82,
            boxShadow: "0 0 22px rgba(139,92,246,.35)"
          }} />
        ))}
      </div>
    </div>
  );
}




function GlobalChatPage({ T, addXP }) {
  const emojiList = ["😀", "😂", "🔥", "💜", "🌙", "✨", "👀", "🎮", "🤝", "🚀"];
  const onlineUsers = [
    { id: 1, name: "Nova", mood: "Global", online: true, lastSeen: "şimdi aktif", avatar: "N" },
    { id: 2, name: "Elysia", mood: "Mood", online: true, lastSeen: "şimdi aktif", avatar: "E" },
    { id: 3, name: "Raven", mood: "Gece", online: true, lastSeen: "şimdi aktif", avatar: "R" },
    { id: 4, name: "Mira", mood: "Sakin", online: true, lastSeen: "2 dk önce aktif", avatar: "M" },
    { id: 5, name: "Kairo", mood: "Sessiz", online: false, lastSeen: "18 dk önce", avatar: "K" },
    { id: 6, name: "Lunox", mood: "Chill", online: false, lastSeen: "1 saat önce", avatar: "L" },
  ];

  const [msgs, setMsgs] = useState([
    { id: 1, name: "Nova", mood: "Global", text: "Lyvora Global Chat aktif. Herkes hoş geldi 💜", mine: false, time: "22:14", seen: true, online: true },
    { id: 2, name: "Elysia", mood: "Mood", text: "Mood eşleşme sistemi baya iyi olmuş.", mine: false, time: "22:15", seen: true, online: true },
    { id: 3, name: "Sen", mood: "Global", text: "Site artık gerçek app gibi hissettiriyor 🔥", mine: true, time: "22:16", seen: true, online: true },
    { id: 4, name: "Raven", mood: "Gece", text: "Mesaj balonları ve online durumlar çok temiz duruyor.", mine: false, time: "22:17", seen: true, online: true },
  ]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeRoom, setActiveRoom] = useState(1);
  const [lastSeen, setLastSeen] = useState("şimdi aktif");
  const msgEnd = useRef(null);

  const rooms = [
    { id: 1, name: "Global Lounge", count: "4.8K", icon: IC.globe },
    { id: 2, name: "Gece Sohbeti", count: "892", icon: IC.moon },
    { id: 3, name: "Mood Eşleşme", count: "421", icon: IC.spark },
    { id: 4, name: "Mini Oyunlar", count: "286", icon: IC.game },
    { id: 5, name: "Premium Oda", count: "74", icon: IC.crown },
  ];

  const activeRoomData = rooms.find(r => r.id === activeRoom) || rooms[0];

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  useEffect(() => {
    const typingTimer = setInterval(() => {
      setTyping(prev => !prev);
      setLastSeen(prev => prev === "şimdi aktif" ? "az önce aktif" : "şimdi aktif");
    }, 3200);
    return () => clearInterval(typingTimer);
  }, []);

  const timeNow = () => new Date().toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" });

  const send = () => {
    if (!text.trim()) return;

    const now = timeNow();
    const myMsg = {
      id: Date.now(),
      name: "Sen",
      mood: "Global",
      text: text.trim(),
      mine: true,
      time: now,
      seen: false,
      online: true
    };

    setMsgs(prev => [...prev, myMsg]);
    setText("");
    setShowEmoji(false);
    addXP?.(5);
    setTyping(true);

    setTimeout(() => {
      setMsgs(prev => prev.map(m => m.id === myMsg.id ? { ...m, seen: true } : m));
    }, 900);

    setTimeout(() => {
      setTyping(false);
      setMsgs(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          name: "Nova",
          mood: "Global",
          text: "Mesajını gördüm, Lyvora baya premium oldu 👀",
          mine: false,
          time: timeNow(),
          seen: true,
          online: true
        }
      ]);
      addXP?.(2);
    }, 1700);
  };

  const addEmoji = (emoji) => setText(prev => prev + emoji);

  return (
    <div className="lyvora-chat-grid" style={{
      display: "grid",
      gridTemplateColumns: "260px minmax(0, 1fr) 300px",
      gap: 16,
      padding: 18,
      height: "calc(100vh - 64px)",
      boxSizing: "border-box",
      background: T.bg
    }}>
      <aside className="lyvora-chat-rooms" style={{
        background: T.surface,
        borderRadius: 22,
        padding: 16,
        border: `1px solid ${T.border}`,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxShadow: "0 18px 50px rgba(0,0,0,.05)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h3 style={{ fontSize: 11, fontWeight: 900, color: T.textTer, letterSpacing: 1.5 }}>SOHBET ODALARI</h3>
          <button style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            border: `1px solid ${T.border}`,
            background: T.surfaceAlt,
            color: T.text,
            cursor: "pointer",
            display: "grid",
            placeItems: "center"
          }}>{IC.plus}</button>
        </div>

        {rooms.map(r => (
          <button key={r.id} onClick={() => setActiveRoom(r.id)} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 14px",
            borderRadius: 15,
            cursor: "pointer",
            fontSize: 13,
            background: activeRoom === r.id ? "linear-gradient(135deg, rgba(139,92,246,.36), rgba(139,92,246,.12))" : T.surfaceAlt,
            color: activeRoom === r.id ? T.text : T.textSec,
            border: activeRoom === r.id ? `1px solid rgba(139,92,246,.48)` : `1px solid ${T.border}`,
            transition: "all .18s",
            boxShadow: activeRoom === r.id ? "0 0 24px rgba(139,92,246,.12)" : "none"
          }}>
            <span style={{ color: activeRoom === r.id ? T.purple : T.textSec }}>{r.icon}</span>
            <span style={{ flex: 1, fontWeight: activeRoom === r.id ? 850 : 600, textAlign: "left" }}>{r.name}</span>
            <span style={{ fontSize: 10, opacity: .75 }}>{r.count}</span>
          </button>
        ))}

        <div style={{
          marginTop: 16,
          background: "linear-gradient(135deg, rgba(139,92,246,.22), rgba(139,92,246,.06))",
          color: T.text,
          padding: 16,
          borderRadius: 18,
          border: `1px solid rgba(139,92,246,.28)`
        }}>
          <div style={{ color: T.purple }}>{IC.shield}</div>
          <h4 style={{ fontSize: 13, fontWeight: 900, margin: "9px 0 5px" }}>Güvenli Alan</h4>
          <p style={{ fontSize: 11, color: T.textSec, lineHeight: 1.6 }}>
            Kişisel bilgini paylaşma. Rahatsız edenleri bildir. Anonim kal, saygılı kal.
          </p>
        </div>

        <div style={{
          marginTop: "auto",
          background: T.surfaceAlt,
          border: `1px solid ${T.border}`,
          borderRadius: 18,
          padding: 14
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 850, marginBottom: 8 }}>Oda Durumu</h4>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.textSec, marginBottom: 7 }}>
            <span>Aktif kullanıcı</span><b style={{ color: T.green }}>1.248</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.textSec }}>
            <span>Son görülme</span><b>{lastSeen}</b>
          </div>
        </div>
      </aside>

      <main className="lyvora-chat-main" style={{
        background: T.surface,
        borderRadius: 24,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        boxShadow: "0 18px 50px rgba(0,0,0,.05)"
      }}>
        <div className="lyvora-chat-header" style={{
          padding: "18px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${T.borderLight}`,
          background: `linear-gradient(135deg, ${T.surface}, ${T.surfaceAlt})`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              background: "linear-gradient(135deg,#8b5cf6,#111)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 0 26px rgba(139,92,246,.22)"
            }}>{IC.hash}</div>
            <div className="lyvora-chat-title">
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{activeRoomData.name}</h2>
              <p style={{ fontSize: 12, color: T.textSec, marginTop: 4 }}>
                Anonim sohbet • {activeRoomData.count} kişi çevrimiçi • {lastSeen}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{
              border: `1px solid ${T.border}`,
              background: T.surfaceAlt,
              color: T.textSec,
              borderRadius: 12,
              width: 38,
              height: 38,
              display: "grid",
              placeItems: "center",
              cursor: "pointer"
            }}>{IC.search}</button>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(23,201,100,.10)",
              color: T.green,
              borderRadius: 999,
              padding: "8px 15px",
              fontSize: 12,
              fontWeight: 900,
              border: "1px solid rgba(23,201,100,.25)"
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: "0 0 12px rgba(23,201,100,.8)" }} />
              Canlı
            </div>
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "22px 24px 10px",
          background: T.bg
        }}>
          <div style={{
            textAlign: "center",
            marginBottom: 18,
            color: T.textTer,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1
          }}>BUGÜN</div>

          {msgs.map((m) => (
            <div key={m.id} style={{
              display: "flex",
              justifyContent: m.mine ? "flex-end" : "flex-start",
              marginBottom: 18,
              animation: "lyvoraMsgIn .26s ease"
            }}>
              {!m.mine && (
                <div style={{ position: "relative", marginRight: 10, flexShrink: 0 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#8b5cf6,#222)",
                    border: `1px solid rgba(139,92,246,.35)`,
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 12,
                    boxShadow: "0 0 0 3px rgba(23,201,100,.10)"
                  }}>{m.name?.[0] || "A"}</div>
                  <span style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: m.online ? T.green : T.textTer,
                    border: `2px solid ${T.bg}`
                  }} />
                </div>
              )}

              <div className="lyvora-message-bubble" style={{ maxWidth: "72%", position: "relative" }}>
                {!m.mine && (
                  <div style={{ fontSize: 11, color: T.textSec, marginBottom: 5, display: "flex", gap: 8, alignItems: "center" }}>
                    <b style={{ color: T.text }}>{m.name}</b>
                    <span>{m.mood}</span>
                    <span style={{ color: m.online ? T.green : T.textTer }}>{m.online ? "çevrimiçi" : "son görülme: 18 dk"}</span>
                  </div>
                )}

                <div style={{
                  padding: "13px 16px",
                  borderRadius: m.mine ? "18px 18px 5px 18px" : "18px 18px 18px 5px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  background: m.mine
                    ? "linear-gradient(135deg,#8b5cf6,#6d28d9)"
                    : T.surface,
                  color: m.mine ? "#fff" : T.text,
                  border: m.mine ? "none" : `1px solid ${T.border}`,
                  boxShadow: m.mine ? "0 12px 30px rgba(139,92,246,.26)" : "0 8px 20px rgba(0,0,0,.04)"
                }}>
                  <p style={{ margin: 0 }}>{m.text}</p>
                  <div style={{
                    fontSize: 10,
                    opacity: .75,
                    marginTop: 7,
                    display: "flex",
                    justifyContent: m.mine ? "flex-end" : "flex-start",
                    alignItems: "center",
                    gap: 6
                  }}>
                    <span>{m.time}</span>
                    {m.mine && <span style={{ color: m.seen ? "#d8ccff" : "rgba(255,255,255,.55)", fontWeight: 900 }}>{m.seen ? "✓✓" : "✓"}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {typing && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 999,
              padding: "9px 14px",
              fontSize: 12,
              color: T.textSec,
              boxShadow: "0 8px 20px rgba(0,0,0,.04)",
              animation: "lyvoraMsgIn .25s ease"
            }}>
              <span style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(x => (
                  <i key={x} style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: T.purple,
                    display: "block",
                    animation: `lyvoraTypingDot 1s ${x * 0.15}s infinite`
                  }} />
                ))}
              </span>
              Nova yazıyor...
            </div>
          )}

          <div ref={msgEnd} />
        </div>

        <div style={{
          padding: "14px 18px",
          background: T.surface,
          borderTop: `1px solid ${T.borderLight}`,
          position: "relative"
        }}>
          {showEmoji && (
            <div style={{
              position: "absolute",
              left: 18,
              bottom: 72,
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: 10,
              display: "grid",
              gridTemplateColumns: "repeat(5, 36px)",
              gap: 8,
              boxShadow: "0 14px 40px rgba(0,0,0,.18)",
              zIndex: 5
            }}>
              {emojiList.map(e => (
                <button key={e} onClick={() => addEmoji(e)} style={{
                  width: 36,
                  height: 36,
                  border: "none",
                  background: T.surfaceAlt,
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 18
                }}>{e}</button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => setShowEmoji(!showEmoji)} style={{
              width: 43,
              height: 43,
              borderRadius: 13,
              background: T.surfaceAlt,
              color: T.textSec,
              border: `1px solid ${T.border}`,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              fontSize: 18
            }}>😀</button>

            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={`${activeRoomData.name} odasına mesaj yaz...`}
              style={{
                flex: 1,
                border: `1px solid ${T.border}`,
                background: T.surfaceAlt,
                borderRadius: 14,
                padding: "13px 16px",
                fontSize: 13,
                outline: "none",
                color: T.text
              }}
            />

            <button onClick={send} style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 12px 28px rgba(139,92,246,.30)"
            }}>{IC.send}</button>
          </div>
        </div>
      </main>

      <aside className="lyvora-chat-users" style={{
        background: T.surface,
        borderRadius: 22,
        padding: 16,
        border: `1px solid ${T.border}`,
        overflow: "auto",
        boxShadow: "0 18px 50px rgba(0,0,0,.05)"
      }}>
        <h3 style={{ fontSize: 11, fontWeight: 900, color: T.textTer, letterSpacing: 1.5, marginBottom: 12 }}>
          AKTİF KİŞİLER
        </h3>

        {onlineUsers.map(u => (
          <div key={u.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "11px 0",
            borderBottom: `1px solid ${T.borderLight}`
          }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: u.online ? "linear-gradient(135deg,#8b5cf6,#222)" : T.surfaceAlt,
                display: "grid",
                placeItems: "center",
                color: u.online ? "#fff" : T.textTer,
                border: `1px solid ${u.online ? "rgba(139,92,246,.45)" : T.border}`,
                fontWeight: 900,
                boxShadow: u.online ? "0 0 0 3px rgba(23,201,100,.10)" : "none"
              }}>{u.avatar}</div>
              <div style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                background: u.online ? T.green : T.textTer,
                borderRadius: "50%",
                border: `2px solid ${T.surface}`
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
              <div style={{ fontSize: 10, color: u.online ? T.green : T.textTer }}>{u.online ? u.status || "Çevrimiçi" : `son görülme ${u.lastSeen}`}</div>
            </div>
            <span style={{
              fontSize: 10,
              color: T.textSec,
              background: T.surfaceAlt,
              border: `1px solid ${T.border}`,
              borderRadius: 999,
              padding: "4px 8px"
            }}>{u.mood}</span>
          </div>
        ))}

        <div style={{
          marginTop: 16,
          background: "linear-gradient(135deg, rgba(139,92,246,.22), rgba(139,92,246,.06))",
          color: T.text,
          padding: 16,
          borderRadius: 18,
          border: `1px solid rgba(139,92,246,.28)`
        }}>
          <div style={{ color: T.purple }}>{IC.spark}</div>
          <h4 style={{ fontSize: 13, fontWeight: 900, margin: "8px 0 5px" }}>Mood Eşleşme</h4>
          <p style={{ fontSize: 11, color: T.textSec, lineHeight: 1.5, marginBottom: 12 }}>Benzer ruh halinde olan biriyle hızlı sohbet başlat.</p>
          <button style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 12,
            background: T.purple,
            color: "#fff",
            border: "none",
            fontWeight: 900,
            cursor: "pointer",
            fontSize: 12
          }}>Rastgele Eşleş</button>
        </div>
      </aside>
    </div>
  );
}


function themeSafeDark(color) {
  if (color === "#f0f0f0") return "#d8d8d8";
  if (color === "#0a0a0a") return "#202020";
  return color;
}


function DMPage({ T, addXP }) {
  const [active, setActive] = useState(DM_LIST[0]);
  const [dmMsgs, setDmMsgs] = useState({
    1: [
      { text: "Selam nasılsın?", mine: false, time: "22:10" },
      { text: "İyiyim sen?", mine: true, time: "22:11" },
      { text: "Bende iyiyim. Bu platform gerçekten iyi.", mine: false, time: "22:12" },
    ],
    2: [{ text: "Tamam görüşürüz", mine: false, time: "20:00" }],
    3: [{ text: "Bu platform gerçekten güzel", mine: false, time: "18:30" }],
    4: [{ text: "Gg", mine: false, time: "16:00" }],
    5: [{ text: "Yarın görüşelim", mine: false, time: "14:00" }],
  });
  const [text, setText] = useState("");
  const msgEnd = useRef(null);

  const send = () => {
    if (!text.trim()) return;
    const t = new Date().toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" });
    setDmMsgs(prev => ({ ...prev, [active.id]: [...(prev[active.id] || []), { text: text.trim(), mine: true, time: t }] }));
    addXP?.(3);
    setText("");
  };

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMsgs, active]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", height: "calc(100vh - 64px)" }}>
      <aside style={{ background: T.surface, borderRight: `1px solid ${T.border}`, padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontWeight: 700, fontSize: 15 }}>Mesajlar</h2>
          <span style={{ cursor: "pointer", color: T.textSec }}>{IC.edit}</span>
        </div>
        <div style={{ display: "flex", gap: 8, background: T.surfaceAlt, borderRadius: 12, padding: "9px 14px", marginBottom: 14, border: `1px solid ${T.border}` }}>
          {IC.search}<input placeholder="Ara..." style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1, color: T.text }} />
        </div>
        {DM_LIST.map(dm => (
          <div key={dm.id} onClick={() => setActive(dm)} style={{ display: "flex", gap: 10, padding: "10px 10px", borderRadius: 14, cursor: "pointer", marginBottom: 2, background: active.id === dm.id ? T.surfaceAlt : "transparent", alignItems: "center" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.surfaceAlt, border: `1px solid ${T.border}`, display: "grid", placeItems: "center", color: T.textSec, boxShadow: dm.online ? "0 0 0 3px rgba(23,201,100,.10)" : "0 0 0 3px rgba(139,92,246,.06)" }}>{IC.user}</div>
              {dm.online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, background: T.green, borderRadius: "50%", border: `2px solid ${T.surface}` }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{dm.name}</span>
                {dm.unread > 0 && <span style={{ background: T.accent, color: T.accentText, borderRadius: 999, width: 18, height: 18, fontSize: 10, display: "grid", placeItems: "center", fontWeight: 700 }}>{dm.unread}</span>}
              </div>
              <p style={{ fontSize: 12, color: T.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{dm.last}</p>
            </div>
          </div>
        ))}
      </aside>
      <main style={{ display: "flex", flexDirection: "column", background: T.bg }}>
        <div style={{ background: T.surface, padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.surfaceAlt, display: "grid", placeItems: "center", color: T.textSec }}>{IC.user}</div>
            {active.online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, background: T.green, borderRadius: "50%", border: `2px solid ${T.surface}` }} />}
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{active.name}</span>
            <p style={{ fontSize: 12, color: T.textSec }}>{active.online ? "Çevrimiçi" : "Çevrimdışı"} • {active.mood}</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 14, color: T.textSec }}>{IC.search}{IC.more}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 10px" }}>
          {(dmMsgs[active.id] || []).map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{ maxWidth: "65%", padding: "10px 14px", borderRadius: 16, fontSize: 13, lineHeight: 1.55, background: m.mine ? T.accent : T.surface, color: m.mine ? T.accentText : T.text, border: m.mine ? "none" : `1px solid ${T.border}` }}>
                <p style={{ margin: 0 }}>{m.text}</p>
                <div style={{ fontSize: 10, opacity: .65, marginTop: 4, textAlign: m.mine ? "right" : "left", display: "flex", justifyContent: m.mine ? "flex-end" : "flex-start", gap: 5, alignItems: "center" }}>
                  <span>{m.time}</span>
                  {m.mine && <span style={{ color: T.purple, fontWeight: 900 }}>✓✓</span>}
                </div>
              </div>
            </div>
          ))}
          <div ref={msgEnd} />
        </div>
        <div style={{ padding: "14px 20px", background: T.surface, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <button style={{ color: T.textSec, background: "none", border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>{IC.image}</button>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={`${active.name} kişisine mesaj yaz...`} style={{ flex: 1, border: `1px solid ${T.border}`, background: T.surfaceAlt, borderRadius: 12, padding: "11px 16px", fontSize: 13, outline: "none", color: T.text }} />
          <button onClick={send} style={{ width: 42, height: 42, borderRadius: 12, background: T.accent, color: T.accentText, border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>{IC.send}</button>
        </div>
      </main>
    </div>
  );
}

function ProfilePage({ T, user, xp = 0, level = 1, levelProgress = 0 }) {
  const badges = ["Kurucu Üye", "Aktif Sohbetçi", "Mood Ustası", "Gece Kuşu", "100+ Mesaj"];
  return (
    <div style={{ padding: 28 }}>
      <div style={{ background: T.hero, borderRadius: 20, height: 160, position: "relative", marginBottom: 60 }}>
        <div style={{ position: "absolute", bottom: -50, left: 32, width: 96, height: 96, borderRadius: "50%", background: T.accent, border: `4px solid ${T.surface}`, display: "grid", placeItems: "center", color: T.accentText, fontSize: 36, fontWeight: 800 }}>L</div>
        <div style={{ position: "absolute", bottom: 16, right: 20, display: "flex", gap: 10 }}>
          <button style={{ padding: "9px 18px", borderRadius: 12, background: "rgba(255,255,255,.12)", color: "#fff", border: "1px solid rgba(255,255,255,.25)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>{IC.edit} Düzenle</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        <div>
          <div style={{ background: T.surface, borderRadius: 16, padding: 22, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800 }}>{user?.tag || "Lyvora#0001"}</h1>
              <p style={{ color: T.textSec, fontSize: 13, marginTop: 4 }}>{user?.bio || "Anonimlik bizim özgürlüğümüzdür."}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {["Gece modu","Global","Sakin"].map(m => (
                <span key={m} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, padding: "4px 12px", fontSize: 12, color: T.textSec }}>{m}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 14, color: T.textSec }}>
              <span><b style={{ color: T.text, fontWeight: 700 }}>128</b> Mesaj</span>
              <span><b style={{ color: T.text, fontWeight: 700 }}>42</b> Arkadaş</span>
              <span><b style={{ color: T.text, fontWeight: 700 }}>12</b> Sunucu</span>
            </div>
          </div>

          <div style={{ background: T.surface, borderRadius: 16, padding: 22, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>{IC.crown} XP & Seviye</h2>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "center" }}>
              <div style={{ width: 96, height: 96, borderRadius: "50%", background: T.accent, color: T.accentText, display: "grid", placeItems: "center", fontSize: 24, fontWeight: 900 }}>Lv {level}</div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                  <b>{xp} XP</b>
                  <span style={{ color: T.textSec }}>{levelProgress}/100</span>
                </div>
                <div style={{ height: 12, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${levelProgress}%`, height: "100%", background: T.accent }} />
                </div>
                <p style={{ marginTop: 10, color: T.textSec, fontSize: 12 }}>Mesaj atarak ve mini oyun oynayarak XP kazanırsın.</p>
              </div>
            </div>
          </div>

          <div style={{ background: T.surface, borderRadius: 16, padding: 22, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>{IC.shield} Rozetler</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {badges.map(b => (
                <div key={b} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: "8px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>{IC.check} {b}</div>
              ))}
            </div>
          </div>
          <div style={{ background: T.surface, borderRadius: 16, padding: 22, border: `1px solid ${T.border}` }}>
            <h2 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>{IC.msg} Son Aktivite</h2>
            {["Global Lounge'da sohbet etti", "Yeni rozet kazandı: Gece Kuşu", "Mood Eşleşme kullandı", "Mini oyun oynadı"].map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.borderLight}`, fontSize: 13, color: T.textSec, alignItems: "center" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, flexShrink: 0 }} />{a}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ background: T.surface, borderRadius: 16, padding: 20, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Seviye 63</span>
              <span style={{ fontSize: 12, color: T.textSec }}>62.400 / 70.000 XP</span>
            </div>
            <div style={{ background: T.surfaceAlt, borderRadius: 999, height: 8, overflow: "hidden" }}>
              <div style={{ width: "89%", height: "100%", background: T.accent, borderRadius: 999 }} />
            </div>
            <p style={{ fontSize: 12, color: T.textTer, marginTop: 8 }}>Sonraki seviye: 7.600 XP kaldı</p>
          </div>
          <div style={{ background: T.surface, borderRadius: 16, padding: 20, border: `1px solid ${T.border}`, marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Durum</h3>
            {[["Çevrimiçi", T.green], ["Meşgul", "#f59e0b"], ["Rahatsız Etme", T.red], ["Görünmez", T.textTer]].map(([s, c]) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", cursor: "pointer", fontSize: 13 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />{s}
              </div>
            ))}
          </div>
          <div style={{ background: T.surface, borderRadius: 16, padding: 20, border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: 14 }}>Arkadaşlar</h3>
              <span style={{ fontSize: 12, color: T.textSec, cursor: "pointer" }}>Tümü</span>
            </div>
            {FRIENDS.slice(0, 4).map(f => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.surfaceAlt, display: "grid", placeItems: "center", color: T.textSec }}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                  {f.online && <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, background: T.green, borderRadius: "50%", border: `2px solid ${T.surface}` }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: T.textTer }}>{f.mood}</div>
                </div>
                <span style={{ cursor: "pointer", color: T.textSec }}>{IC.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServersPage({ T, nav }) {
  const [tab, setTab] = useState("keşfet");
  const categories = ["Tümü", "Lokasyon", "Mood", "Oyun", "Hobi", "Teknoloji"];
  const [cat, setCat] = useState("Tümü");
  const filtered = cat === "Tümü" ? SERVER_LIST : SERVER_LIST.filter(s => s.category === cat);
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Sunucular</h1>
        <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12, background: T.accent, color: T.accentText, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>{IC.plus} Sunucu Oluştur</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.surfaceAlt, borderRadius: 12, padding: 4, width: "fit-content", border: `1px solid ${T.border}` }}>
        {["keşfet", "katıldıklarım"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: tab === t ? T.surface : "transparent", color: tab === t ? T.text : T.textSec, fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontSize: 13, boxShadow: tab === t ? `0 1px 4px rgba(0,0,0,.08)` : "none" }}>
            {t === "keşfet" ? "Keşfet" : "Katıldıklarım"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 14px", borderRadius: 999, border: `1px solid ${cat === c ? T.accent : T.border}`, background: cat === c ? T.accent : "transparent", color: cat === c ? T.accentText : T.textSec, fontSize: 12, fontWeight: cat === c ? 700 : 400, cursor: "pointer" }}>{c}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {filtered.map(s => {
          const iconEl = { pin: IC.pin, moon: IC.moon, game: IC.game, spark: IC.spark, smile: IC.smile, zap: IC.zap }[s.icon] || IC.server;
          return (
            <div key={s.id} style={{ background: T.surface, borderRadius: 16, padding: 20, border: `1px solid ${T.border}`, cursor: "pointer" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: T.surfaceAlt, display: "grid", placeItems: "center", color: T.textSec, marginBottom: 14 }}>{iconEl}</div>
              <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{s.name}</h3>
              <p style={{ fontSize: 12, color: T.textSec, marginBottom: 14 }}>{s.members.toLocaleString("tr")} üye • {s.category}</p>
              <button style={{ width: "100%", padding: "9px 0", borderRadius: 10, background: T.accent, color: T.accentText, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Katıl</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeaderboardPage({ T }) {
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>{IC.trophy} Sıralamalar</h1>
        <div style={{ fontSize: 13, color: T.textSec }}>Bu hafta • Güncellendi: 5dk önce</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 1fr", gap: 12, marginBottom: 24, alignItems: "flex-end" }}>
        {[LEADERBOARD[1], LEADERBOARD[0], LEADERBOARD[2]].map((u, i) => {
          const heights = [140, 170, 120];
          const colors = ["#C0C0C0","#FFD700","#CD7F32"];
          const pos = [2, 1, 3];
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
        {LEADERBOARD.slice(3).map((u) => (
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


function MiniGamesPage({ T, addXP, xp, level, levelProgress }) {
  const [game, setGame] = useState("reaction");

  const games = [
    { id: "reaction", title: "Tepki Testi", text: "Yeşil olunca tıkla, refleksini ölç.", icon: IC.zap },
    { id: "guess", title: "Sayı Tahmin", text: "1-100 arasında gizli sayıyı bul.", icon: IC.search },
    { id: "memory", title: "Hafıza Kartları", text: "Aynı sembolleri eşleştir.", icon: IC.spark },
    { id: "rps", title: "Taş Kağıt Makas", text: "Bilgisayara karşı hızlı maç yap.", icon: IC.game },
    { id: "clicker", title: "Lyvora Clicker", text: "Tıkla, XP kazan, seviye atla.", icon: IC.crown },
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{
        background: T.hero,
        color: "#fff",
        borderRadius: 22,
        padding: "32px 34px",
        marginBottom: 20,
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", right: 36, top: 22, opacity: .08, fontSize: 130, fontWeight: 900 }}>LV</div>
        <p style={{ fontSize: 11, letterSpacing: 4, color: "#888", marginBottom: 8 }}>LYVORA ARCADE</p>
        <h1 style={{ fontSize: 32, fontWeight: 850, marginBottom: 8 }}>Mini Oyunlar</h1>
        <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, maxWidth: 520 }}>
          Kısa oyunlar oyna, skorunu gör, XP sistemine hazırlık yap. Şimdilik demo modda çalışır.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 11, color: T.textTer, marginBottom: 5 }}>SEVİYE</p>
          <b style={{ fontSize: 24 }}>Lv {level}</b>
        </div>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 11, color: T.textTer, marginBottom: 5 }}>TOPLAM XP</p>
          <b style={{ fontSize: 24 }}>{xp}</b>
        </div>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 11, color: T.textTer, marginBottom: 8 }}>SONRAKİ LEVEL</p>
          <div style={{ height: 9, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${levelProgress}%`, height: "100%", background: T.accent }} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        <aside style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 14, height: "fit-content" }}>
          {games.map(g => (
            <div key={g.id} onClick={() => setGame(g.id)} style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "13px 14px",
              borderRadius: 14,
              cursor: "pointer",
              marginBottom: 7,
              background: game === g.id ? T.accent : T.surfaceAlt,
              color: game === g.id ? T.accentText : T.text,
              border: game === g.id ? "none" : `1px solid ${T.border}`
            }}>
              <span style={{ color: game === g.id ? T.accentText : T.textSec }}>{g.icon}</span>
              <div>
                <b style={{ fontSize: 13 }}>{g.title}</b>
                <p style={{ fontSize: 11, opacity: .65, marginTop: 2 }}>{g.text}</p>
              </div>
            </div>
          ))}
        </aside>

        <main style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 20, minHeight: 520 }}>
          {game === "reaction" && <ReactionGame T={T} addXP={addXP} />}
          {game === "guess" && <GuessGame T={T} addXP={addXP} />}
          {game === "memory" && <MemoryGame T={T} addXP={addXP} />}
          {game === "rps" && <RpsGame T={T} addXP={addXP} />}
          {game === "clicker" && <ClickerGame T={T} addXP={addXP} />}
        </main>
      </div>
    </div>
  );
}

function GameHeader({ T, icon, title, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: T.accent, color: T.accentText, display: "grid", placeItems: "center" }}>{icon}</div>
      <div>
        <h2 style={{ fontSize: 19, fontWeight: 800 }}>{title}</h2>
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
    setScore(null);
    setState("wait");
    const delay = 1200 + Math.random() * 2600;
    timer.current = setTimeout(() => {
      setStartTime(Date.now());
      setState("go");
    }, delay);
  };

  const clickBox = () => {
    if (state === "wait") {
      clearTimeout(timer.current);
      setState("tooSoon");
      return;
    }
    if (state === "go") {
      const result = Date.now() - startTime;
      setScore(result);
      setBest(prev => prev === null ? result : Math.min(prev, result));
      addXP?.(result < 300 ? 25 : result < 500 ? 15 : 8);
      setState("done");
    }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const label = state === "idle" ? "Başlamak için tıkla" : state === "wait" ? "Bekle... yeşil olunca tıkla" : state === "go" ? "ŞİMDİ TIKLA!" : state === "tooSoon" ? "Çok erken tıkladın!" : "Tekrar dene";
  const bg = state === "go" ? "#17c964" : state === "tooSoon" ? "#f31260" : T.surfaceAlt;
  const color = state === "go" || state === "tooSoon" ? "#fff" : T.text;

  return (
    <div>
      <GameHeader T={T} icon={IC.zap} title="Tepki Testi" text="Refleks süreni milisaniye olarak ölç." />
      <div onClick={state === "idle" || state === "done" || state === "tooSoon" ? begin : clickBox} style={{
        height: 260,
        borderRadius: 20,
        background: bg,
        color,
        display: "grid",
        placeItems: "center",
        border: `1px solid ${T.border}`,
        cursor: "pointer",
        textAlign: "center",
        transition: "all .2s"
      }}>
        <div>
          <h3 style={{ fontSize: 28, fontWeight: 900 }}>{label}</h3>
          {score !== null && <p style={{ marginTop: 10, fontSize: 15 }}>Skor: <b>{score}ms</b></p>}
          {best !== null && <p style={{ marginTop: 6, fontSize: 13, opacity: .75 }}>En iyi skor: {best}ms</p>}
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

  const check = () => {
    const n = Number(guess);
    if (!n || n < 1 || n > 100) {
      setMsg("1-100 arasında geçerli sayı yaz.");
      return;
    }
    setTries(t => t + 1);
    if (n === target) {
      setMsg(`Doğru! ${tries + 1} denemede buldun.`);
      addXP?.(Math.max(10, 60 - tries * 5));
      setWon(true);
    } else if (n < target) {
      setMsg("Daha büyük bir sayı dene.");
    } else {
      setMsg("Daha küçük bir sayı dene.");
    }
    setGuess("");
  };

  const reset = () => {
    setTarget(Math.floor(Math.random() * 100) + 1);
    setGuess("");
    setMsg("Yeni sayı seçildi. Tahmin et.");
    setTries(0);
    setWon(false);
  };

  return (
    <div>
      <GameHeader T={T} icon={IC.search} title="Sayı Tahmin" text="Gizli sayıyı en az denemede bul." />
      <div style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22 }}>
        <p style={{ color: won ? T.green : T.textSec, fontWeight: 700, marginBottom: 14 }}>{msg}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={guess} onChange={e => setGuess(e.target.value)} onKeyDown={e => e.key === "Enter" && check()} placeholder="Tahminin..." style={{
            flex: 1,
            padding: "13px 15px",
            borderRadius: 13,
            border: `1px solid ${T.border}`,
            background: T.surface,
            color: T.text,
            outline: "none"
          }} />
          <button onClick={check} style={{ padding: "0 20px", borderRadius: 13, border: "none", background: T.accent, color: T.accentText, fontWeight: 800, cursor: "pointer" }}>Dene</button>
          <button onClick={reset} style={{ padding: "0 18px", borderRadius: 13, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontWeight: 700, cursor: "pointer" }}>Sıfırla</button>
        </div>
        <p style={{ fontSize: 12, color: T.textTer, marginTop: 14 }}>Deneme: {tries}</p>
      </div>
    </div>
  );
}

function MemoryGame({ T, addXP }) {
  const base = ["LV", "MO", "XP", "GG", "DM", "GL"];
  const makeDeck = () => [...base, ...base].sort(() => Math.random() - .5).map((v, i) => ({ id: i, v, open: false, done: false }));
  const [deck, setDeck] = useState(makeDeck);
  const [pick, setPick] = useState([]);
  const [moves, setMoves] = useState(0);

  const click = (card) => {
    if (card.open || card.done || pick.length === 2) return;
    const opened = deck.map(c => c.id === card.id ? { ...c, open: true } : c);
    const nextPick = [...pick, card.id];
    setDeck(opened);
    setPick(nextPick);

    if (nextPick.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = nextPick.map(id => opened.find(c => c.id === id));
      setTimeout(() => {
        if (a.v === b.v) {
          addXP?.(12);
          setDeck(d => d.map(c => c.id === a.id || c.id === b.id ? { ...c, done: true } : c));
        } else {
          setDeck(d => d.map(c => c.id === a.id || c.id === b.id ? { ...c, open: false } : c));
        }
        setPick([]);
      }, 650);
    }
  };

  const reset = () => {
    setDeck(makeDeck());
    setPick([]);
    setMoves(0);
  };

  const finished = deck.every(c => c.done);

  return (
    <div>
      <GameHeader T={T} icon={IC.spark} title="Hafıza Kartları" text="Aynı kartları bul ve eşleştir." />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <b>Hamle: {moves}</b>
        <button onClick={reset} style={{ border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}>Yenile</button>
      </div>
      {finished && <div style={{ padding: 12, background: T.accent, color: T.accentText, borderRadius: 12, marginBottom: 14, fontWeight: 800 }}>Tebrikler! Tüm kartları eşleştirdin.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {deck.map(card => (
          <button key={card.id} onClick={() => click(card)} style={{
            height: 88,
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            background: card.open || card.done ? T.accent : T.surfaceAlt,
            color: card.open || card.done ? T.accentText : T.textTer,
            fontWeight: 900,
            fontSize: 20,
            cursor: "pointer",
            transition: "all .18s"
          }}>{card.open || card.done ? card.v : "?"}</button>
        ))}
      </div>
    </div>
  );
}

function RpsGame({ T, addXP }) {
  const choices = [
    { id: "taş", label: "Taş" },
    { id: "kağıt", label: "Kağıt" },
    { id: "makas", label: "Makas" },
  ];
  const [result, setResult] = useState("Seçimini yap.");
  const [score, setScore] = useState({ you: 0, bot: 0 });

  const play = (you) => {
    const bot = choices[Math.floor(Math.random() * choices.length)].id;
    let res = "Berabere";
    if ((you === "taş" && bot === "makas") || (you === "kağıt" && bot === "taş") || (you === "makas" && bot === "kağıt")) {
      res = "Kazandın";
      addXP?.(10);
      setScore(s => ({ ...s, you: s.you + 1 }));
    } else if (you !== bot) {
      res = "Kaybettin";
      setScore(s => ({ ...s, bot: s.bot + 1 }));
    }
    setResult(`Sen: ${you} • Bot: ${bot} — ${res}`);
  };

  return (
    <div>
      <GameHeader T={T} icon={IC.game} title="Taş Kağıt Makas" text="Botla kapış, skoru yükselt." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {choices.map(c => (
          <button key={c.id} onClick={() => play(c.id)} style={{
            height: 110,
            borderRadius: 18,
            border: `1px solid ${T.border}`,
            background: T.surfaceAlt,
            color: T.text,
            fontSize: 18,
            fontWeight: 900,
            cursor: "pointer"
          }}>{c.label}</button>
        ))}
      </div>
      <div style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
        <p style={{ fontWeight: 800, marginBottom: 10 }}>{result}</p>
        <p style={{ color: T.textSec, fontSize: 13 }}>Sen {score.you} - {score.bot} Bot</p>
      </div>
    </div>
  );
}

function ClickerGame({ T, addXP }) {
  const [xp, setXp] = useState(0);
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;

  return (
    <div>
      <GameHeader T={T} icon={IC.crown} title="Lyvora Clicker" text="Tıkla, XP kazan, seviye atla." />
      <div style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: T.textSec, marginBottom: 8 }}>Seviye</div>
        <div style={{ fontSize: 54, fontWeight: 950, marginBottom: 8 }}>{level}</div>
        <div style={{ height: 10, background: T.surface, borderRadius: 999, overflow: "hidden", border: `1px solid ${T.border}`, marginBottom: 24 }}>
          <div style={{ width: `${progress}%`, height: "100%", background: T.accent, borderRadius: 999 }} />
        </div>
        <button onClick={() => { setXp(x => x + 7); addXP?.(2); }} style={{
          width: 190,
          height: 190,
          borderRadius: "50%",
          border: "none",
          background: T.accent,
          color: T.accentText,
          fontSize: 24,
          fontWeight: 950,
          cursor: "pointer",
          boxShadow: "0 18px 50px rgba(0,0,0,.18)"
        }}>TIKLA<br /><span style={{ fontSize: 13, opacity: .65 }}>+7 XP</span></button>
        <p style={{ marginTop: 18, color: T.textSec, fontSize: 13 }}>Toplam XP: {xp}</p>
      </div>
    </div>
  );
}

function TasksPage({ T }) {
  const done = TASKS.filter(t => t.done).length;
  const totalXp = TASKS.filter(t => t.done).reduce((a, t) => a + t.xp, 0);
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Görevler & Rozetler</h1>
      <p style={{ color: T.textSec, fontSize: 14, marginBottom: 22 }}>Görevleri tamamla, XP kazan ve seviye atla.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Tamamlanan", value: `${done}/${TASKS.length}`, icon: IC.check },
          { label: "Kazanılan XP", value: totalXp.toLocaleString("tr"), icon: IC.spark },
          { label: "Mevcut Seviye", value: "63", icon: IC.crown },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, borderRadius: 14, padding: 18, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.surfaceAlt, display: "grid", placeItems: "center", color: T.textSec }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: T.textSec }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {TASKS.map(task => (
          <div key={task.id} style={{ background: T.surface, borderRadius: 14, padding: 18, border: `1px solid ${T.border}`, opacity: task.done ? .7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: task.progress !== undefined ? 10 : 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  {task.done
                    ? <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.green, display: "grid", placeItems: "center", color: "#fff" }}><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
                    : <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${T.border}` }} />}
                  <span style={{ fontWeight: 600, fontSize: 14, textDecoration: task.done ? "line-through" : "none", color: task.done ? T.textSec : T.text }}>{task.title}</span>
                </div>
                <span style={{ fontSize: 11, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 999, padding: "2px 8px", color: T.textSec }}>{task.category}</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 13, color: task.done ? T.textSec : T.text, whiteSpace: "nowrap", marginLeft: 10 }}>+{task.xp} XP</span>
            </div>
            {task.progress !== undefined && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textSec, marginBottom: 5 }}>
                  <span>İlerleme</span><span>{task.progress}/{task.total}</span>
                </div>
                <div style={{ background: T.surfaceAlt, borderRadius: 999, height: 6 }}>
                  <div style={{ width: `${(task.progress / task.total) * 100}%`, height: "100%", background: T.accent, borderRadius: 999 }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MoodMatchPage({ T }) {
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(false);
  const [searching, setSearching] = useState(false);
  const doSearch = () => {
    if (!selected) return;
    setSearching(true);
    setTimeout(() => { setSearching(false); setMatched(true); }, 2000);
  };
  const iconMap = { moon: IC.moon, heart: IC.heart, smile: IC.smile, zap: IC.zap, users: IC.users };
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Mood Eşleşme</h1>
      <p style={{ color: T.textSec, fontSize: 14, marginBottom: 24 }}>Şu anki ruh halini seç ve benzer birini bul.</p>
      {!matched ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
            {MOODS.map(m => (
              <div key={m.id} onClick={() => setSelected(m.id)} style={{ background: T.surface, borderRadius: 16, padding: 22, border: `2px solid ${selected === m.id ? T.accent : T.border}`, cursor: "pointer", textAlign: "center", transition: "all .15s", boxShadow: page === item.id ? "0 0 0 3px rgba(139,92,246,.16)" : "none", borderLeft: page === item.id ? `3px solid ${T.purple}` : "3px solid transparent" }}>
                <div style={{ fontSize: 32, marginBottom: 10, display: "flex", justifyContent: "flex-start", color: m.color }}>{iconMap[m.icon]}</div>
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
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-start" }}>
            <button style={{ padding: "12px 24px", borderRadius: 12, background: T.accent, color: T.accentText, border: "none", fontWeight: 700, cursor: "pointer" }}>Sohbet Başlat</button>
            <button onClick={() => { setMatched(false); setSelected(null); }} style={{ padding: "12px 24px", borderRadius: 12, background: T.surfaceAlt, color: T.text, border: `1px solid ${T.border}`, fontWeight: 700, cursor: "pointer" }}>Yeniden Eşleş</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationPage({ T }) {
  const cities = [
    { name: "İstanbul", count: "1.2K", emoji: "🏙" },
    { name: "Ankara", count: "634", emoji: "🏛" },
    { name: "İzmir", count: "421", emoji: "🌊" },
    { name: "Bursa", count: "289", emoji: "🌿" },
    { name: "Antalya", count: "256", emoji: "☀" },
    { name: "Adana", count: "198", emoji: "🌶" },
    { name: "Trabzon", count: "143", emoji: "🍵" },
    { name: "Eskişehir", count: "167", emoji: "🎓" },
    { name: "Diğer TR", count: "894", emoji: "🇹🇷" },
    { name: "Almanya", count: "312", emoji: "🇩🇪" },
    { name: "Hollanda", count: "198", emoji: "🇳🇱" },
    { name: "Diğer Dünya", count: "621", emoji: "🌍" },
  ];
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Lokasyon Odaları</h1>
      <p style={{ color: T.textSec, fontSize: 14, marginBottom: 22 }}>Şehrindeki insanlarla sohbet et.</p>
      <div style={{ background: T.surface, borderRadius: 16, padding: "14px 18px", display: "flex", gap: 10, alignItems: "center", marginBottom: 22, border: `1px solid ${T.border}` }}>
        {IC.pin}<span style={{ fontSize: 13, color: T.textSec }}>Mevcut Konum:</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>İstanbul, Türkiye</span>
        <button style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 10, background: T.accent, color: T.accentText, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Değiştir</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {cities.map(city => (
          <div key={city.name} style={{ background: T.surface, borderRadius: 14, padding: 18, border: `1px solid ${T.border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>{city.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{city.name}</div>
              <div style={{ fontSize: 12, color: T.textSec }}>{city.count} kişi</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PremiumPage({ T }) {
  const plans = [
    { name: "Ücretsiz", price: "₺0", period: "/ay", features: ["Global Lounge erişimi", "5 oda üyeliği", "Temel rozetler", "Standart mood eşleşme"], cta: "Mevcut Plan", current: true },
    { name: "Premium", price: "₺49", period: "/ay", features: ["Tüm ücretsiz özellikler", "Sınırsız oda üyeliği", "Özel rozetler & temalar", "Öncelikli mood eşleşme", "Reklamsız deneyim", "Özel profil efektleri"], cta: "Başla", highlight: true },
    { name: "Pro", price: "₺99", period: "/ay", features: ["Tüm Premium özellikler", "Özel sunucu oluştur", "Analitik dashboard", "Moderatör araçları", "7/24 öncelikli destek"], cta: "Pro'ya Geç" },
  ];
  return (
    <div style={{ padding: 28 }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>Lyvora Premium</h1>
        <p style={{ color: T.textSec, fontSize: 15, maxWidth: 480, margin: 0 }}>Deneyimini bir üst seviyeye taşı. Özel rozetler, öncelikli eşleşme ve çok daha fazlası.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 900, margin: 0 }}>
        {plans.map(plan => (
          <div key={plan.name} style={{ background: plan.highlight ? T.accent : T.surface, borderRadius: 20, padding: 28, border: `2px solid ${plan.highlight ? T.accent : T.border}`, position: "relative", color: plan.highlight ? T.accentText : T.text }}>
            {plan.highlight && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#FFD700", color: "#000", borderRadius: 999, padding: "4px 16px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>EN POPÜLER</div>}
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{plan.name}</h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
              <span style={{ fontSize: 36, fontWeight: 800 }}>{plan.price}</span>
              <span style={{ fontSize: 13, opacity: .65 }}>{plan.period}</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", fontSize: 13, borderBottom: `1px solid ${plan.highlight ? "rgba(255,255,255,.1)" : T.borderLight}` }}>
                  <span style={{ opacity: .7 }}>{IC.check}</span>{f}
                </div>
              ))}
            </div>
            <button style={{ width: "100%", padding: "13px 0", borderRadius: 12, background: plan.highlight ? T.accentText : plan.current ? "transparent" : T.accent, color: plan.highlight ? T.accent : plan.current ? T.textSec : T.accentText, border: plan.current ? `1px solid ${T.border}` : "none", fontWeight: 700, cursor: plan.current ? "default" : "pointer", fontSize: 14 }}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   AUTH SCREEN  — DÜZELTİLDİ
   Sol paneldeki h1 ve açıklama metni artık
   açıkça beyaz renk ile tanımlandı.
═══════════════════════════════════════════ */


function SettingsPage({ T, theme, setTheme, onLogout, user }) {
  const [dmOpen, setDmOpen] = useState(true);
  const [notify, setNotify] = useState(true);
  const [online, setOnline] = useState(true);
  const [safeMode, setSafeMode] = useState(true);
  const [autoMood, setAutoMood] = useState(false);

  const Toggle = ({ value, setValue }) => (
    <button onClick={() => setValue(!value)} style={{
      width: 54,
      height: 30,
      borderRadius: 999,
      border: `1px solid ${T.border}`,
      background: value ? T.purple : T.surfaceAlt,
      padding: 3,
      cursor: "pointer",
      transition: "all .2s"
    }}>
      <div style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: value ? T.accentText : T.textTer,
        transform: value ? "translateX(24px)" : "translateX(0)",
        transition: "all .2s"
      }} />
    </button>
  );

  const SettingRow = ({ icon, title, text, right }) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 0",
      borderBottom: `1px solid ${T.borderLight}`
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 13,
        background: T.surfaceAlt,
        border: `1px solid ${T.border}`,
        color: T.textSec,
        boxShadow: "0 0 0 3px rgba(139,92,246,.07)",
        display: "grid",
        placeItems: "center",
        flexShrink: 0
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{title}</h3>
        <p style={{ fontSize: 12, color: T.textSec, lineHeight: 1.5 }}>{text}</p>
      </div>
      {right}
    </div>
  );

  return (
    <div style={{ padding: 28 }}>
      <div style={{
        background: T.hero,
        color: "#fff",
        borderRadius: 22,
        padding: "34px 36px",
        marginBottom: 18,
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", right: 32, top: 18, opacity: .07, fontSize: 120, fontWeight: 900 }}>LV</div>
        <p style={{ fontSize: 11, letterSpacing: 4, color: "#888", marginBottom: 8 }}>LYVORA PANEL</p>
        <h1 style={{ fontSize: 32, fontWeight: 850, marginBottom: 8 }}>Ayarlar</h1>
        <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, maxWidth: 650 }}>
          Tema, gizlilik, bildirim ve hesap ayarlarını buradan yönetebilirsin.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
        <main style={{ display: "grid", gap: 18 }}>
          <section style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            padding: 22
          }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: 850, marginBottom: 6 }}>
              {IC.settings} Genel Ayarlar
            </h2>
            <p style={{ color: T.textSec, fontSize: 12, marginBottom: 8 }}>Uygulama deneyimini kişiselleştir.</p>

            <SettingRow
              icon={theme === "light" ? IC.sun : IC.moon}
              title="Tema Modu"
              text="Açık ve koyu tema arasında geçiş yap."
              right={
                <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} style={{
                  border: "none",
                  background: T.accent,
                  color: T.accentText,
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 800,
                  cursor: "pointer"
                }}>
                  {theme === "light" ? "Koyu Moda Geç" : "Açık Moda Geç"}
                </button>
              }
            />

            <SettingRow
              icon={IC.bell}
              title="Bildirimler"
              text="Mesaj, görev ve duyuru bildirimlerini göster."
              right={<Toggle value={notify} setValue={setNotify} />}
            />

            <SettingRow
              icon={IC.eye}
              title="Çevrimiçi Durumu"
              text="Diğer kullanıcılar seni çevrimiçi görebilsin."
              right={<Toggle value={online} setValue={setOnline} />}
            />
          </section>

          <section style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            padding: 22
          }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: 850, marginBottom: 6 }}>
              {IC.shield} Gizlilik ve Güvenlik
            </h2>
            <p style={{ color: T.textSec, fontSize: 12, marginBottom: 8 }}>Anonimlik ve güvenli alan ayarları.</p>

            <SettingRow
              icon={IC.msg}
              title="DM İstekleri"
              text="Yeni kişilerin sana özel mesaj göndermesine izin ver."
              right={<Toggle value={dmOpen} setValue={setDmOpen} />}
            />

            <SettingRow
              icon={IC.shield}
              title="Güvenli Mod"
              text="Rahatsız edici içerikler ve şüpheli davranışlar filtrelensin."
              right={<Toggle value={safeMode} setValue={setSafeMode} />}
            />

            <SettingRow
              icon={IC.spark}
              title="Otomatik Mood Önerisi"
              text="Aktiviteye göre mood eşleşme önerileri gösterilsin."
              right={<Toggle value={autoMood} setValue={setAutoMood} />}
            />
          </section>

          <section style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            padding: 22
          }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: 850, marginBottom: 14 }}>
              {IC.lock} Hesap
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
              <button style={{
                border: `1px solid ${T.border}`,
                background: T.surfaceAlt,
                color: T.text,
                borderRadius: 14,
                padding: 16,
                cursor: "pointer",
                textAlign: "left",
                fontWeight: 800
              }}>
                Şifreyi Değiştir
                <p style={{ fontSize: 12, color: T.textSec, fontWeight: 400, marginTop: 5 }}>Hesap güvenliğini güncelle.</p>
              </button>

              <button style={{
                border: `1px solid ${T.border}`,
                background: T.surfaceAlt,
                color: T.text,
                borderRadius: 14,
                padding: 16,
                cursor: "pointer",
                textAlign: "left",
                fontWeight: 800
              }}>
                Verilerimi İndir
                <p style={{ fontSize: 12, color: T.textSec, fontWeight: 400, marginTop: 5 }}>Profil ve etkinlik verilerini görüntüle.</p>
              </button>
            </div>

            <button onClick={onLogout} style={{
              marginTop: 14,
              border: "none",
              background: T.red,
              color: "#fff",
              borderRadius: 14,
              padding: "13px 18px",
              cursor: "pointer",
              fontWeight: 900
            }}>
              Çıkış Yap
            </button>
          </section>
        </main>

        <aside style={{ display: "grid", gap: 18, height: "fit-content" }}>
          <div style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            padding: 22
          }}>
            <h2 style={{ fontSize: 17, fontWeight: 850, marginBottom: 12 }}>Hesap Özeti</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: T.accent, color: T.accentText, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 20 }}>L</div>
              <div>
                <b>{user?.tag || "Lyvora#0001"}</b>
                <p style={{ color: T.textSec, fontSize: 12, marginTop: 3 }}>Anonim profil</p>
              </div>
            </div>

            {[
              ["Tema", theme === "light" ? "Açık" : "Koyu"],
              ["Bildirim", notify ? "Açık" : "Kapalı"],
              ["DM", dmOpen ? "Açık" : "Kapalı"],
              ["Güvenli Mod", safeMode ? "Aktif" : "Pasif"],
            ].map(([a,b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
                <span style={{ color: T.textSec }}>{a}</span>
                <b>{b}</b>
              </div>
            ))}
          </div>

          <div style={{
            background: theme === "dark" ? "linear-gradient(135deg,#171717,#111)" : T.accent,
            color: theme === "dark" ? "#f5f5f5" : T.accentText,
            borderRadius: 18,
            padding: 22,
            border: theme === "dark" ? `1px solid ${T.purple}` : "none",
            boxShadow: theme === "dark" ? "0 0 30px rgba(139,92,246,.12)" : "none"
          }}>
            {IC.crown}
            <h2 style={{ fontSize: 17, fontWeight: 850, margin: "10px 0 6px" }}>Premium Hazır</h2>
            <p style={{ fontSize: 12, opacity: .82, lineHeight: 1.6, color: theme === "dark" ? "#cfcfcf" : "inherit" }}>
              İleride rozetler, özel temalar ve gelişmiş eşleşmeler buraya bağlanacak.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LegalShell({ T, nav, title, subtitle, children }) {
  return (
    <div style={{ padding: 28 }}>
      <div style={{
        background: T.hero,
        color: "#fff",
        borderRadius: 22,
        padding: "34px 36px",
        marginBottom: 18,
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", right: 32, top: 18, opacity: .07, fontSize: 120, fontWeight: 900 }}>LV</div>
        <p style={{ fontSize: 11, letterSpacing: 4, color: "#888", marginBottom: 8 }}>LYVORA LEGAL</p>
        <h1 style={{ fontSize: 32, fontWeight: 850, marginBottom: 8 }}>{title}</h1>
        <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, maxWidth: 650 }}>{subtitle}</p>
        <button onClick={() => nav("home")} style={{
          marginTop: 20,
          padding: "10px 16px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.25)",
          background: "rgba(255,255,255,.08)",
          color: "#fff",
          cursor: "pointer",
          fontWeight: 700
        }}>← Ana Sayfaya Dön</button>
      </div>

      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        padding: 26,
        color: T.text
      }}>
        {children}
      </div>
    </div>
  );
}

function RulesPage({ T, nav }) {
  const rules = [
    ["Saygılı Ol", "Hakaret, aşağılama, nefret söylemi ve toksik davranışlar yasaktır."],
    ["Kişisel Bilgi Paylaşma", "Telefon numarası, adres, şifre, özel fotoğraf veya başkasına ait kişisel bilgileri paylaşma."],
    ["Taciz ve Zorbalık Yasaktır", "Sürekli rahatsız etme, tehdit etme, baskı kurma veya korkutma davranışları kabul edilmez."],
    ["Spam Yapma", "Aynı mesajı tekrar tekrar göndermek, reklam yapmak veya sohbeti bozacak flood davranışları yasaktır."],
    ["Uygunsuz İçerik Paylaşma", "Rahatsız edici, aşırı cinsel veya şiddet içerikli paylaşımlar yapılamaz."],
    ["Güvenli Alanı Koru", "Anonimlik kötüye kullanılamaz. Şüpheli davranışlar raporlanabilir."],
    ["Fake / Bot Hesaplar", "Spam veya sistemi manipüle eden bot hesaplar engellenebilir."],
    ["Oda Kurallarına Uy", "Her odanın özel kuralları olabilir. Odaya katılan kullanıcı bu kuralları kabul eder."],
    ["Moderatör Kararları", "Moderasyon ekibi gerektiğinde mesaj silebilir, kullanıcı susturabilir veya erişim kısıtlayabilir."],
    ["Topluluğa Katkı Sağla", "Lyvora güvenli sosyalleşme, anonim sohbet ve yeni arkadaşlıklar için kurulmuştur."]
  ];

  return (
    <LegalShell T={T} nav={nav} title="Topluluk Kuralları" subtitle="Lyvora’da herkesin güvenli, saygılı ve rahat bir ortamda sohbet edebilmesi için kurallar.">
      <div style={{ display: "grid", gap: 12 }}>
        {rules.map((r, i) => (
          <div key={r[0]} style={{
            display: "grid",
            gridTemplateColumns: "42px 1fr",
            gap: 14,
            background: T.surfaceAlt,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 16
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: T.accent,
              color: T.accentText,
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 13
            }}>{i + 1}</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 5 }}>{r[0]}</h3>
              <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.7 }}>{r[1]}</p>
            </div>
          </div>
        ))}
      </div>
    </LegalShell>
  );
}

function PrivacyPage({ T, nav }) {
  const sections = [
    ["Toplanan Bilgiler", "Lyvora hesap oluşturma, giriş yapma, mesajlaşma, XP kazanımı ve güvenlik için gerekli temel bilgileri işler."],
    ["Mesaj ve Etkileşim Verileri", "Mesajlar, oda aktiviteleri, oyun skorları ve görev ilerlemeleri platform deneyimini sağlamak için kullanılabilir."],
    ["Kişisel Bilgi Güvenliği", "Kullanıcıların özel bilgilerini paylaşmaması önerilir. Güvenlik ihlallerinde moderasyon önlemleri alınabilir."],
    ["Veri Paylaşımı", "Kişisel veriler izinsiz şekilde üçüncü taraflarla paylaşılmaz. Yasal zorunluluklar hariç tutulur."],
    ["Çerezler ve Oturum", "Oturum, tema tercihi ve kullanıcı deneyimi için teknik veriler kullanılabilir."],
    ["Hesap Silme", "Kullanıcı hesabının silinmesini talep ettiğinde, ilgili veriler sistem kurallarına göre kaldırılabilir."],
    ["Güvenlik", "Spam, kötüye kullanım ve bot davranışlarını engellemek için sistem kayıtları incelenebilir."]
  ];

  return (
    <LegalShell T={T} nav={nav} title="Gizlilik Politikası" subtitle="Lyvora kullanıcı gizliliğine önem verir. Bu sayfa hangi verilerin neden kullanılabileceğini açıklar.">
      <div style={{ display: "grid", gap: 14 }}>
        {sections.map(s => (
          <section key={s[0]} style={{
            background: T.surfaceAlt,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 18
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{s[0]}</h2>
            <p style={{ color: T.textSec, lineHeight: 1.8, fontSize: 13 }}>{s[1]}</p>
          </section>
        ))}
      </div>
    </LegalShell>
  );
}

function TermsPage({ T, nav }) {
  const terms = [
    ["Kullanım Kabulü", "Lyvora’yı kullanarak topluluk kurallarını, gizlilik politikasını ve kullanım şartlarını kabul etmiş olursun."],
    ["Hesap Sorumluluğu", "Hesabınla yapılan işlemlerden sen sorumlusun. Şifreni ve özel bilgilerini kimseyle paylaşma."],
    ["Anonim Kullanım", "Anonimlik başkalarını rahatsız etme, tehdit etme veya kuralları ihlal etme hakkı vermez."],
    ["XP ve Ödül Sistemi", "XP, rozet, seviye ve ödül sistemleri platform içi deneyim amaçlıdır. Kötüye kullanımda sıfırlanabilir."],
    ["İçerik Sorumluluğu", "Paylaşılan mesajlardan kullanıcı sorumludur. Kurallara aykırı içerikler kaldırılabilir."],
    ["Erişim Kısıtlaması", "Kuralları ihlal eden kullanıcılar geçici veya kalıcı olarak engellenebilir."],
    ["Değişiklik Hakkı", "Lyvora, platform güvenliği ve deneyimi için şartları güncelleyebilir."]
  ];

  return (
    <LegalShell T={T} nav={nav} title="Kullanım Şartları" subtitle="Lyvora’yı kullanırken kabul edilen temel şartlar ve platform kuralları.">
      <div style={{ display: "grid", gap: 14 }}>
        {terms.map((t, i) => (
          <section key={t[0]} style={{
            background: T.surfaceAlt,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 18
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{i + 1}. {t[0]}</h2>
            <p style={{ color: T.textSec, lineHeight: 1.8, fontSize: 13 }}>{t[1]}</p>
          </section>
        ))}
      </div>
    </LegalShell>
  );
}

function AuthScreen({ T, theme, onLogin, storedUser }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [authName, setAuthName] = useState(storedUser?.name || "Lyvora");
  const [authEmail, setAuthEmail] = useState(storedUser?.email || "demo@lyvora.app");

  const submitAuth = () => {
    const nextUser = storedUser || createLyvoraUser(authName, authEmail);
    onLogin(nextUser);
  };


  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "grid", placeItems: "center", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 28, color: T.text }}>
      <div style={{ width: "100%", maxWidth: 980, background: T.surface, borderRadius: 24, display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden", border: `1px solid ${T.border}`, boxShadow: "0 24px 80px rgba(0,0,0,.12)" }}>

        {/* ── Sol Panel (koyu arka plan) ── */}
        <div style={{ background: "#0a0a0a", padding: 52, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, background: "#fff", borderRadius: 11, display: "grid", placeItems: "center", color: "#000", fontWeight: 800, fontSize: 14 }}>Lᐯ</div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 1, color: "#ffffff" }}>LYVORA</span>
          </div>

          {/* Orta içerik */}
          <div>
            {/* ★ DÜZELTME: h1 açıkça color:"#ffffff" olarak ayarlandı */}
            <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, color: "#ffffff" }}>
              Topluluğa katıl, bağ kur.
            </h1>
            {/* ★ DÜZELTME: açıklama metni daha okunur #cccccc rengiyle */}
            <p style={{ color: "#cccccc", lineHeight: 1.7, fontSize: 14, marginBottom: 28 }}>
              Dünyanın her yerinden insanlarla anonim, güvenli ve mood tabanlı sohbet platformu.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["4.8K Çevrimiçi", "125 Sunucu", "2.4M+ Mesaj"].map(s => (
                <div key={s} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 10, padding: "7px 12px", fontSize: 12, fontWeight: 600, color: "#ffffff" }}>{s}</div>
              ))}
            </div>
          </div>

          <div style={{ color: "#555555", fontSize: 12 }}>© 2025 Lyvora • Gizlilik • Şartlar</div>
        </div>

        {/* ── Sağ Panel (giriş formu) ── */}
        <div style={{ padding: 52, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{mode === "login" ? "Tekrar Hoş Geldin" : "Hesap Oluştur"}</h2>
          <p style={{ color: T.textSec, marginBottom: 28, fontSize: 13 }}>{mode === "login" ? "Hesabına giriş yap ve Lyvora'ya devam et." : "Anonim profilini oluştur ve topluluğa katıl."}</p>

          {mode === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 7 }}>Kullanıcı Adı</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: "11px 14px" }}>
                {IC.user}<input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Anonim#0001" style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1, color: T.text }} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 7 }}>E-posta</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: "11px 14px" }}>
              {IC.mail}<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="mail@example.com" style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1, color: T.text }} />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 7 }}>Şifre</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 12, padding: "11px 14px" }}>
              {IC.lock}<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1, color: T.text }} />
              <span style={{ cursor: "pointer", color: T.textSec }}>{IC.eye}</span>
            </div>
          </div>

          <button onClick={submitAuth} style={{ background: T.accent, color: T.accentText, border: "none", borderRadius: 12, padding: "14px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginBottom: 14 }}>
            {mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
          </button>

          {mode === "login" && (
            <button onClick={submitAuth} style={{ background: "transparent", color: T.textSec, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 0", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8 }}>
              {IC.shield} Anonim olarak devam et
            </button>
          )}

          <p style={{ fontSize: 13, color: T.textSec, textAlign: "center" }}>
            {mode === "login" ? "Hesabın yok mu?" : "Zaten hesabın var mı?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ border: "none", background: "transparent", fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontSize: 13, color: T.text }}>
              {mode === "login" ? "Kayıt ol" : "Giriş yap"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}