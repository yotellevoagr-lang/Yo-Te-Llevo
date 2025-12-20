import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('icon') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height || metadata.width < 512 || metadata.height < 512) {
      return NextResponse.json({ 
        error: 'La imagen debe ser de al menos 512x512 píxeles' 
      }, { status: 400 });
    }

    const iconsDir = path.join(process.cwd(), 'public', 'icons');
    await mkdir(iconsDir, { recursive: true });

    const generatedFiles: string[] = [];

    for (const size of ICON_SIZES) {
      const resized = await sharp(buffer)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toBuffer();
      
      const filename = `icon-${size}x${size}.png`;
      await writeFile(path.join(iconsDir, filename), resized);
      generatedFiles.push(filename);
    }

    for (const size of MASKABLE_SIZES) {
      const padding = Math.round(size * 0.1);
      const innerSize = size - (padding * 2);
      
      const resizedIcon = await sharp(buffer)
        .resize(innerSize, innerSize, { fit: 'cover' })
        .toBuffer();
      
      const maskable = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
        .composite([{
          input: resizedIcon,
          left: padding,
          top: padding
        }])
        .png()
        .toBuffer();
      
      const filename = `icon-maskable-${size}x${size}.png`;
      await writeFile(path.join(iconsDir, filename), maskable);
      generatedFiles.push(filename);
    }

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image href="/icons/icon-512x512.png" width="512" height="512"/>
</svg>`;
    await writeFile(path.join(iconsDir, 'icon-base.svg'), svgContent);
    generatedFiles.push('icon-base.svg');

    return NextResponse.json({ 
      success: true, 
      message: 'Iconos generados correctamente',
      files: generatedFiles 
    });

  } catch (error) {
    console.error('Error processing icons:', error);
    return NextResponse.json({ 
      error: 'Error al procesar los iconos' 
    }, { status: 500 });
  }
}
