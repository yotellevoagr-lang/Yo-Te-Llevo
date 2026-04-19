
import { NextRequest, NextResponse } from 'next/server';
import {
    getTA, getCertAndKey,
    buildFECAESolicitar, callWSFE, parseFECAEResponse,
    buildLastVoucherQuery, parseLastVoucherResponse,
    todayARCA,
} from '@/lib/arca-service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            mode = 'homo',
            cuit,
            puntoVenta,
            tipoComprobante,
            concepto = 2,
            docTipo,
            docNro,
            impTotal,
            impNeto,
            impIVA = 0,
            impTrib = 0,
            impOpEx = 0,
            fchServDesde,
            fchServHasta,
            fchVtoPago,
            ivaItems = [],
        } = body;

        const creds = getCertAndKey();
        if (!creds) {
            return NextResponse.json({ error: 'Certificado no configurado', code: 'NO_CERT' }, { status: 400 });
        }

        const { token, sign } = await getTA(mode, creds.certPem, creds.keyPem);
        const auth = { token, sign, cuit };

        const lastSoap = buildLastVoucherQuery(auth, puntoVenta, tipoComprobante);
        const lastXml = await callWSFE(mode, lastSoap, 'FECompUltimoAutorizado');
        const lastNumber = parseLastVoucherResponse(lastXml);
        const nextNumber = lastNumber + 1;

        const fecha = todayARCA();

        const soap = buildFECAESolicitar(auth, {
            puntoVenta,
            tipoComprobante,
            desde: nextNumber,
            hasta: nextNumber,
            concepto,
            docTipo,
            docNro: String(docNro || 0),
            fecha,
            impTotal,
            impNeto,
            impIVA,
            impTrib,
            impOpEx,
            fchServDesde: fchServDesde || fecha,
            fchServHasta: fchServHasta || fecha,
            fchVtoPago: fchVtoPago || fecha,
            ivaItems,
        });

        const xml = await callWSFE(mode, soap, 'FECAESolicitar');
        const result = parseFECAEResponse(xml);

        if (result.errors.length > 0) {
            return NextResponse.json({
                error: result.errors.join(' | '),
                observations: result.observations,
            }, { status: 422 });
        }

        return NextResponse.json({
            success: true,
            cae: result.cae,
            caeExpiration: result.caeExpiration,
            invoiceNumber: nextNumber,
            observations: result.observations,
            fecha,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Error emitiendo factura' }, { status: 500 });
    }
}
