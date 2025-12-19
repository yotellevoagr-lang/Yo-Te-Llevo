import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export type StorageFolder = 'trips' | 'flyers' | 'settings' | 'gallery';

export async function uploadFileToStorage(
  file: File,
  folder: StorageFolder,
  customFileName?: string
): Promise<string> {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const extension = file.name.split('.').pop() || 'bin';
  const fileName = customFileName 
    ? `${customFileName}.${extension}` 
    : `${timestamp}_${randomId}.${extension}`;
  
  const storageRef = ref(storage, `${folder}/${fileName}`);
  
  const metadata = {
    contentType: file.type,
  };
  
  await uploadBytes(storageRef, file, metadata);
  const downloadUrl = await getDownloadURL(storageRef);
  
  return downloadUrl;
}

export async function uploadMultipleFilesToStorage(
  files: { file: File; id: string; type: 'image' | 'video' }[],
  folder: StorageFolder
): Promise<{ id: string; url: string; type: 'image' | 'video' }[]> {
  const uploadPromises = files.map(async ({ file, id, type }) => {
    const url = await uploadFileToStorage(file, folder);
    return { id, url, type };
  });
  
  return Promise.all(uploadPromises);
}

export async function deleteFileFromStorage(fileUrl: string): Promise<void> {
  try {
    if (!fileUrl.includes('firebasestorage.googleapis.com')) {
      return;
    }
    
    const storageRef = ref(storage, fileUrl);
    await deleteObject(storageRef);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn('File not found in storage, may have been already deleted:', fileUrl);
      return;
    }
    throw error;
  }
}

export function isStorageUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com');
}

export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}
