import { db, auth, hasValidFirebaseConfig } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch, addDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, User as FirebaseAuthUser } from 'firebase/auth';
import type { Tour, Passenger, Reservation, Seller, Employee, CommissionSettings, GeneralSettings, ChatbotNode } from "./types";

// --- Offline Cache & Sync Queue Engine ---

const COL_CACHE_PREFIX = 'ytl_cache_col_';
const DOC_CACHE_PREFIX = 'ytl_cache_doc_';
const SYNC_QUEUE_KEY = 'ytl_offline_sync_queue';
const NETWORK_TIMEOUT_MS = 2500;

export interface OfflineQueueItem {
    id: string;
    action: 'save' | 'delete';
    collectionName: string;
    docId: string;
    data?: any;
    timestamp: number;
}

const isBrowser = () => typeof window !== 'undefined';
const isOffline = () => isBrowser() && !window.navigator.onLine;

// Attach a .toDate() helper onto Date instances or timestamp-like objects so code expecting Firestore Timestamp or Date works identically
function attachTimestampCompatibility(val: any): any {
    if (val instanceof Date) {
        if (typeof (val as any).toDate !== 'function') {
            Object.defineProperty(val, 'toDate', {
                value: () => val,
                enumerable: false,
                configurable: true,
            });
        }
        return val;
    }
    return val;
}

function serializeForCache(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (obj instanceof Date) {
        return { __ytlDate: obj.toISOString() };
    }
    if (typeof obj === 'object' && typeof obj.toDate === 'function') {
        try {
            return { __ytlDate: obj.toDate().toISOString() };
        } catch {
            return null;
        }
    }
    if (typeof obj === 'object' && typeof obj.seconds === 'number' && typeof obj.nanoseconds === 'number') {
        return { __ytlDate: new Date(obj.seconds * 1000).toISOString() };
    }
    if (Array.isArray(obj)) {
        return obj.map(serializeForCache);
    }
    if (typeof obj === 'object') {
        const res: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
            if (obj[key] !== undefined && typeof obj[key] !== 'function') {
                res[key] = serializeForCache(obj[key]);
            }
        }
        return res;
    }
    return obj;
}

function deserializeFromCache(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
        return obj.map(deserializeFromCache);
    }
    if (typeof obj === 'object') {
        if (typeof obj.__ytlDate === 'string') {
            const d = new Date(obj.__ytlDate);
            return attachTimestampCompatibility(d);
        }
        if (typeof obj.seconds === 'number' && typeof obj.nanoseconds === 'number') {
            const d = new Date(obj.seconds * 1000);
            return attachTimestampCompatibility(d);
        }
        const res: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
            res[key] = deserializeFromCache(obj[key]);
        }
        return res;
    }
    return obj;
}

function pruneOldCaches(): void {
    if (!isBrowser()) return;
    try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(DOC_CACHE_PREFIX)) {
                toRemove.push(key);
            }
        }
        for (const k of toRemove) {
            localStorage.removeItem(k);
        }
    } catch {}
}

function mergeWithOfflineQueue<T extends { id: string }>(collectionName: string, items: T[]): T[] {
    const queue = getOfflineQueue().filter(q => q.collectionName === collectionName);
    if (!queue || queue.length === 0) return items;

    const itemMap = new Map<string, T>();
    for (const item of items) {
        itemMap.set(item.id, item);
    }
    for (const qItem of queue) {
        if (qItem.action === 'save' && qItem.data) {
            const existing = itemMap.get(qItem.docId) || ({} as T);
            itemMap.set(qItem.docId, {
                ...existing,
                ...deserializeFromCache(qItem.data),
                id: qItem.docId,
            });
        } else if (qItem.action === 'delete') {
            itemMap.delete(qItem.docId);
        }
    }
    return Array.from(itemMap.values());
}

