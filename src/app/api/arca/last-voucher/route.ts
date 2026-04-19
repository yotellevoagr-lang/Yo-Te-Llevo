
import { NextRequest, NextResponse } from 'next/server';
import { getTA, getCertAndKey, buildLastVoucherQuery, callWSFE, parseLastVoucherResponse } from '@/lib/arca-service';

export async function POST(req: NextRequest) {
    try {
        const { mode = 'homo', cuit, puntoVenta, tipoComprobante } = await req.json();

        const creds = getCertAndKey();
        if (!creds) {
            return NextResponse.json({ error: 'Certificado no configurado', code: 'NO_CERT' }, { status: 400 });
        }

        const { token, sign } = await getTA(mode, creds.certPem, creds.keyPem);
        const soap = buildLastVoucherQuery({ token, sign, cuit }, puntoVenta, tipoComprobante);
        const xml = await callWSFE(mode, soap, 'FECompUltimoAutorizado');
        const lastNumber = parseLastVoucherResponse(xml);

        return NextResponse.json({ success: true, lastNumber });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Error consultando último comprobante' }, { status: 500 });
    }
}
