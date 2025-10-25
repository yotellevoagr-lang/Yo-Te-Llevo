
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getDocumentById, seedInitialAdmin } from '@/lib/firestore-services';
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
    const primaryRole = roles.includes('admin') ? 'admin' : roles[0];
    localStorage.setItem('ytl_auth_role', primaryRole);
    
    setFirebaseUser(fbUser);
    setUser(loggedInUser);
    setAvailableRoles(roles);
    setUserRole(primaryRole);
  }, []);

  useEffect(() => {
    loadInitialData();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // If user is already logged in (e.g. page refresh), load their data
        const role = localStorage.getItem('ytl_auth_role') as UserRole;
        if (role) {
            let userData = null;
            if (role === 'admin') userData = await getDocumentById<Employee>('admin', fbUser.uid);
            else if (role === 'employee') userData = await getDocumentById<Employee>('employees', fbUser.uid);
            else if (role === 'client') userData = await getDocumentById<Passenger>('passengers', fbUser.uid);
            
            if (userData) {
              const rolesStr = localStorage.getItem('ytl_available_roles');
              const allRoles = rolesStr ? JSON.parse(rolesStr) : (role ? [role] : []);
              login(userData, fbUser, allRoles);
            } else {
              // Mismatch, log out
              await auth.signOut();
            }
        }
      } else {
        // Clear all session data on logout
        setUser(null);
        setFirebaseUser(null);
        setUserRole(null);
        setAvailableRoles([]);
        localStorage.removeItem('ytl_auth_role');
        localStorage.removeItem('ytl_available_roles');
        localStorage.removeItem("ytl_general_settings");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [login, loadInitialData]);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, userRole, availableRoles, loading, logoUrl, login }}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-12 h-12 animate-spin text-primary"/>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
