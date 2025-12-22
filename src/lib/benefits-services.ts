import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  increment,
  serverTimestamp,
  writeBatch,
  runTransaction,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import type { 
  Benefit, 
  BenefitRedemption, 
  PassengerBenefit,
  DiscountType
} from './types';

const BENEFITS_COLLECTION = 'benefits';
const REDEMPTIONS_COLLECTION = 'benefit_redemptions';

export async function createBenefit(
  benefit: Omit<Benefit, 'id' | 'createdAt' | 'currentUsesTotal'>
): Promise<string> {
  const docRef = await addDoc(collection(db, BENEFITS_COLLECTION), {
    ...benefit,
    currentUsesTotal: 0,
    createdAt: serverTimestamp(),
    validFrom: benefit.validFrom,
    validUntil: benefit.validUntil
  });
  return docRef.id;
}

export async function updateBenefit(
  benefitId: string,
  updates: Partial<Omit<Benefit, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  const benefitRef = doc(db, BENEFITS_COLLECTION, benefitId);
  await updateDoc(benefitRef, updates);
}

export async function deleteBenefit(benefitId: string): Promise<void> {
  await deleteDoc(doc(db, BENEFITS_COLLECTION, benefitId));
}

export async function getBenefitById(benefitId: string): Promise<Benefit | null> {
  const docSnap = await getDoc(doc(db, BENEFITS_COLLECTION, benefitId));
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    validFrom: data.validFrom?.toDate?.() || new Date(data.validFrom),
    validUntil: data.validUntil?.toDate?.() || new Date(data.validUntil),
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
  } as Benefit;
}

export async function getBenefitByCode(code: string): Promise<Benefit | null> {
  const q = query(
    collection(db, BENEFITS_COLLECTION),
    where('code', '==', code.toUpperCase())
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    validFrom: data.validFrom?.toDate?.() || new Date(data.validFrom),
    validUntil: data.validUntil?.toDate?.() || new Date(data.validUntil),
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
  } as Benefit;
}

export async function getAllBenefits(
  options: { status?: 'active' | 'expired' | 'draft' | 'all' } = {}
): Promise<Benefit[]> {
  const { status = 'all' } = options;
  
  let q = query(
    collection(db, BENEFITS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  
  if (status !== 'all') {
    q = query(
      collection(db, BENEFITS_COLLECTION),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      validFrom: data.validFrom?.toDate?.() || new Date(data.validFrom),
      validUntil: data.validUntil?.toDate?.() || new Date(data.validUntil),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
    };
  }) as Benefit[];
}

export async function getAvailableBenefitsForUser(
  userId: string,
  tripId?: string
): Promise<Benefit[]> {
  const now = new Date();
  
  let q = query(
    collection(db, BENEFITS_COLLECTION),
    where('status', '==', 'active'),
    where('validUntil', '>=', now)
  );
  
  const snapshot = await getDocs(q);
  const benefits: Benefit[] = [];
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const benefit = {
      id: doc.id,
      ...data,
      validFrom: data.validFrom?.toDate?.() || new Date(data.validFrom),
      validUntil: data.validUntil?.toDate?.() || new Date(data.validUntil),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
    } as Benefit;
    
    if (benefit.validFrom > now) continue;
    
    if (benefit.maxUsesTotal > 0 && benefit.currentUsesTotal >= benefit.maxUsesTotal) continue;
    
    if (benefit.eligibleAudience === 'selected') {
      if (!benefit.selectedPassengerIds.includes(userId)) continue;
    }
    
    if (tripId && benefit.applicableTripIds.length > 0) {
      if (!benefit.applicableTripIds.includes(tripId)) continue;
    }
    
    benefits.push(benefit);
  }
  
  return benefits;
}

export async function claimBenefit(
  benefitId: string,
  passengerId: string,
  passengerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const benefit = await getBenefitById(benefitId);
    if (!benefit) {
      return { success: false, error: 'Beneficio no encontrado' };
    }
    
    const now = new Date();
    if (benefit.validUntil < now) {
      return { success: false, error: 'Este beneficio ha expirado' };
    }
    
    if (benefit.validFrom > now) {
      return { success: false, error: 'Este beneficio aún no está disponible' };
    }
    
    if (benefit.maxUsesTotal > 0 && benefit.currentUsesTotal >= benefit.maxUsesTotal) {
      return { success: false, error: 'Este beneficio ha alcanzado su límite de uso' };
    }
    
    const passengerBenefitRef = doc(db, 'passengers', passengerId, 'benefits', benefitId);
    const existingClaim = await getDoc(passengerBenefitRef);
    
    if (existingClaim.exists()) {
      return { success: false, error: 'Ya has reclamado este beneficio' };
    }
    
    const passengerBenefit: Omit<PassengerBenefit, 'id'> = {
      benefitId: benefit.id,
      benefitCode: benefit.code,
      title: benefit.title,
      description: benefit.description,
      discountType: benefit.discountType,
      discountValue: benefit.discountValue,
      status: 'available',
      applicableTripIds: benefit.applicableTripIds,
      remainingUses: benefit.maxPassengersPerUse,
      claimedAt: now,
      expiresAt: benefit.validUntil
    };
    
    await setDoc(passengerBenefitRef, passengerBenefit);
    
    return { success: true };
  } catch (error) {
    console.error('Error claiming benefit:', error);
    return { success: false, error: 'Error al reclamar el beneficio' };
  }
}