function getCachedCollection<T extends { id: string }>(collectionName: string): T[] | null {
    if (!isBrowser()) return null;
    try {
        const raw = localStorage.getItem(`${COL_CACHE_PREFIX}${collectionName}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return deserializeFromCache(parsed) as T[];
    } catch {
        return null;
    }
}

function setCachedCollection<T extends { id: string }>(collectionName: string, items: T[]): void {
    if (!isBrowser()) return;
    try {
        const merged = mergeWithOfflineQueue(collectionName, items);
        try {
            localStorage.setItem(`${COL_CACHE_PREFIX}${collectionName}`, JSON.stringify(serializeForCache(merged)));
        } catch (err: any) {
            // QuotaExceededError handling: prune duplicate doc-level caches and retry once
            pruneOldCaches();
            try {
                localStorage.setItem(`${COL_CACHE_PREFIX}${collectionName}`, JSON.stringify(serializeForCache(merged)));
            } catch {
                // If it still exceeds quota, remove this collection cache so it does not leave a stale partial list
                localStorage.removeItem(`${COL_CACHE_PREFIX}${collectionName}`);
                console.warn(`[OfflineCache] Collection ${collectionName} exceeds localStorage quota; live memory data will be used.`);
            }
        }
    } catch (e) {
        console.warn(`[OfflineCache] Could not cache collection ${collectionName}:`, e);
    }
}

function getCachedDoc<T>(collectionName: string, id: string): T | null {
    if (!isBrowser() || !id) return null;
    try {
        const rawDoc = localStorage.getItem(`${DOC_CACHE_PREFIX}${collectionName}_${id}`);
        if (rawDoc) {
            return deserializeFromCache(JSON.parse(rawDoc)) as T;
        }
        const col = getCachedCollection<{ id: string }>(collectionName);
        if (col) {
            const found = col.find(item => item.id === id);
            if (found) return found as unknown as T;
        }
        if (collectionName === 'settings' && id === 'general') {
            const legacy = localStorage.getItem('ytl_general_settings');
            if (legacy) return deserializeFromCache(JSON.parse(legacy)) as T;
        }
        return null;
    } catch {
        return null;
    }
}

function setCachedDoc<T>(collectionName: string, id: string, data: T): void {
    if (!isBrowser() || !id) return;
    try {
        const docWithId = { ...(data as any), id };
        localStorage.setItem(`${DOC_CACHE_PREFIX}${collectionName}_${id}`, JSON.stringify(serializeForCache(docWithId)));
    } catch {
        // ignore quota errors
    }
}

function upsertCachedDoc(collectionName: string, id: string, data: any): void {
    if (!isBrowser() || !id) return;
    try {
        const existingDoc = getCachedDoc<any>(collectionName, id) || {};
        const mergedDoc = { ...existingDoc, ...data, id };
        setCachedDoc(collectionName, id, mergedDoc);

        const col = getCachedCollection<any>(collectionName);
        // CRITICAL FIX: Only update the collection cache if the collection was already cached!
        // Never overwrite ytl_cache_col_ with a 1-item array if the collection was not in cache,
        // because that causes all other items in the collection to disappear!
        if (col && Array.isArray(col) && col.length > 0) {
            const idx = col.findIndex((item: any) => item.id === id);
            let updatedCol: any[];
            if (idx >= 0) {
                updatedCol = [...col];
                updatedCol[idx] = { ...updatedCol[idx], ...data, id };
            } else {
                updatedCol = [...col, mergedDoc];
            }
            try {
                localStorage.setItem(`${COL_CACHE_PREFIX}${collectionName}`, JSON.stringify(serializeForCache(updatedCol)));
            } catch {
                pruneOldCaches();
                try {
                    localStorage.setItem(`${COL_CACHE_PREFIX}${collectionName}`, JSON.stringify(serializeForCache(updatedCol)));
                } catch {
                    localStorage.removeItem(`${COL_CACHE_PREFIX}${collectionName}`);
                }
            }
        }
    } catch (e) {
        console.warn(`[OfflineCache] Failed to upsert local doc ${collectionName}/${id}:`, e);
    }
}

function removeCachedDoc(collectionName: string, id: string): void {
    if (!isBrowser() || !id) return;
    try {
        localStorage.removeItem(`${DOC_CACHE_PREFIX}${collectionName}_${id}`);
        const col = getCachedCollection<any>(collectionName);
        if (col) {
            const filtered = col.filter((item: any) => item.id !== id);
            localStorage.setItem(`${COL_CACHE_PREFIX}${collectionName}`, JSON.stringify(serializeForCache(filtered)));
        }
    } catch (e) {
        console.warn(`[OfflineCache] Failed to remove local doc ${collectionName}/${id}:`, e);
    }
}

export function getOfflineQueue(): OfflineQueueItem[] {
    if (!isBrowser()) return [];
    try {
        const raw = localStorage.getItem(SYNC_QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function setOfflineQueue(queue: OfflineQueueItem[]): void {
    if (!isBrowser()) return;
    try {
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
        window.dispatchEvent(new CustomEvent('ytl-sync-status', { detail: { pendingCount: queue.length } }));
    } catch (e) {
        console.warn('[OfflineQueue] Error saving sync queue:', e);
    }
}

function enqueueOfflineMutation(action: 'save' | 'delete', collectionName: string, docId: string, data?: any): void {
    if (!isBrowser()) return;
    const queue = getOfflineQueue();
    const existingIdx = queue.findIndex(item => item.collectionName === collectionName && item.docId === docId);

    const serializedData = data ? serializeForCache(data) : undefined;

    if (existingIdx >= 0) {
        const prev = queue[existingIdx];
        if (action === 'delete') {
            queue[existingIdx] = {
                id: `${collectionName}_${docId}_${Date.now()}`,
                action: 'delete',
                collectionName,
                docId,
                timestamp: Date.now(),
            };
        } else {
            queue[existingIdx] = {
                ...prev,
                action: 'save',
                data: { ...(prev.data || {}), ...(serializedData || {}) },
                timestamp: Date.now(),
            };
        }
    } else {
        queue.push({
            id: `${collectionName}_${docId}_${Date.now()}`,
            action,
            collectionName,
            docId,
            data: serializedData,
            timestamp: Date.now(),
        });
    }

    setOfflineQueue(queue);
}

function removeOfflineQueueItem(collectionName: string, docId: string): void {
    if (!isBrowser()) return;
    const queue = getOfflineQueue();
    const next = queue.filter(item => !(item.collectionName === collectionName && item.docId === docId));
    if (next.length !== queue.length) {
        setOfflineQueue(next);
    }
}

export function getPendingSyncCount(): number {
    return getOfflineQueue().length;
}

let isSyncingQueue = false;

export async function syncOfflineQueue(): Promise<{ synced: number; remaining: number }> {
    if (!isBrowser() || isOffline() || !hasValidFirebaseConfig || !db) {
        return { synced: 0, remaining: getPendingSyncCount() };
    }
    if (isSyncingQueue) {
        return { synced: 0, remaining: getPendingSyncCount() };
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) {
        return { synced: 0, remaining: 0 };
    }

    isSyncingQueue = true;
    window.dispatchEvent(new CustomEvent('ytl-sync-status', { detail: { syncing: true, pendingCount: queue.length } }));

    let syncedCount = 0;
    const remainingQueue: OfflineQueueItem[] = [];

    for (const item of queue) {
        if (isOffline()) {
            remainingQueue.push(item);
            continue;
        }
        try {
            const docRef = doc(db, item.collectionName, item.docId);
            if (item.action === 'save' && item.data) {
                const revivedData = removeUndefined(deserializeFromCache(item.data));
                delete revivedData.id;
                const res = await raceTimeout(setDoc(docRef, revivedData, { merge: true }), 8000);
                if (res === TIMEOUT_SYMBOL) {
                    remainingQueue.push(item);
                    continue;
                }
            } else if (item.action === 'delete') {
                const res = await raceTimeout(deleteDoc(docRef), 8000);
                if (res === TIMEOUT_SYMBOL) {
                    remainingQueue.push(item);
                    continue;
                }
            }
            syncedCount++;
        } catch {
            remainingQueue.push(item);
        }
    }

    setOfflineQueue(remainingQueue);
    isSyncingQueue = false;

    window.dispatchEvent(
        new CustomEvent('ytl-sync-status', {
            detail: {
                syncing: false,
                syncedCount,
                pendingCount: remainingQueue.length,
            },
        })
    );

    if (syncedCount > 0) {
        window.dispatchEvent(new Event('storage'));
    }

    return { synced: syncedCount, remaining: remainingQueue.length };
}

let isPrefetchScheduled = false;

export async function prefetchCoreDataForOffline(): Promise<void> {
    if (!isBrowser() || isOffline() || !hasValidFirebaseConfig || !db) return;
    if (isPrefetchScheduled) return;
    isPrefetchScheduled = true;

    // Delay background warm-up so active page queries complete first without WebChannel contention
    setTimeout(async () => {
        try {
            if (isOffline()) return;

            const publicCollections = ['tours', 'boarding_points', 'pensions', 'room_types'];
            const publicSettings = ['general', 'layouts', 'geo'];

            for (const col of publicCollections) {
                if (isOffline()) return;
                if (!getCachedCollection(col)) {
                    await getAllFromCollection_client(col);
                }
            }

            for (const docId of publicSettings) {
                if (isOffline()) return;
                if (!getCachedDoc('settings', docId)) {
                    await getDocumentById('settings', docId);
                }
            }

            const role = localStorage.getItem('ytl_auth_role');
            if (role === 'admin' || role === 'employee') {
                const staffCollections = [
                    'reservations',
                    'passengers',
                    'sellers',
                    'employees',
                    'custom_expenses',
                    'external_commissions',
                    'excursions',
                ];
                for (const col of staffCollections) {
                    if (isOffline()) return;
                    if (!getCachedCollection(col)) {
                        await getAllFromCollection_client(col);
                    }
                }
                for (const docId of ['commissions', 'domains', 'arca']) {
                    if (isOffline()) return;
                    if (!getCachedDoc('settings', docId)) {
                        await getDocumentById('settings', docId);
                    }
                }
            }
        } catch {
            // Silent background warm-up
        } finally {
            isPrefetchScheduled = false;
        }
    }, 4000);
}

const TIMEOUT_SYMBOL = Symbol('FIRESTORE_TIMEOUT');

function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMEOUT_SYMBOL> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            resolve(TIMEOUT_SYMBOL);
        }, ms);
        promise
            .then(val => {
                clearTimeout(timer);
                resolve(val);
            })
            .catch(() => {
                clearTimeout(timer);
                resolve(TIMEOUT_SYMBOL);
            });
    });
}

// --- Generic Firestore Functions ---

// Helper function to recursively remove undefined values from an object
const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) {
        return null;
    }
    if (obj instanceof Date) {
        return obj;
    }
    if (typeof obj === 'object' && typeof obj.toDate === 'function') {
        return obj.toDate();
    }
    if (Array.isArray(obj)) {
        return obj.map(removeUndefined);
    }
    if (typeof obj === 'object' && obj.constructor === Object) {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if (value !== undefined) {
                    newObj[key] = removeUndefined(value);
                }
            }
        }
        return newObj;
    }
    return obj;
};

export async function getAllFromCollection<T extends { id: string }>(collectionName: string): Promise<T[]> {
    const cached = getCachedCollection<T>(collectionName);
    if (!hasValidFirebaseConfig || !db || isOffline()) {
        return cached || [];
    }

    const fetchPromise = getDocs(collection(db, collectionName)).then(querySnapshot => {
        const items = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
        const merged = mergeWithOfflineQueue(collectionName, items);
        setCachedCollection(collectionName, merged);
        return merged;
    });

    // Keep background cache update safe from unhandled rejections
    fetchPromise.catch(() => {});

    const timeoutMs = cached && cached.length > 0 ? 5000 : 15000;
    const result = await raceTimeout(fetchPromise, timeoutMs);
    if (result === TIMEOUT_SYMBOL) {
        return cached || [];
    }
    return result;
}

export async function getAllFromCollection_client<T extends { id: string }>(collectionName: string): Promise<T[]> {
    return getAllFromCollection<T>(collectionName);
}

export async function getDocumentById<T>(collectionName: string, id: string): Promise<T | null> {
    if (!id) return null;
    const cached = getCachedDoc<T>(collectionName, id);
    if (!hasValidFirebaseConfig || !db || isOffline()) {
        return cached;
    }

    const docRef = doc(db, collectionName, id);
    const fetchPromise = getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as T;
            setCachedDoc(collectionName, id, data);
            return data;
        }
        return null;
    });

    fetchPromise.catch(() => {});

    const timeoutMs = cached ? 5000 : 15000;
    const result = await raceTimeout(fetchPromise, timeoutMs);
    if (result === TIMEOUT_SYMBOL) {
        return cached;
    }
    return result;
}

function generateDocumentId(collectionName: string): string {
    try {
        if (db) {
            return doc(collection(db, collectionName)).id;
        }
    } catch {
        // Fallback if db is unavailable
    }
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

export async function saveDocument<T extends object>(collectionName: string, data: T, docId?: string): Promise<string> {
    const dataWithoutId = { ...data };
    if ('id' in dataWithoutId) {
        delete (dataWithoutId as any).id;
    }

    const cleanedData = removeUndefined(dataWithoutId);
    const finalId = docId || (data as any)?.id || generateDocumentId(collectionName);

    // 1. Optimistically update local cache immediately so offline UI & subsequent reads see the change right away
    upsertCachedDoc(collectionName, finalId, cleanedData);

    // 2. If offline or no valid Firebase config, queue for sync and return immediately without blocking
    if (!hasValidFirebaseConfig || !db || isOffline()) {
        enqueueOfflineMutation('save', collectionName, finalId, cleanedData);
        if (db && hasValidFirebaseConfig) {
            const docRef = doc(db, collectionName, finalId);
            setDoc(docRef, cleanedData, { merge: true }).catch(() => {});
        }
        return finalId;
    }

    // 3. Online: try to persist to Firestore with a fast timeout so flaky connections never hang the UI
    const docRef = doc(db, collectionName, finalId);
    const writePromise = setDoc(docRef, cleanedData, { merge: true });
    writePromise.catch(() => {});

    const result = await raceTimeout(writePromise, NETWORK_TIMEOUT_MS);
    if (result === TIMEOUT_SYMBOL) {
        enqueueOfflineMutation('save', collectionName, finalId, cleanedData);
    } else {
        removeOfflineQueueItem(collectionName, finalId);
    }

    return finalId;
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
    if (!id) return;

    // 1. Optimistically remove from local cache immediately
    removeCachedDoc(collectionName, id);

    // 2. If offline, enqueue deletion and return immediately
    if (!hasValidFirebaseConfig || !db || isOffline()) {
        enqueueOfflineMutation('delete', collectionName, id);
        if (db && hasValidFirebaseConfig) {
            const docRef = doc(db, collectionName, id);
            deleteDoc(docRef).catch(() => {});
        }
        return;
    }

    // 3. Online: attempt delete with fast timeout
    const docRef = doc(db, collectionName, id);
    const delPromise = deleteDoc(docRef);
    delPromise.catch(() => {});

    const result = await raceTimeout(delPromise, NETWORK_TIMEOUT_MS);
    if (result === TIMEOUT_SYMBOL) {
        enqueueOfflineMutation('delete', collectionName, id);
    } else {
        removeOfflineQueueItem(collectionName, id);
    }
}


// --- Specific Logic ---

export async function getChatbotNode(nodeId: string): Promise<ChatbotNode | null> {
    return getDocumentById<ChatbotNode>('chatbot_flows', nodeId);
}

export async function isUsernameUnique(username: string, currentUserId?: string): Promise<boolean> {
    if (!username) return false;

    const checkCachedCollection = (colName: string): boolean => {
        const cached = getCachedCollection<any>(colName) || [];
        const matches = cached.filter(item => item.username === username);
        if (matches.length === 0) return true;
        return matches.every(item => item.id === currentUserId);
    };

    if (isOffline() || !hasValidFirebaseConfig || !db) {
        return (
            checkCachedCollection('passengers') &&
            checkCachedCollection('employees') &&
            checkCachedCollection('admin')
        );
    }

    const checkCollection = async (colName: string) => {
        const q = query(collection(db, colName), where("username", "==", username));
        const querySnapshot = await raceTimeout(getDocs(q), 6000);
        if (querySnapshot === TIMEOUT_SYMBOL) {
            return checkCachedCollection(colName);
        }
        if (querySnapshot.empty) return true;
        return querySnapshot.docs.every(d => d.id === currentUserId);
    };

    const isUniqueInPassengers = await checkCollection('passengers');
    const isUniqueInEmployees = await checkCollection('employees');
    const isUniqueInAdmin = await checkCollection('admin');

    return isUniqueInPassengers && isUniqueInEmployees && isUniqueInAdmin;
}

export async function isDniUnique(dni: string, currentUserId?: string): Promise<boolean> {
    if (!dni || dni.trim() === '') return true;

    const checkCached = (): boolean => {
        const cachedPassengers = getCachedCollection<Passenger>('passengers') || [];
        const matching = cachedPassengers.filter(p => p.dni === dni);
        if (matching.length === 0) return true;
        if (currentUserId && matching.every(p => p.id === currentUserId)) return true;
        for (const passenger of matching) {
            if (passenger.id !== currentUserId && passenger.email && passenger.email.trim() !== '') {
                return false;
            }
        }
        return true;
    };

    if (isOffline() || !hasValidFirebaseConfig || !db) {
        return checkCached();
    }

    const q = query(collection(db, 'passengers'), where('dni', '==', dni));
    const querySnapshot = await raceTimeout(getDocs(q), 6000);
    if (querySnapshot === TIMEOUT_SYMBOL) {
        return checkCached();
    }

    if (querySnapshot.empty) {
        return true;
    }

    if (currentUserId && querySnapshot.docs.every(d => d.id === currentUserId)) {
        return true;
    }
    
    for (const d of querySnapshot.docs) {
        const passenger = d.data() as Passenger;
        if (d.id !== currentUserId && passenger.email && passenger.email.trim() !== '') {
            return false; 
        }
    }
    
    return true;
}


// --- Authentication Logic ---

type UserRole = 'client' | 'admin' | 'employee';

type HandleLoginResponse = {
  user: Passenger | Employee;
  firebaseUser: FirebaseAuthUser;
  availableRoles: UserRole[];
  primaryRole: UserRole;
  profilesToSelect?: { user: Passenger | Employee; role: UserRole }[];
};


export async function handleLogin(identifier: string, password_provided: string): Promise<HandleLoginResponse> {
    if (isOffline()) {
        throw new Error("El inicio de sesión requiere conexión a internet.");
    }

    let allFoundRecords: { user: Passenger | Employee, role: UserRole }[] = [];
    const foundUserIds = new Set<string>();

    const collectionsToSearch: { name: 'admin' | 'employees' | 'passengers', role: 'admin' | 'employee' | 'client'}[] = [
        { name: 'passengers', role: 'client' },
        { name: 'employees', role: 'employee' },
        { name: 'admin', role: 'admin' }
    ];
    
    for (const colInfo of collectionsToSearch) {
        const queries = [
            query(collection(db, colInfo.name), where("email", "==", identifier)),
            query(collection(db, colInfo.name), where("dni", "==", identifier)),
            query(collection(db, colInfo.name), where("username", "==", identifier))
        ];

        for (const q of queries) {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                querySnapshot.docs.forEach(userDoc => {
                    if (!foundUserIds.has(userDoc.id)) {
                        const userData = { id: userDoc.id, ...userDoc.data() } as Passenger | Employee;
                        if ((userData as any).email) {
                            allFoundRecords.push({ user: userData, role: colInfo.role });
                            foundUserIds.add(userDoc.id);
                        }
                    }
                });
            }
        }
    }
    
    const uniqueRecords = allFoundRecords.filter((v,i,a)=>a.findIndex(t=>(t.user.id === v.user.id && t.role === v.role))===i)


    if (uniqueRecords.length === 0) {
        throw new Error("Credenciales incorrectas o la cuenta no existe.");
    }

    const validProfiles: { user: Passenger | Employee, role: UserRole, firebaseUser: FirebaseAuthUser }[] = [];
    
    for (const record of uniqueRecords) {
        try {
            if ((record.user as any).email) {
                const credential = await signInWithEmailAndPassword(auth, (record.user as any).email, password_provided);
                if (credential.user) {
                     if (!credential.user.emailVerified) {
                        const error = new Error("Por favor, verifica tu correo electrónico antes de iniciar sesión.");
                        (error as any).code = 'auth/email-not-verified';
                        throw error;
                    }
                    validProfiles.push({ ...record, firebaseUser: credential.user });
                }
            }
        } catch (error: any) {
            if (error.code === 'auth/email-not-verified') throw error;
        }
    }


    if (validProfiles.length === 0) {
        throw new Error("La contraseña es incorrecta o la cuenta no está verificada.");
    }
    
    if (validProfiles.length > 1) {
        return {
            user: validProfiles[0].user,
            firebaseUser: validProfiles[0].firebaseUser,
            availableRoles: [],
            primaryRole: 'client',
            profilesToSelect: validProfiles.map(p => ({ user: p.user, role: p.role }))
        };
    }

    const authenticatedProfile = validProfiles[0];
    const { user: mainUser, firebaseUser } = authenticatedProfile;

    const [adminUser, employeeUser, passengerUser] = await Promise.all([
        getDocumentById<Employee>('admin', firebaseUser.uid),
        getDocumentById<Employee>('employees', firebaseUser.uid),
        getDocumentById<Passenger>('passengers', firebaseUser.uid)
    ]);
    
    const finalUserRecords: { user: Passenger | Employee, role: UserRole }[] = [];
    if (adminUser) finalUserRecords.push({ user: adminUser, role: 'admin'});
    if (employeeUser) finalUserRecords.push({ user: employeeUser, role: 'employee'});
    if (passengerUser) finalUserRecords.push({ user: passengerUser, role: 'client'});

    const availableRoles = [...new Set(finalUserRecords.map(r => r.role))];
    const primaryRecord = finalUserRecords.find(r => r.role === 'admin') || finalUserRecords.find(r => r.role === 'employee') || finalUserRecords.find(r => r.user.id === mainUser.id) || finalUserRecords[0];
    
    if (!primaryRecord) {
        throw new Error("No se pudo encontrar un perfil para el usuario autenticado.");
    }

    return { user: primaryRecord.user, firebaseUser, availableRoles, primaryRole: primaryRecord.role };
}


export async function resendVerificationEmail(identifier: string, password_provided: string): Promise<void> {
    const actionCodeSettings = {
        url: `${window.location.origin}/auth/action`,
        handleCodeInApp: true,
    };
    
    try {
        await handleLogin(identifier, password_provided);
    } catch (error: any) {
        if (error.code === 'auth/email-not-verified') {
            let emailToSend: string | undefined;
             const collectionsToSearch: ('admin' | 'employees' | 'passengers')[] = ['admin', 'employees', 'passengers'];
            for (const colName of collectionsToSearch) {
                const queries = [
                    query(collection(db, colName), where("email", "==", identifier)),
                    query(collection(db, colName), where("dni", "==", identifier)),
                    query(collection(db, colName), where("username", "==", identifier))
                ];
                for (const q of queries) {
                    const snapshot = await getDocs(q);
                    const userDoc = snapshot.docs[0];
                    if (userDoc?.data()?.email) {
                        emailToSend = userDoc.data().email;
                        break;
                    }
                }
                if (emailToSend) break;
            }
            
            if (!emailToSend) {
                throw new Error("No se pudo encontrar un correo asociado a este usuario para reenviar la verificación.");
            }
            const userCredential = await signInWithEmailAndPassword(auth, emailToSend, password_provided);
            if (userCredential.user && !userCredential.user.emailVerified) {
                 await sendEmailVerification(userCredential.user, actionCodeSettings);
            }
        } else {
            throw error;
        }
    }
}


export async function registerPassenger(formData: { username: string; firstName: string; lastName: string; email: string; password: string; dni: string; }): Promise<void> {
    if (isOffline()) {
        throw new Error("El registro de nuevas cuentas requiere conexión a internet.");
    }
    if (!formData.username || !formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.dni) {
        throw new Error("Todos los campos son obligatorios.");
    }
    const passError = validatePassword(formData.password);
    if (passError) throw new Error(passError);

    const isUniqueUser = await isUsernameUnique(formData.username);
    if (!isUniqueUser) throw new Error("El nombre de usuario ya está en uso.");
    
    const isDniAvailable = await isDniUnique(formData.dni);
    if (!isDniAvailable) {
        throw new Error("Este DNI ya está registrado con una cuenta de correo electrónico. Por favor, inicia sesión.");
    }
    
    const dniQuery = query(collection(db, "passengers"), where("dni", "==", formData.dni));
    const querySnapshot = await getDocs(dniQuery);
    const existingPassengerDoc = querySnapshot.docs.find(d => !d.data().email);

    const baseFamilyName = `Familia ${formData.lastName}`.trim();
    let familyName = baseFamilyName;
    let suffix = 2;
    while (true) {
        const fq = query(collection(db, 'passengers'), where('family', '==', familyName));
        const fsnap = await getDocs(fq);
        if (fsnap.empty) break;
        const hasConflict = fsnap.docs.some(d => {
            const data = d.data();
            return data.familyOwner && data.familyOwner !== existingPassengerDoc?.id;
        });
        if (!hasConflict) break;
        familyName = `${baseFamilyName} ${suffix}`;
        suffix++;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    const authUser = userCredential.user;
    
    if (existingPassengerDoc) {
        const batch = writeBatch(db);
        const newDocRef = doc(db, "passengers", authUser.uid);
        batch.set(newDocRef, {
            ...existingPassengerDoc.data(),
            id: authUser.uid,
            fullName: `${formData.firstName} ${formData.lastName}`.trim(),
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.username,
            email: formData.email,
            family: existingPassengerDoc.data().family || familyName,
            familyOwner: authUser.uid,
        });
        batch.delete(doc(db, "passengers", existingPassengerDoc.id));
        await batch.commit();
    } else {
        await saveDocument('passengers', {
            id: authUser.uid,
            fullName: `${formData.firstName} ${formData.lastName}`.trim(),
            firstName: formData.firstName,
            lastName: formData.lastName,
            dni: formData.dni,
            email: formData.email,
            username: formData.username,
            family: familyName,
            familyOwner: authUser.uid,
            nationality: 'Argentina',
            tierId: 'adult',
        }, authUser.uid);
    }
    
    const actionCodeSettings = {
        url: `${window.location.origin}/auth/action`,
        handleCodeInApp: true,
    };
    await sendEmailVerification(authUser, actionCodeSettings);

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await setDoc(doc(db, 'verification_codes', authUser.uid), {
        code: verificationCode,
        expiresAt,
        email: formData.email,
        createdAt: new Date(),
    });
}


// --- Google OAuth ---

export async function signInWithGoogle(): Promise<{
    isNewUser: boolean;
    firebaseUser: FirebaseAuthUser;
    firestoreProfile: Passenger | null;
    availableRoles: string[];
}> {
    if (isOffline()) {
        throw new Error("El inicio de sesión con Google requiere conexión a internet.");
    }
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;

    const [adminProfile, employeeProfile, passengerProfile] = await Promise.all([
        getDocumentById<Employee>('admin', firebaseUser.uid),
        getDocumentById<Employee>('employees', firebaseUser.uid),
        getDocumentById<Passenger>('passengers', firebaseUser.uid),
    ]);

    const availableRoles: string[] = [];
    if (adminProfile) availableRoles.push('admin');
    if (employeeProfile) availableRoles.push('employee');
    if (passengerProfile) availableRoles.push('client');

    return {
        isNewUser: availableRoles.length === 0,
        firebaseUser,
        firestoreProfile: passengerProfile,
        availableRoles,
    };
}

export async function completeGoogleRegistration(
    firebaseUser: FirebaseAuthUser,
    profileData: { username: string; firstName: string; lastName: string; dni: string; phone?: string; }
): Promise<void> {
    if (!profileData.username || !profileData.firstName || !profileData.lastName || !profileData.dni) {
        throw new Error("Todos los campos son obligatorios.");
    }

    const isUniqueUser = await isUsernameUnique(profileData.username);
    if (!isUniqueUser) throw new Error("El nombre de usuario ya está en uso.");

    const isDniAvailable = await isDniUnique(profileData.dni);
    if (!isDniAvailable) throw new Error("Este DNI ya está registrado con otra cuenta.");

    const baseFamilyName = `Familia ${profileData.lastName}`.trim();
    let familyName = baseFamilyName;
    let suffix = 2;
    while (true) {
        const fq = query(collection(db, 'passengers'), where('family', '==', familyName));
        const fsnap = await getDocs(fq);
        if (fsnap.empty) break;
        const hasConflict = fsnap.docs.some(d => {
            const data = d.data();
            return data.familyOwner && data.familyOwner !== firebaseUser.uid;
        });
        if (!hasConflict) break;
        familyName = `${baseFamilyName} ${suffix}`;
        suffix++;
    }

    const dniQuery = query(collection(db, 'passengers'), where('dni', '==', profileData.dni));
    const existingSnap = await getDocs(dniQuery);
    const existingDoc = existingSnap.docs.find(d => !d.data().email);

    if (existingDoc) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'passengers', firebaseUser.uid), {
            ...existingDoc.data(),
            id: firebaseUser.uid,
            fullName: `${profileData.firstName} ${profileData.lastName}`.trim(),
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            username: profileData.username,
            email: firebaseUser.email || '',
            phone: profileData.phone || existingDoc.data().phone || '',
            family: existingDoc.data().family || familyName,
            familyOwner: firebaseUser.uid,
        });
        batch.delete(doc(db, 'passengers', existingDoc.id));
        await batch.commit();
    } else {
        await saveDocument('passengers', {
            id: firebaseUser.uid,
            fullName: `${profileData.firstName} ${profileData.lastName}`.trim(),
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            dni: profileData.dni,
            email: firebaseUser.email || '',
            phone: profileData.phone || '',
            username: profileData.username,
            family: familyName,
            familyOwner: firebaseUser.uid,
            nationality: 'Argentina',
            tierId: 'adult',
        }, firebaseUser.uid);
    }
}


export const validatePassword = (pass: string) => {
    if (pass.length < 8) return "Debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(pass)) return "Debe incluir al menos una mayúscula.";
    if (!/[a-z]/.test(pass)) return "Debe incluir al menos una minúscula.";
    if (!/\d/.test(pass)) return "Debe incluir al menos un número.";
    if (!/[^A-Za-z0-9]/.test(pass)) return "Debe incluir al menos un símbolo (ej. !@#$).";
    return null;
}

export async function seedInitialAdmin() {
    if (isOffline() || !hasValidFirebaseConfig || !db) return;
    try {
        const adminEmail = 'admin@yotellevo.com';
        const q = query(collection(db, 'admin'), where('email', '==', adminEmail));
        const adminSnapshot = await raceTimeout(getDocs(q), 8000);
        if (adminSnapshot === TIMEOUT_SYMBOL) return;

        if (adminSnapshot.empty) {
            const adminData: Partial<Employee> = {
                name: 'Administrador',
                username: 'admin',
                email: adminEmail,
            };
            await addDoc(collection(db, "admin"), adminData);
        }
    } catch {
        // Ignore when offline or unauthenticated
    }
}


// --- New Employee Registration Service ---
interface EmployeeRegistrationData {
  tempEmployeeId: string;
  tempEmployeeData: Employee;
  email: string;
  password: string;
  username: string;
  phone: string;
}

export async function handleEmployeeRegistration(data: EmployeeRegistrationData): Promise<HandleLoginResponse> {
  if (isOffline()) {
    throw new Error("El registro de empleados requiere conexión a internet.");
  }
  const { tempEmployeeId, tempEmployeeData, email, password, username, phone } = data;

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const authUser = userCredential.user;

  if (!authUser) {
    throw new Error("La creación del usuario en Firebase Authentication ha fallado.");
  }
  
  const actionCodeSettings = {
    url: `${window.location.origin}/auth/action`,
    handleCodeInApp: true,
  };
  await sendEmailVerification(authUser, actionCodeSettings);

  const batch = writeBatch(db);

  const employeeDocRef = doc(db, 'employees', authUser.uid);
  const employeeData: Employee = {
    ...tempEmployeeData,
    id: authUser.uid,
    email: email,
    username: username,
    phone: phone || tempEmployeeData.phone || '',
  };
  delete (employeeData as any).password;
  batch.set(employeeDocRef, employeeData);

  const nameParts = tempEmployeeData.name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ');

  const passengerDocRef = doc(db, 'passengers', authUser.uid);
  const passengerData: Passenger = {
    id: authUser.uid,
    fullName: tempEmployeeData.name,
    firstName,
    lastName,
    dni: tempEmployeeData.dni,
    email: email,
    username: username,
    phone: phone || tempEmployeeData.phone || '',
    nationality: "Argentina",
    tierId: "adult",
  };
  batch.set(passengerDocRef, passengerData);

  const tempDocRef = doc(db, "employees", tempEmployeeId);
  batch.delete(tempDocRef);

  await batch.commit();

  const loginResponse = await handleLogin(email, password);
  
  return loginResponse;
}


// --- Specific Functions ---
export const getTourById = (id: string): Promise<Tour | null> => getDocumentById<Tour>('tours', id);
export const saveTour = (tour: Partial<Tour>, id?: string): Promise<string> => saveDocument<Tour>('tours', tour as Tour, id);
export const saveReservation = (reservation: Partial<Reservation>, id?: string): Promise<string> => saveDocument<Reservation>('reservations', reservation as Reservation, id);

export const savePassenger = async (passengerData: Partial<Passenger>, id?: string, collectionName: 'passengers' | 'employees' = 'passengers'): Promise<string> => {
    const finalId = id || passengerData.id;
    
    let dobValue: Date | null = null;
    if (passengerData.dob) {
        const dob = passengerData.dob as any;
        if (dob instanceof Date) {
            dobValue = dob;
        } else if (typeof dob.toDate === 'function') {
            dobValue = dob.toDate();
        } else if (typeof dob === 'string' || typeof dob === 'number') {
            const parsedDate = new Date(dob);
            if (!isNaN(parsedDate.getTime())) {
                dobValue = parsedDate;
            }
        }
    }
    
    const dataToSave: Partial<Passenger> = { ...passengerData };
    if (dobValue) {
        dataToSave.dob = dobValue;
    }

    return saveDocument(collectionName, dataToSave, finalId);
};

export const saveCommissionSettings = (settings: CommissionSettings): Promise<string> => saveDocument<CommissionSettings>('settings', settings, 'commissions');
