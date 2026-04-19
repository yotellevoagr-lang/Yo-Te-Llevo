
import forge from 'node-forge';

export const WSAA_URLS = {
    homo: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    prod: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
};
export const WSFE_URLS = {
    homo: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
    prod: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
};

export const VOUCHER_TYPES: Record<number, string> = {
    1: 'Factura A', 2: 'Nota de Débito A', 3: 'Nota de Crédito A',
    6: 'Factura B', 7: 'Nota de Débito B', 8: 'Nota de Crédito B',
    11: 'Factura C', 12: 'Nota de Débito C', 13: 'Nota de Crédito C',
};

export const DOC_TYPES: Record<number, string> = {
    80: 'CUIT', 86: 'CUIL', 89: 'CDI', 96: 'DNI',
    91: 'LE', 92: 'LC', 0: 'Sin doc / Consumidor Final',
};

export const IVA_CONDITIONS: Record<string, string> = {
    '1': 'IVA Responsable Inscripto',
    '4': 'IVA Sujeto Exento',
    '5': 'Consumidor Final',
    '6': 'Responsable Monotributo',
    '7': 'Sujeto No Categorizado',
};

export const IVA_RATES: Record<number, string> = {
    0: '0%', 5: '21%', 4: '10.5%', 6: '27%',
};

let cachedToken: { token: string; sign: string; expiration: Date } | null = null;

function formatDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const tz = '-03:00';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${tz}`;
}

export function buildTRA(service = 'wsfe'): string {
    const now = new Date();
    const gen = new Date(now.getTime() - 600_000);
    const exp = new Date(now.getTime() + 7_200_000);
    const uid = Math.floor(Date.now() / 1000);
    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uid}</uniqueId>
    <generationTime>${formatDate(gen)}</generationTime>
    <expirationTime>${formatDate(exp)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

export function signTRA(tra: string, certPem: string, keyPem: string): string {
    const cert = forge.pki.certificateFromPem(certPem);
    const key = forge.pki.privateKeyFromPem(keyPem);
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(tra, 'utf8');
    p7.addCertificate(cert);
    p7.addSigner({
        key,
        certificate: cert,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [
            { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
            { type: forge.pki.oids.messageDigest },
            { type: forge.pki.oids.signingTime, value: new Date() },
        ],
    });
    p7.sign();
    const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    return forge.util.encode64(der);
}

function extractXml(xml: string, tag: string): string {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
    return m ? m[1].trim() : '';
}

export async function getTA(
    mode: 'homo' | 'prod',
    certPem: string,
    keyPem: string
): Promise<{ token: string; sign: string }> {
    if (cachedToken && cachedToken.expiration > new Date()) {
        return { token: cachedToken.token, sign: cachedToken.sign };
    }

    const tra = buildTRA('wsfe');
    const cms = signTRA(tra, certPem, keyPem);

    const soapEnv = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

    const res = await fetch(WSAA_URLS[mode], {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml;charset=UTF-8', SOAPAction: '' },
        body: soapEnv,
    });

    if (!res.ok) throw new Error(`WSAA HTTP ${res.status}`);
    const xml = await res.text();

    const loginReturn = extractXml(xml, 'loginCmsReturn');
    const token = extractXml(loginReturn, 'token');
    const sign = extractXml(loginReturn, 'sign');
    const expirationRaw = extractXml(loginReturn, 'expirationTime');

    if (!token || !sign) {
        const errMsg = extractXml(xml, 'faultstring') || 'Respuesta inválida de WSAA';
        throw new Error(`WSAA: ${errMsg}`);
    }

    const expiration = expirationRaw ? new Date(expirationRaw) : new Date(Date.now() + 6_000_000);
    cachedToken = { token, sign, expiration };
    return { token, sign };
}

export function buildFECAESolicitar(
    auth: { token: string; sign: string; cuit: string },
    req: {
        puntoVenta: number;
        tipoComprobante: number;
        desde: number;
        hasta: number;
        concepto: number;
        docTipo: number;
        docNro: string;
        fecha: string;
        impTotal: number;
        impNeto: number;
        impIVA: number;
        impTrib: number;
        impOpEx: number;
        fchServDesde?: string;
        fchServHasta?: string;
        fchVtoPago?: string;
        ivaItems?: Array<{ id: number; baseImp: number; importe: number }>;
    }
): string {
    const fmt2 = (n: number) => n.toFixed(2);

    const ivaXml = req.ivaItems && req.ivaItems.length > 0
        ? `<Iva>${req.ivaItems.map(i => `
            <AlicIva>
              <Id>${i.id}</Id>
              <BaseImp>${fmt2(i.baseImp)}</BaseImp>
              <Importe>${fmt2(i.importe)}</Importe>
            </AlicIva>`).join('')}
        </Iva>` : '';

    const serviceDates = req.concepto !== 1
        ? `<FchServDesde>${req.fchServDesde || req.fecha}</FchServDesde>
              <FchServHasta>${req.fchServHasta || req.fecha}</FchServHasta>
              <FchVtoPago>${req.fchVtoPago || req.fecha}</FchVtoPago>`
        : '';

    return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <FECAESolicitar xmlns="http://ar.gov.afip.dif.FEV1/">
      <Auth>
        <Token>${auth.token}</Token>
        <Sign>${auth.sign}</Sign>
        <Cuit>${auth.cuit.replace(/-/g, '')}</Cuit>
      </Auth>
      <FeCAEReq>
        <FeCabReq>
          <CantReg>1</CantReg>
          <PtoVta>${req.puntoVenta}</PtoVta>
          <CbteTipo>${req.tipoComprobante}</CbteTipo>
        </FeCabReq>
        <FeDetReq>
          <FECAEDetRequest>
            <Concepto>${req.concepto}</Concepto>
            <DocTipo>${req.docTipo}</DocTipo>
            <DocNro>${req.docNro}</DocNro>
            <CbteDesde>${req.desde}</CbteDesde>
            <CbteHasta>${req.hasta}</CbteHasta>
            <CbteFch>${req.fecha}</CbteFch>
            <ImpTotal>${fmt2(req.impTotal)}</ImpTotal>
            <ImpTotConc>0.00</ImpTotConc>
            <ImpNeto>${fmt2(req.impNeto)}</ImpNeto>
            <ImpOpEx>${fmt2(req.impOpEx)}</ImpOpEx>
            <ImpIVA>${fmt2(req.impIVA)}</ImpIVA>
            <ImpTrib>${fmt2(req.impTrib)}</ImpTrib>
            ${serviceDates}
            <MonId>PES</MonId>
            <MonCotiz>1</MonCotiz>
            ${ivaXml}
          </FECAEDetRequest>
        </FeDetReq>
      </FeCAEReq>
    </FECAESolicitar>
  </soap12:Body>
</soap12:Envelope>`;
}

