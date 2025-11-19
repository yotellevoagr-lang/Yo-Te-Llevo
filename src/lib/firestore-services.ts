

import { db, auth } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch, addDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, User as FirebaseAuthUser } from 'firebase/auth';
import type { Tour, Passenger, Reservation, Seller, Employee, CommissionSettings, GeneralSettings, ChatbotNode } from "./types";
import { getLayoutForType } from './layouts';

// --- Generic Firestore Functions ---

// Helper function to recursively remove undefined values from an object
const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) {
        return null;
    }
    if (Array.isArray(obj)) {
        return obj.map(removeUndefined);
    }
    if (typeof obj === 'object' && obj.constructor === Object) {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if (value !== undefined) {
                    newObj[key] = removeUndefined(value);
                }
            }
        }
        return newObj;
    }
    return obj;
};

export async function getAllFromCollection<T extends { id: string }>(collectionName: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

export async function getAllFromCollection_client<T extends { id: string }>(collectionName: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}


export async function getDocumentById<T>(collectionName: string, id: string): Promise<T | null> {
  if (!id) return null;
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as T) : null;
}

export async function saveDocument<T>(collectionName: string, data: T, docId?: string): Promise<string> {
    const dataWithoutId = { ...data };
    if ('id' in dataWithoutId) {
        delete (dataWithoutId as any).id;
    }

    const cleanedData = removeUndefined(dataWithoutId);
    let finalId = docId;

    if (finalId) {
        const docRef = doc(db, collectionName, finalId);
        await setDoc(docRef, cleanedData, { merge: true });
    } else {
        const docRef = await addDoc(collection(db, collectionName), cleanedData);
        finalId = docRef.id;
    }
    return finalId;
}


export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}


// --- Specific Logic ---

export async function getChatbotNode(nodeId: string): Promise<ChatbotNode | null> {
    return getDocumentById<ChatbotNode>('chatbot_flows', nodeId);
}

export async function isUsernameUnique(username: string, currentUserId?: string): Promise<boolean> {
    if (!username) return false;

    const checkCollection = async (colName: string) => {
        const q = query(collection(db, colName), where("username", "==", username));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return true;
        // If results are found, it's only unique if all found docs belong to the current user (in an update scenario)
        return querySnapshot.docs.every(doc => doc.id === currentUserId);
    };

    const isUniqueInPassengers = await checkCollection('passengers');
    const isUniqueInEmployees = await checkCollection('employees');
    const isUniqueInAdmin = await checkCollection('admin');

    return isUniqueInPassengers && isUniqueInEmployees && isUniqueInAdmin;
}

export async function isDniUnique(dni: string, currentUserId?: string): Promise<boolean> {
    if (!dni || dni.trim() === '') return true; // Let required validation handle empty.

    const q = query(collection(db, 'passengers'), where('dni', '==', dni));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return true;
    }

    // It's not unique. Check if it's the current user we are editing.
    if (currentUserId && querySnapshot.docs.every(doc => doc.id === currentUserId)) {
        return true;
    }
    
    // Check if any found passenger has an email, indicating an account exists.
    for (const doc of querySnapshot.docs) {
        const passenger = doc.data() as Passenger;
        // If we find a doc with the same DNI that is NOT the user being edited AND has an email, it's a conflict.
        if (doc.id !== currentUserId && passenger.email && passenger.email.trim() !== '') {
            return false; 
        }
    }
    
    // DNI exists but on profiles without an email account (or on the current user), so it's ok to register or update.
    return true;
};


// --- Authentication Logic ---

type UserRole = 'client' | 'admin' | 'employee';

type HandleLoginResponse = {
  user: Passenger | Employee;
  firebaseUser: FirebaseAuthUser;
  availableRoles: UserRole[];
  primaryRole: UserRole;
  profilesToSelect?: { user: Passenger | Employee; role: UserRole }[];
};


