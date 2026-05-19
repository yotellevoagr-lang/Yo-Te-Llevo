import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

function initAdmin(): boolean {
    if (adminApp && adminDb) return true;
    try {
        const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!key) return false;
        const serviceAccount = JSON.parse(key);
        if (getApps().length === 0) {
            adminApp = initializeApp({ credential: cert(serviceAccount) });
        } else {
            adminApp = getApps()[0];
        }
        adminDb = getFirestore(adminApp);
        return true;
    } catch {
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { code, uid } = await req.json();

        if (!code || !uid) {
            return NextResponse.json({ error: 'Código y UID son requeridos.' }, { status: 400 });
        }

        if (!initAdmin() || !adminDb) {
            return NextResponse.json({ error: 'Servicio de verificación no disponible.' }, { status: 503 });
        }

        const codeDoc = await adminDb.collection('verification_codes').doc(uid).get();
        if (!codeDoc.exists) {
            return NextResponse.json({ error: 'Código no encontrado. Solicitá uno nuevo.' }, { status: 404 });
        }

        const data = codeDoc.data()!;

        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
            await adminDb.collection('verification_codes').doc(uid).delete();
            return NextResponse.json({ error: 'El código expiró. Solicitá uno nuevo.' }, { status: 410 });
        }

        if (data.code !== code) {
            return NextResponse.json({ error: 'Código incorrecto. Verificá e intentá de nuevo.' }, { status: 400 });
        }

        await getAuth(adminApp!).updateUser(uid, { emailVerified: true });
        await adminDb.collection('verification_codes').doc(uid).delete();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
