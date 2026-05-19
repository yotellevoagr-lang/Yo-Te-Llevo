"use client";

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

export interface PresenceData {
  sessionId: string;
  userId?: string;
  role?: string;
  path: string;
  lastSeen: Timestamp;
  userAgent?: string;
}

export interface PageViewData {
  id: string;
  path: string;
  timestamp: Timestamp;
  userId?: string;
  role?: string;
}

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = sessionStorage.getItem('ytl_session_id') || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('ytl_session_id', sessionId);
  }
  return sessionId;
}

export async function updatePresence(path: string, userId?: string, role?: string) {
  if (typeof window === 'undefined') return;
  try {
    const sid = getSessionId();
    const ref = doc(db, 'presence', sid);
    await setDoc(ref, {
      sessionId: sid,
      userId: userId || null,
      role: role || 'visitor',
      path,
      lastSeen: serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 100),
    }, { merge: true });
  } catch {}
}

export async function trackPageView(path: string, userId?: string, role?: string) {
  if (typeof window === 'undefined') return;
  try {
    const ref = doc(collection(db, 'page_views'));
    await setDoc(ref, {
      path,
      timestamp: serverTimestamp(),
      userId: userId || null,
      role: role || 'visitor',
    });
  } catch {}
}

// ACTIVE: lastSeen within 5 minutes
export function subscribeToActiveUsers(callback: (users: PresenceData[]) => void): () => void {
  const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
  const q = query(
    collection(db, 'presence'),
    where('lastSeen', '>=', fiveMinutesAgo)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), sessionId: d.id } as PresenceData)));
  }, () => callback([]));
}

export function subscribeToRecentPageViews(callback: (views: PageViewData[]) => void, limitCount = 50): () => void {
  const q = query(
    collection(db, 'page_views'),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as PageViewData)));
  }, () => callback([]));
}

export async function getPageViewStats(days = 7): Promise<Record<string, number>> {
  try {
    const since = Timestamp.fromMillis(Date.now() - days * 24 * 60 * 60 * 1000);
    const q = query(collection(db, 'page_views'), where('timestamp', '>=', since));
    const snap = await getDocs(q);
    const counts: Record<string, number> = {};
    snap.docs.forEach(d => {
      const path = (d.data() as PageViewData).path || '/';
      counts[path] = (counts[path] || 0) + 1;
    });
    return counts;
  } catch {
    return {};
  }
}

export async function cleanupOldPresence() {
  try {
    const tenMinutesAgo = Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
    const q = query(collection(db, 'presence'), where('lastSeen', '<', tenMinutesAgo));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch {}
}
