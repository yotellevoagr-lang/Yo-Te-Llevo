
import { NextRequest, NextResponse } from 'next/server';
import { getTA, getCertAndKey } from '@/lib/arca-service';

export async function POST(req: NextRequest) {
    try {
        const { mode = 'homo' } = await req.json();
        const creds = getCertAndKey();
        if (!creds) {
            return NextResponse.json({
                error: 'Certificado no configurado. Debés crear los secretos ARCA_CERT y ARCA_PRIVATE_KEY en Google Cloud Secret Manager.',
                code: 'NO_CERT',
            }, { status: 400 });
        }

        const { token, sign } = await getTA(mode, creds.certPem, creds.keyPem);
        return NextResponse.json({ success: true, token, sign });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Error de autenticación WSAA' }, { status: 500 });
    }
}