export async function handleLogin(identifier: string, password_provided: string): Promise<HandleLoginResponse> {
    let allFoundRecords: { user: Passenger | Employee, role: UserRole }[] = [];
    const foundUserIds = new Set<string>();

    const collectionsToSearch: { name: 'admin' | 'employees' | 'passengers', role: 'admin' | 'employee' | 'client'}[] = [
        { name: 'passengers', role: 'client' },
        { name: 'employees', role: 'employee' },
        { name: 'admin', role: 'admin' }
    ];
    
    for (const colInfo of collectionsToSearch) {
        const queries = [
            query(collection(db, colInfo.name), where("email", "==", identifier)),
            query(collection(db, colInfo.name), where("dni", "==", identifier)),
            query(collection(db, colInfo.name), where("username", "==", identifier))
        ];

        for (const q of queries) {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                querySnapshot.docs.forEach(userDoc => {
                    if (!foundUserIds.has(userDoc.id)) {
                        const userData = { id: userDoc.id, ...userDoc.data() } as Passenger | Employee;
                        if ((userData as any).email) { // Ensure the record has an email to attempt login
                            allFoundRecords.push({ user: userData, role: colInfo.role });
                            foundUserIds.add(userDoc.id);
                        }
                    }
                });
            }
        }
    }
    
    const uniqueRecords = allFoundRecords.filter((v,i,a)=>a.findIndex(t=>(t.user.id === v.user.id && t.role === v.role))===i)


    if (uniqueRecords.length === 0) {
        throw new Error("Credenciales incorrectas o la cuenta no existe.");
    }

    const validProfiles: { user: Passenger | Employee, role: UserRole, firebaseUser: FirebaseAuthUser }[] = [];
    
    for (const record of uniqueRecords) {
        try {
            if ((record.user as any).email) {
                const credential = await signInWithEmailAndPassword(auth, (record.user as any).email, password_provided);
                if (credential.user) {
                     if (!credential.user.emailVerified) {
                        const error = new Error("Por favor, verifica tu correo electrónico antes de iniciar sesión.");
                        (error as any).code = 'auth/email-not-verified';
                        throw error;
                    }
                    validProfiles.push({ ...record, firebaseUser: credential.user });
                }
            }
        } catch (error: any) {
            if (error.code === 'auth/email-not-verified') throw error; // Re-throw this specific error
            // Ignore other errors (like wrong password) and continue checking other profiles
        }
    }


    if (validProfiles.length === 0) {
        throw new Error("La contraseña es incorrecta o la cuenta no está verificada.");
    }
    
    if (validProfiles.length > 1) {
        // Multiple profiles match the DNI and password. Let the user choose.
        return {
            user: validProfiles[0].user, // Temporary user
            firebaseUser: validProfiles[0].firebaseUser, // Temporary firebaseUser
            availableRoles: [],
            primaryRole: 'client',
            profilesToSelect: validProfiles.map(p => ({ user: p.user, role: p.role }))
        };
    }

    // Only one profile matched the credentials, proceed with normal login flow for that user.
    const authenticatedProfile = validProfiles[0];
    const { user: mainUser, firebaseUser } = authenticatedProfile;

    const [adminUser, employeeUser, passengerUser] = await Promise.all([
        getDocumentById<Employee>('admin', firebaseUser.uid),
        getDocumentById<Employee>('employees', firebaseUser.uid),
        getDocumentById<Passenger>('passengers', firebaseUser.uid)
    ]);
    
    const finalUserRecords: { user: Passenger | Employee, role: UserRole }[] = [];
    if (adminUser) finalUserRecords.push({ user: adminUser, role: 'admin'});
    if (employeeUser) finalUserRecords.push({ user: employeeUser, role: 'employee'});
    if (passengerUser) finalUserRecords.push({ user: passengerUser, role: 'client'});

    const availableRoles = [...new Set(finalUserRecords.map(r => r.role))];
    const primaryRecord = finalUserRecords.find(r => r.role === 'admin') || finalUserRecords.find(r => r.role === 'employee') || finalUserRecords.find(r => r.user.id === mainUser.id) || finalUserRecords[0];
    
    if (!primaryRecord) {
        throw new Error("No se pudo encontrar un perfil para el usuario autenticado.");
    }

    return { user: primaryRecord.user, firebaseUser, availableRoles, primaryRole: primaryRecord.role };
}


