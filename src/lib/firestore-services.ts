
import { db, auth, storage } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch, addDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, User as FirebaseAuthUser } from 'firebase/auth';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import type { Tour, Passenger, Reservation, Seller, Employee, CommissionSettings, GeneralSettings } from "./types";


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


export async function uploadFileAndGetURL(file: File | string, path: string): Promise<string> {
    const storageRef = ref(storage, path);

    if (typeof file === 'string') {
        await uploadString(storageRef, file, 'data_url');
    } else {
        await uploadString(storageRef, await file.arrayBuffer().then(b => new TextDecoder('utf-8').decode(b)), 'raw');
    }
    
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}


// --- Specific Logic ---

export async function isUsernameUnique(username: string, currentUserId?: string): Promise<boolean> {
    if (!username) return false;

    const checkCollection = async (colName: string) => {
        const q = query(collection(db, colName), where("username", "==", username));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return true;
        return querySnapshot.docs.every(doc => doc.id === currentUserId);
    };

    const isUniqueInPassengers = await checkCollection('passengers');
    const isUniqueInEmployees = await checkCollection('employees');
    const isUniqueInAdmin = await checkCollection('admin');

    return isUniqueInPassengers && isUniqueInEmployees && isUniqueInAdmin;
}


// --- Authentication Logic ---

type UserRole = 'client' | 'admin' | 'employee';

type HandleLoginResponse = {
  user: Passenger | Employee;
  firebaseUser: FirebaseAuthUser;
  availableRoles: UserRole[];
  primaryRole: UserRole;
};


export async function handleLogin(identifier: string, password_provided: string): Promise<HandleLoginResponse> {
    let userRecords: { user: Passenger | Employee, role: 'client' | 'admin' | 'employee' }[] = [];
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
                        userRecords.push({ user: userData, role: colInfo.role });
                        foundUserIds.add(userDoc.id);
                    }
                });
            }
        }
    }


    if (userRecords.length === 0) {
        throw new Error("Credenciales incorrectas o la cuenta no existe.");
    }
    
    const adminRecord = userRecords.find(r => r.role === 'admin');
    const firstRecord = adminRecord || userRecords[0];
    const userEmail = firstRecord.user.email;

    if (!userEmail) {
        throw new Error("La cuenta no tiene un email asociado para iniciar sesión.");
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, userEmail, password_provided);
    const firebaseUser = userCredential.user;

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
    const primaryRecord = finalUserRecords.find(r => r.role === 'admin') || finalUserRecords[0];
    
    if (!primaryRecord) {
        throw new Error("No se pudo encontrar un perfil para el usuario autenticado.");
    }

    return { user: primaryRecord.user, firebaseUser, availableRoles, primaryRole: primaryRecord.role };
}


export async function registerPassenger(formData: { username: string; fullName: string; email: string; password: string; }): Promise<void> {
    if (!formData.username || !formData.fullName || !formData.email || !formData.password) {
        throw new Error("Todos los campos son obligatorios.");
    }
    const passError = validatePassword(formData.password);
    if (passError) throw new Error(passError);

    const isUnique = await isUsernameUnique(formData.username);
    if (!isUnique) throw new Error("El nombre de usuario ya está en uso.");
    
    const q = query(collection(db, "passengers"), where("email", "==", formData.email));
    const querySnapshot = await getDocs(q);

    const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    const authUser = userCredential.user;

    if (!querySnapshot.empty) {
        const existingPassengerDoc = querySnapshot.docs[0];
        const existingPassengerData = existingPassengerDoc.data() as Passenger;
        
        const updatedData: Passenger = {
            ...existingPassengerData,
            id: authUser.uid,
            username: formData.username,
            fullName: formData.fullName || existingPassengerData.fullName,
            email: formData.email,
        };

        const batch = writeBatch(db);
        batch.set(doc(db, "passengers", authUser.uid), updatedData);
        batch.delete(doc(db, "passengers", existingPassengerDoc.id));
        await batch.commit();

    } else {
        const newPassenger: Omit<Passenger, 'id'> = {
            username: formData.username,
            fullName: formData.fullName,
            email: formData.email,
            dni: '',
            nationality: 'Argentina',
            tierId: 'adult'
        };
        await setDoc(doc(db, "passengers", authUser.uid), newPassenger);
    }
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


// --- Specific Functions ---
export const getTourById = (id: string): Promise<Tour | null> => getDocumentById<Tour>('tours', id);
export const saveTour = (tour: Partial<Tour>, id?: string): Promise<string> => saveDocument<Tour>('tours', tour as Tour, id);
export const saveReservation = (reservation: Partial<Reservation>, id?: string): Promise<string> => saveDocument<Reservation>('reservations', reservation as Reservation, id);

export const savePassenger = async (passengerData: Partial<Passenger>, id?: string): Promise<string> => {
    let dobValue = passengerData.dob;
    
    if (dobValue === undefined) {
        dobValue = null;
    } else if (typeof dobValue === 'string' || typeof dobValue === 'number') {
        const parsedDate = new Date(dobValue);
        dobValue = isNaN(parsedDate.getTime()) ? null : parsedDate;
    } else if (dobValue !== null && (!(dobValue instanceof Date) || isNaN(dobValue.getTime()))) {
        dobValue = null;
    }

    const dataToSave: Partial<Passenger> = {
        ...passengerData,
        dob: dobValue,
    };
    
    const finalId = id || passengerData.id;

    return saveDocument('passengers', dataToSave as Passenger, finalId);
};

export const saveCommissionSettings = (settings: CommissionSettings): Promise<string> => saveDocument<CommissionSettings>('settings', settings, 'commissions');