export async function redeemBenefit(
  benefitId: string,
  passengerId: string,
  passengerName: string,
  bookingId: string,
  tripId: string,
  appliedBy: string
): Promise<{ success: boolean; discountApplied?: number; discountType?: DiscountType; error?: string }> {
  try {
    return await runTransaction(db, async (transaction) => {
      const benefitRef = doc(db, BENEFITS_COLLECTION, benefitId);
      const benefitDoc = await transaction.get(benefitRef);
      
      if (!benefitDoc.exists()) {
        throw new Error('Beneficio no encontrado');
      }
      
      const benefit = benefitDoc.data();
      const now = new Date();
      
      const validUntil = (benefit.validUntil as any)?.toDate?.() || new Date(benefit.validUntil);
      if (validUntil < now) {
        throw new Error('Este beneficio ha expirado');
      }
      
      if (benefit.maxUsesTotal > 0 && benefit.currentUsesTotal >= benefit.maxUsesTotal) {
        throw new Error('Este beneficio ha alcanzado su límite de uso');
      }
      
      if (benefit.applicableTripIds.length > 0 && !benefit.applicableTripIds.includes(tripId)) {
        throw new Error('Este beneficio no aplica para este viaje');
      }
      
      const existingRedemptionQuery = query(
        collection(db, REDEMPTIONS_COLLECTION),
        where('benefitId', '==', benefitId),
        where('passengerId', '==', passengerId)
      );
      const existingRedemptions = await getDocs(existingRedemptionQuery);
      
      if (existingRedemptions.size >= benefit.maxUsesPerPassenger) {
        throw new Error('Ya has usado este beneficio el máximo de veces permitido');
      }
      
      const redemptionRef = doc(collection(db, REDEMPTIONS_COLLECTION));
      const redemption: Omit<BenefitRedemption, 'id'> = {
        benefitId,
        benefitCode: benefit.code,
        passengerId,
        passengerName,
        bookingId,
        tripId,
        discountApplied: benefit.discountValue,
        discountType: benefit.discountType,
        usedAt: now,
        appliedBy,
        source: 'booking'
      };
      
      transaction.set(redemptionRef, redemption);
      
      transaction.update(benefitRef, {
        currentUsesTotal: increment(1)
      });
      
      const passengerBenefitRef = doc(db, 'passengers', passengerId, 'benefits', benefitId);
      const passengerBenefitDoc = await transaction.get(passengerBenefitRef);
      
      if (passengerBenefitDoc.exists()) {
        const currentData = passengerBenefitDoc.data();
        const newRemainingUses = (currentData.remainingUses || 1) - 1;
        
        transaction.update(passengerBenefitRef, {
          remainingUses: newRemainingUses,
          status: newRemainingUses <= 0 ? 'used' : 'available',
          usedAt: newRemainingUses <= 0 ? now : null,
          usedInBookingId: bookingId
        });
      }
      
      return {
        success: true,
        discountApplied: benefit.discountValue,
        discountType: benefit.discountType
      };
    });
  } catch (error: any) {
    console.error('Error redeeming benefit:', error);
    return { success: false, error: error.message || 'Error al usar el beneficio' };
  }
}

export async function getPassengerBenefits(passengerId: string): Promise<PassengerBenefit[]> {
  const q = query(
    collection(db, 'passengers', passengerId, 'benefits'),
    orderBy('claimedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      claimedAt: data.claimedAt?.toDate?.() || new Date(data.claimedAt),
      expiresAt: data.expiresAt?.toDate?.() || new Date(data.expiresAt),
      usedAt: data.usedAt?.toDate?.() || null
    };
  }) as PassengerBenefit[];
}

export async function getRedemptionsByBenefit(benefitId: string): Promise<BenefitRedemption[]> {
  const q = query(
    collection(db, REDEMPTIONS_COLLECTION),
    where('benefitId', '==', benefitId),
    orderBy('usedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      usedAt: data.usedAt?.toDate?.() || new Date(data.usedAt)
    };
  }) as BenefitRedemption[];
}

export async function checkPassengerCanUseBenefit(
  benefitId: string,
  passengerId: string
): Promise<{ canUse: boolean; reason?: string }> {
  const redemptionsQuery = query(
    collection(db, REDEMPTIONS_COLLECTION),
    where('benefitId', '==', benefitId),
    where('passengerId', '==', passengerId)
  );
  
  const existingRedemptions = await getDocs(redemptionsQuery);
  
  if (existingRedemptions.size > 0) {
    return { canUse: false, reason: 'Este pasajero ya usó este beneficio' };
  }
  
  return { canUse: true };
}

export function generateBenefitCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