export async function resendVerificationEmail(identifier: string, password_provided: string): Promise<void> {
    const actionCodeSettings = {
        url: `${window.location.origin}/auth/action`,
        handleCodeInApp: true,
    };
    
    try {
        await handleLogin(identifier, password_provided);
    } catch (error: any) {
        if (error.code === 'auth/email-not-verified') {
            let emailToSend: string | undefined;
             const collectionsToSearch: ('admin' | 'employees' | 'passengers')[] = ['admin', 'employees', 'passengers'];
            for (const colName of collectionsToSearch) {
                const queries = [
                    query(collection(db, colName), where("email", "==", identifier)),
                    query(collection(db, colName), where("dni", "==", identifier)),
                    query(collection(db, colName), where("username", "==", identifier))
                ];
                for (const q of queries) {
                    const snapshot = await getDocs(q);
                    const userDoc = snapshot.docs[0];
                    if (userDoc?.data()?.email) {
                        emailToSend = userDoc.data().email;
                        break;
                    }
                }
                if (emailToSend) break;
            }
            
            if (!emailToSend) {
                throw new Error("No se pudo encontrar un correo asociado a este usuario para reenviar la verificación.");
            }
            const userCredential = await signInWithEmailAndPassword(auth, emailToSend, password_provided);
            if (userCredential.user && !userCredential.user.emailVerified) {
                 await sendEmailVerification(userCredential.user, actionCodeSettings);
            }
        } else {
            throw error;
        }
    }
}


export async function registerPassenger(formData: { username: string; firstName: string; lastName: string; email: string; password: string; dni: string; }): Promise<void> {
    if (!formData.username || !formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.dni) {
        throw new Error("Todos los campos son obligatorios.");
    }
    const passError = validatePassword(formData.password);
    if (passError) throw new Error(passError);

    const isUniqueUser = await isUsernameUnique(formData.username);
    if (!isUniqueUser) throw new Error("El nombre de usuario ya está en uso.");
    
    const isDniAvailable = await isDniUnique(formData.dni);
    if (!isDniAvailable) {
        throw new Error("Este DNI ya está registrado con una cuenta de correo electrónico. Por favor, inicia sesión.");
    }
    
    const q = query(collection(db, "passengers"), where("dni", "==", formData.dni));
    const querySnapshot = await getDocs(q);
    const existingPassengerDoc = querySnapshot.docs.find(doc => !doc.data().email);

    let authUser: FirebaseAuthUser;
    
    const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    authUser = userCredential.user;
    
    if (existingPassengerDoc) {
        // "Claim" existing profile
        const finalData = {
            ...existingPassengerDoc.data(),
            id: authUser.uid,
            fullName: `${formData.firstName} ${formData.lastName}`.trim(),
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.username,
            email: formData.email,
        };
        
        const batch = writeBatch(db);
        const newDocRef = doc(db, "passengers", authUser.uid);
        batch.set(newDocRef, finalData);
        batch.delete(doc(db, "passengers", existingPassengerDoc.id)); // Delete the old temp doc
        await batch.commit();

    } else {
        // Create new user and profile from scratch
        await saveDocument('passengers', {
            id: authUser.uid,
            fullName: `${formData.firstName} ${formData.lastName}`.trim(),
            firstName: formData.firstName,
            lastName: formData.lastName,
            dni: formData.dni,
            email: formData.email,
            username: formData.username,
            family: `Familia ${formData.lastName}`.trim(),
        }, authUser.uid);
    }
    
    const actionCodeSettings = {
        url: `${window.location.origin}/auth/action`,
        handleCodeInApp: true,
    };
    await sendEmailVerification(authUser, actionCodeSettings);
}


export const validatePassword = (pass: string) => {
    if (pass.length < 8) return "Debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(pass)) return "Debe incluir al menos una mayúscula.";
    if (!/[a-z]/.test(pass)) return "Debe incluir al menos una minúscula.";
    if (!/\d/.test(pass)) return "Debe incluir al menos un número.";
    if (!/[^A-Za-z0-9]/.test(pass)) return "Debe incluir al menos un símbolo (ej. !@#$).";
    return null;
}