export function buildLastVoucherQuery(
    auth: { token: string; sign: string; cuit: string },
    puntoVenta: number,
    tipoComprobante: number
): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <FECompUltimoAutorizado xmlns="http://ar.gov.afip.dif.FEV1/">
      <Auth>
        <Token>${auth.token}</Token>
        <Sign>${auth.sign}</Sign>
        <Cuit>${auth.cuit.replace(/-/g, '')}</Cuit>
      </Auth>
      <PtoVta>${puntoVenta}</PtoVta>
      <CbteTipo>${tipoComprobante}</CbteTipo>
    </FECompUltimoAutorizado>
  </soap12:Body>
</soap12:Envelope>`;
}

export async function callWSFE(mode: 'homo' | 'prod', soap: string, action: string): Promise<string> {
    const url = WSFE_URLS[mode];
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': `application/soap+xml;charset=UTF-8;action="http://ar.gov.afip.dif.FEV1/${action}"`,
        },
        body: soap,
    });
    if (!res.ok) throw new Error(`WSFE HTTP ${res.status}`);
    return res.text();
}

export function parseFECAEResponse(xml: string): {
    cae: string;
    caeExpiration: string;
    invoiceNumber: number;
    errors: string[];
    observations: string[];
} {
    const cae = extractXml(xml, 'CAE');
    const caeExp = extractXml(xml, 'CAEFchVto');
    const numFrom = extractXml(xml, 'CbteDesde');
    const errorsMatch = [...xml.matchAll(/<Err>([\s\S]*?)<\/Err>/g)];
    const obsMatch = [...xml.matchAll(/<Obs>([\s\S]*?)<\/Obs>/g)];

    const errors = errorsMatch.map(m => {
        const code = extractXml(m[1], 'Code');
        const msg = extractXml(m[1], 'Msg');
        return `[${code}] ${msg}`;
    });
    const observations = obsMatch.map(m => {
        const code = extractXml(m[1], 'Code');
        const msg = extractXml(m[1], 'Msg');
        return `[${code}] ${msg}`;
    });

    const caeFormatted = caeExp
        ? `${caeExp.slice(0, 4)}-${caeExp.slice(4, 6)}-${caeExp.slice(6, 8)}`
        : '';

    return {
        cae,
        caeExpiration: caeFormatted,
        invoiceNumber: parseInt(numFrom || '0'),
        errors,
        observations,
    };
}

export function parseLastVoucherResponse(xml: string): number {
    const num = extractXml(xml, 'FECompUltimoAutorizadoResult');
    const cbteNro = extractXml(num || xml, 'CbteNro');
    return parseInt(cbteNro || '0');
}

export function formatCuit(cuit: string): string {
    const clean = cuit.replace(/\D/g, '');
    if (clean.length === 11) return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
    return cuit;
}

export function todayARCA(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
}

export function arcaDateToDisplay(d: string): string {
    if (!d || d.length !== 8) return d;
    return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
}

export function getCertAndKey(): { certPem: string; keyPem: string } | null {
    const certB64 = process.env.ARCA_CERT;
    const keyB64 = process.env.ARCA_PRIVATE_KEY;
    if (!certB64 || !keyB64) return null;
    try {
        const certPem = Buffer.from(certB64, 'base64').toString('utf8');
        const keyPem = Buffer.from(keyB64, 'base64').toString('utf8');
        return { certPem, keyPem };
    } catch {
        return null;
    }
}
