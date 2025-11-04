
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('URL de imagen no proporcionada', { status: 400 });
  }

  // This proxy is ONLY for fetching remote URLs from Firebase Storage.
  // It should not handle blob or data URLs, which are client-side.
  if (!imageUrl.startsWith('http')) {
      return new NextResponse('URL inválida. Solo se pueden solicitar URLs remotas.', { status: 400 });
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.error(`Error al obtener la imagen: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`Cuerpo del error: ${errorBody}`);
      return new NextResponse('No se pudo obtener la imagen', { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error('Error en el proxy de imagen:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}
