import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { writeFile, mkdir, readdir, unlink, readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    return NextResponse.json({ 
      screenshots: manifest.screenshots || [] 
    });
  } catch (error) {
    console.error('Error reading screenshots:', error);
    return NextResponse.json({ screenshots: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('screenshots') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron archivos' }, { status: 400 });
    }

    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    await mkdir(screenshotsDir, { recursive: true });

    const existingFiles = await readdir(screenshotsDir);
    for (const file of existingFiles) {
      if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        await unlink(path.join(screenshotsDir, file));
      }
    }

    const savedFiles: { src: string; sizes: string; type: string; form_factor: string; label: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        continue;
      }

      const isWide = metadata.width > metadata.height;
      const formFactor = isWide ? 'wide' : 'narrow';
      const filename = `screenshot-${i + 1}-${formFactor}.png`;
      
      const processed = await sharp(buffer).png().toBuffer();
      await writeFile(path.join(screenshotsDir, filename), processed);
      
      savedFiles.push({
        src: `/screenshots/${filename}`,
        sizes: `${metadata.width}x${metadata.height}`,
        type: 'image/png',
        form_factor: formFactor,
        label: `Captura ${i + 1} - ${isWide ? 'Escritorio' : 'Móvil'}`
      });
    }

    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const { readFile } = await import('fs/promises');
    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    manifest.screenshots = savedFiles;
    
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Screenshots guardados correctamente',
      screenshots: savedFiles
    });

  } catch (error) {
    console.error('Error processing screenshots:', error);
    return NextResponse.json({ 
      error: 'Error al procesar los screenshots' 
    }, { status: 500 });
  }
}
