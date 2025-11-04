
'use server';
/**
 * @fileOverview A secure flow to delete a Firebase Authentication user.
 * This can only be called from the server (e.g., another server action/flow).
 */

import {getAuth} from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized
if (!getApps().length) {
    // IMPORTANT: In a real production environment, use environment variables
    // or a secret manager instead of hardcoding credentials.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    initializeApp({
        credential: cert(serviceAccount)
    });
}

/**
 * Deletes a user from Firebase Authentication.
 * This is an administrative action and should be protected.
 * @param uid The user ID (UID) of the user to delete.
 */
export async function deleteUser(uid: string): Promise<{ success: boolean; message: string }> {
  try {
    await getAuth().deleteUser(uid);
    console.log(`Successfully deleted user ${uid}`);
    return { success: true, message: 'Usuario de autenticación eliminado.' };
  } catch (error: any) {
    // It's possible the auth user doesn't exist (e.g., they never registered), which is not a failure case here.
    if (error.code === 'auth/user-not-found') {
        console.log(`Auth user with UID ${uid} not found. Proceeding with DB deletion only.`);
        return { success: true, message: 'Usuario de autenticación no encontrado.' };
    }
    console.error('Error deleting user:', error);
    throw new Error(`Error al eliminar el usuario de autenticación: ${error.message}`);
  }
}
