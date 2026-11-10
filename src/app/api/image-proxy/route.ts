import { NextRequest, NextResponse } from 'next/server';
import { isDelinquentStorageUrl, getDeterministicFallbackImage } from '@/lib/utils';

const ALLOWED_HOSTS = [
    'firebasestorage.googleapis.com',
    'firebasestorage.app',
    'storage.googleapis.com',
    'lh3.googleusercontent.com',
    'placehold.co',
    'images.unsplash.com',
];

function isAllowedUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        return ALLOWED_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
    } catch {
        return false;
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new NextResponse('URL no proporcionada', { status: 400 });
    }

    // Intercept delinquent Firebase Storage URLs immediately
    const targetUrl = isDelinquentStorageUrl(imageUrl) ? getDeterministicFallbackImage(imageUrl) : imageUrl;

    if (!isAllowedUrl(targetUrl)) {
        return new NextResponse('URL no permitida', { status: 403 });
    }

    try {
        let response = await fetch(targetUrl);

        if (!response.ok) {
            const fallbackUrl = getDeterministicFallbackImage(imageUrl);
            response = await fetch(fallbackUrl);
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
            return new NextResponse('Tipo de contenido no permitido', { status: 415 });
        }

        const buffer = await response.arrayBuffer();

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Cache-Control', 'public, max-age=3600');

        return new NextResponse(buffer, { status: 200, headers });
    } catch {
        return new NextResponse('Error interno del servidor', { status: 500 });
    }
}