export async function seedInitialAdmin() {
    const adminEmail = 'admin@yotellevo.com';
    const q = query(collection(db, 'admin'), where('email', '==', adminEmail));
    const adminSnapshot = await getDocs(q);

    if (adminSnapshot.empty) {
        console.log("No admin found, seeding initial administrator placeholder...");
        try {
            const adminData: Partial<Employee> = {
                name: 'Administrador',
                username: 'admin',
                email: adminEmail,
            };
            
            await addDoc(collection(db, "admin"), adminData);
            console.log("Admin placeholder document seeded. The first admin user will need to be created in Firebase Console and then log in.");

        } catch (error) {
            console.error("Error seeding admin user:", error);
        }
    }
}


// --- New Employee Registration Service ---
interface EmployeeRegistrationData {
  tempEmployeeId: string;
  tempEmployeeData: Employee;
  email: string;
  password: string;
  username: string;
  phone: string;
}

export async function handleEmployeeRegistration(data: EmployeeRegistrationData): Promise<HandleLoginResponse> {
  const { tempEmployeeId, tempEmployeeData, email, password, username, phone } = data;

  // Step 1: Create the Firebase Auth user.
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const authUser = userCredential.user;

  if (!authUser) {
    throw new Error("La creación del usuario en Firebase Authentication ha fallado.");
  }
  
  // Send verification email with custom URL
  const actionCodeSettings = {
    url: `${window.location.origin}/auth/action`,
    handleCodeInApp: true,
  };
  await sendEmailVerification(authUser, actionCodeSettings);

  // Step 2: Use a batch to perform atomic writes to Firestore.
  const batch = writeBatch(db);

  const employeeDocRef = doc(db, 'employees', authUser.uid);
  const employeeData: Employee = {
    ...tempEmployeeData,
    id: authUser.uid,
    email: email,
    username: username,
    phone: phone || tempEmployeeData.phone || '',
  };
  delete (employeeData as any).password;
  batch.set(employeeDocRef, employeeData);

  const nameParts = tempEmployeeData.name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ');

  const passengerDocRef = doc(db, 'passengers', authUser.uid);
  const passengerData: Passenger = {
    id: authUser.uid,
    fullName: tempEmployeeData.name,
    firstName,
    lastName,
    dni: tempEmployeeData.dni,
    email: email,
    username: username,
    phone: phone || tempEmployeeData.phone || '',
    nationality: "Argentina",
    tierId: "adult",
  };
  batch.set(passengerDocRef, passengerData);

  const tempDocRef = doc(db, "employees", tempEmployeeId);
  batch.delete(tempDocRef);

  await batch.commit();

  const loginResponse = await handleLogin(email, password);
  
  return loginResponse;
}


// --- Specific Functions ---
export const getTourById = (id: string): Promise<Tour | null> => getDocumentById<Tour>('tours', id);
export const saveTour = (tour: Partial<Tour>, id?: string): Promise<string> => saveDocument<Tour>('tours', tour as Tour, id);
export const saveReservation = (reservation: Partial<Reservation>, id?: string): Promise<string> => saveDocument<Reservation>('reservations', reservation as Reservation, id);

export const savePassenger = async (passengerData: Partial<Passenger>, id?: string, collectionName: 'passengers' | 'employees' = 'passengers'): Promise<string> => {
    let finalId = id || passengerData.id;
    
    let dobValue: Date | null = null;
    if (passengerData.dob) {
        const dob = passengerData.dob as any;
        if (dob instanceof Date) {
            dobValue = dob;
        } else if (typeof dob.toDate === 'function') {
            dobValue = dob.toDate();
        } else if (typeof dob === 'string' || typeof dob === 'number') {
            const parsedDate = new Date(dob);
            if (!isNaN(parsedDate.getTime())) {
                dobValue = parsedDate;
            }
        }
    }
    
    const dataToSave: Partial<Passenger> = { ...passengerData };
    if (dobValue) {
        dataToSave.dob = dobValue;
    }

    if (!finalId) {
        const docRef = await addDoc(collection(db, collectionName), dataToSave);
        return docRef.id;
    }

    return saveDocument(collectionName, dataToSave, finalId);
};

export const saveCommissionSettings = (settings: CommissionSettings): Promise<string> => saveDocument<CommissionSettings>('settings', settings, 'commissions');
