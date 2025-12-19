
'use server';
/**
 * @fileOverview A secure flow to delete a Firebase Authentication user.
 * This can only be called from the server (e.g., another server action/flow).
 */

import {getAuth} from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized
let firebaseAdminInitialized = false;
if (!getApps().length) {
    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountKey && !serviceAccountKey.startsWith('YOUR_')) {
            const serviceAccount = JSON.parse(serviceAccountKey);
            initializeApp({
                credential: cert(serviceAccount)
            });
            firebaseAdminInitialized = true;
        } else {
            console.warn('FIREBASE_SERVICE_ACCOUNT_KEY no está configurado. La eliminación de usuarios de Auth no funcionará.');
        }
    } catch (error) {
        console.warn('Error al inicializar Firebase Admin:', error);
    }
} else {
    firebaseAdminInitialized = true;
}

/**
 * Deletes a user from Firebase Authentication.
 * This is an administrative action and should be protected.
 * @param uid The user ID (UID) of the user to delete.
 */
export async function deleteUser(uid: string): Promise<{ success: boolean; message: string }> {
  if (!firebaseAdminInitialized) {
    console.log('Firebase Admin no inicializado. Saltando eliminación de Auth.');
    return { success: true, message: 'Firebase Admin no configurado. Solo se eliminará de la base de datos.' };
  }
  
  try {
    await getAuth().deleteUser(uid);
    console.log(`Successfully deleted user ${uid}`);
    return { success: true, message: 'Usuario de autenticación eliminado.' };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
        console.log(`Auth user with UID ${uid} not found. Proceeding with DB deletion only.`);
        return { success: true, message: 'Usuario de autenticación no encontrado.' };
    }
    console.error('Error deleting user:', error);
    throw new Error(`Error al eliminar el usuario de autenticación: ${error.message}`);
  }
}
