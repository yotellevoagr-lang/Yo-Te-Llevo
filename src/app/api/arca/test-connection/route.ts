
import { NextRequest, NextResponse } from 'next/server';
import { getTA, getCertAndKey, WSAA_URLS, WSFE_URLS } from '@/lib/arca-service';

export async function POST(req: NextRequest) {
    try {
        const { mode = 'homo' } = await req.json();

        const hasCert = !!(process.env.ARCA_CERT && process.env.ARCA_PRIVATE_KEY);
        if (!hasCert) {
            return NextResponse.json({
                success: false,
                hasCert: false,
                message: 'Certificado digital no configurado en secretos.',
                wsaaUrl: WSAA_URLS[mode],
                wsfeUrl: WSFE_URLS[mode],
            });
        }

        const creds = getCertAndKey()!;

        try {
            await getTA(mode, creds.certPem, creds.keyPem);
            return NextResponse.json({
                success: true,
                hasCert: true,
                message: `Conexión exitosa con ARCA en modo ${mode === 'homo' ? 'Homologación (prueba)' : 'Producción'}.`,
                wsaaUrl: WSAA_URLS[mode],
                wsfeUrl: WSFE_URLS[mode],
            });
        } catch (err: any) {
            return NextResponse.json({
                success: false,
                hasCert: true,
                message: `Error conectando con WSAA: ${err.message}`,
                wsaaUrl: WSAA_URLS[mode],
                wsfeUrl: WSFE_URLS[mode],
            });
        }
    } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
