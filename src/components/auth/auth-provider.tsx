
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { auth, messaging } from '@/lib/firebase';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getDocumentById, seedInitialAdmin, saveDocument } from '@/lib/firestore-services';
import type { Passenger, Employee, GeneralSettings } from '@/lib/types';

type UserRole = 'admin' | 'client' | 'employee' | null;

interface AuthContextType {
  user: (Passenger | Employee) | null;
  firebaseUser: FirebaseAuthUser | null;
  userRole: UserRole;
  availableRoles: UserRole[];
  loading: boolean;
  logoUrl: string | null;
  login: (user: Passenger | Employee, firebaseUser: FirebaseAuthUser, roles: UserRole[]) => void;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    firebaseUser: null, 
    userRole: null, 
    availableRoles: [], 
    loading: true, 
    logoUrl: null,
    login: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<(Passenger | Employee) | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const router = useRouter();
  
  const requestNotificationPermission = useCallback(async (currentUserId?: string) => {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const currentToken = await getToken(messaging, { vapidKey: 'BMD30s-1GFp0f1nCqcFg4J9b139Nff2XgnJj34Sg0gEwIza_I9lQ4lMhA13h1UirYyagESpI52xH1WzmsC5Tey0' });
            if (currentToken) {
                console.log('FCM Token:', currentToken);
                // Save the token to Firestore
                await saveDocument('fcmTokens', { 
                    token: currentToken, 
                    createdAt: new Date(),
                    userId: currentUserId || null // Associate with user if logged in
                }, currentToken);
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } else {
            console.log('Unable to get permission to notify.');
        }
    } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    await seedInitialAdmin();
    const settings = await getDocumentById<GeneralSettings>('settings', 'general');
    if (settings) {
        setLogoUrl(settings.logoUrl || null);
        localStorage.setItem("ytl_general_settings", JSON.stringify(settings));
    }
  }, []);

  const login = useCallback((
    loggedInUser: Passenger | Employee, 
    fbUser: FirebaseAuthUser, 
    roles: UserRole[]
  ) => {
    localStorage.setItem('ytl_available_roles', JSON.stringify(roles));
    const primaryRole = roles.includes('admin') ? 'admin' : roles.includes('employee') ? 'employee' : 'client';
    localStorage.setItem('ytl_auth_role', primaryRole);
    localStorage.setItem('ytl_user_id', loggedInUser.id);
    
    setFirebaseUser(fbUser);
    setUser(loggedInUser);
    setAvailableRoles(roles);
    setUserRole(primaryRole);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setFirebaseUser(null);
    setUserRole(null);
    setAvailableRoles([]);
    localStorage.removeItem('ytl_auth_role');
    localStorage.removeItem('ytl_available_roles');
    localStorage.removeItem("ytl_general_settings");
    localStorage.removeItem("ytl_user_id");
  }, []);

  useEffect(() => {
    loadInitialData();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser && fbUser.emailVerified) {
        setFirebaseUser(fbUser);
        const role = localStorage.getItem('ytl_auth_role') as UserRole;
        const userId = localStorage.getItem('ytl_user_id');

        if (role && userId) {
            let userData = null;
            if (role === 'admin') userData = await getDocumentById<Employee>('admin', userId);
            else if (role === 'employee') userData = await getDocumentById<Employee>('employees', userId);
            else if (role === 'client') userData = await getDocumentById<Passenger>('passengers', userId);
            
            if (userData) {
              const rolesStr = localStorage.getItem('ytl_available_roles');
              const allRoles = rolesStr ? JSON.parse(rolesStr) : (role ? [role] : []);
              setUser(userData);
              setAvailableRoles(allRoles);
              setUserRole(role);
            } else {
              clearSession();
            }
        }
      } else {
        clearSession();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [login, loadInitialData, clearSession]);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, userRole, availableRoles, loading, logoUrl, login }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
