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
  limit,
  startAfter,
  increment,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import type { 
  CommunityPost, 
  CommunityComment, 
  CommunityReaction,
  ReactionType 
} from './types';

const POSTS_COLLECTION = 'community_posts';
const COMMENTS_SUBCOLLECTION = 'comments';
const REACTIONS_SUBCOLLECTION = 'reactions';

export async function createCommunityPost(
  post: Omit<CommunityPost, 'id' | 'createdAt' | 'updatedAt' | 'reactionSummary' | 'commentCount'>
): Promise<string> {
  const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
    ...post,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    reactionSummary: { likes: 0, loves: 0 },
    commentCount: 0
  });
  return docRef.id;
}

export async function updateCommunityPost(
  postId: string,
  updates: Partial<Omit<CommunityPost, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  const postRef = doc(db, POSTS_COLLECTION, postId);
  await updateDoc(postRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function deleteCommunityPost(postId: string): Promise<void> {
  const batch = writeBatch(db);
  
  const commentsRef = collection(db, POSTS_COLLECTION, postId, COMMENTS_SUBCOLLECTION);
  const commentsSnapshot = await getDocs(commentsRef);
  commentsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  const reactionsRef = collection(db, POSTS_COLLECTION, postId, REACTIONS_SUBCOLLECTION);
  const reactionsSnapshot = await getDocs(reactionsRef);
  reactionsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  batch.delete(doc(db, POSTS_COLLECTION, postId));
  await batch.commit();
}

export async function getCommunityPosts(
  options: {
    visibility?: 'public' | 'registered' | 'all';
    status?: 'active' | 'archived';
    limitCount?: number;
    lastDoc?: any;
  } = {}
): Promise<CommunityPost[]> {
  const { visibility = 'all', status = 'active', limitCount = 20, lastDoc } = options;
  
  let q = query(
    collection(db, POSTS_COLLECTION),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  
  if (visibility !== 'all') {
    q = query(
      collection(db, POSTS_COLLECTION),
      where('status', '==', status),
      where('visibility', '==', visibility),
      orderBy('createdAt', 'desc')
    );
  }
  
  if (limitCount) {
    q = query(q, limit(limitCount));
  }
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as CommunityPost[];
}

export function subscribeToCommunityPosts(
  callback: (posts: CommunityPost[]) => void,
  options: { visibility?: 'public' | 'registered' | 'all'; status?: 'active' } = {}
): Unsubscribe {
  const { visibility = 'all', status = 'active' } = options;
  
  let q = query(
    collection(db, POSTS_COLLECTION),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  if (visibility !== 'all') {
    q = query(
      collection(db, POSTS_COLLECTION),
      where('status', '==', status),
      where('visibility', '==', visibility),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }
  
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as CommunityPost[];
    callback(posts);
  });
}

export async function addComment(
  postId: string,
  comment: Omit<CommunityComment, 'id' | 'createdAt'>
): Promise<string> {
  const batch = writeBatch(db);
  
  const commentRef = doc(collection(db, POSTS_COLLECTION, postId, COMMENTS_SUBCOLLECTION));
  batch.set(commentRef, {
    ...comment,
    createdAt: serverTimestamp()
  });
  
  const postRef = doc(db, POSTS_COLLECTION, postId);
  batch.update(postRef, {
    commentCount: increment(1)
  });
  
  await batch.commit();
  return commentRef.id;
}

export async function getComments(postId: string): Promise<CommunityComment[]> {
  const q = query(
    collection(db, POSTS_COLLECTION, postId, COMMENTS_SUBCOLLECTION),
    orderBy('createdAt', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate()
  })) as CommunityComment[];
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  const batch = writeBatch(db);
  
  batch.delete(doc(db, POSTS_COLLECTION, postId, COMMENTS_SUBCOLLECTION, commentId));
  
  const postRef = doc(db, POSTS_COLLECTION, postId);
  batch.update(postRef, {
    commentCount: increment(-1)
  });
  
  await batch.commit();
}

export async function toggleReaction(
  postId: string,
  userId: string,
  userName: string,
  reactionType: ReactionType
): Promise<{ added: boolean; type: ReactionType | null }> {
  const reactionRef = doc(db, POSTS_COLLECTION, postId, REACTIONS_SUBCOLLECTION, userId);
  const postRef = doc(db, POSTS_COLLECTION, postId);
  
  const existingReaction = await getDoc(reactionRef);
  
  const batch = writeBatch(db);
  
  if (existingReaction.exists()) {
    const currentType = existingReaction.data().type as ReactionType;
    
    if (currentType === reactionType) {
      batch.delete(reactionRef);
      batch.update(postRef, {
        [`reactionSummary.${currentType}s`]: increment(-1)
      });
      await batch.commit();
      return { added: false, type: null };
    } else {
      batch.update(reactionRef, { type: reactionType, createdAt: serverTimestamp() });
      batch.update(postRef, {
        [`reactionSummary.${currentType}s`]: increment(-1),
        [`reactionSummary.${reactionType}s`]: increment(1)
      });
      await batch.commit();
      return { added: true, type: reactionType };
    }
  } else {
    batch.set(reactionRef, {
      type: reactionType,
      userId,
      userName,
      createdAt: serverTimestamp()
    });
    batch.update(postRef, {
      [`reactionSummary.${reactionType}s`]: increment(1)
    });
    await batch.commit();
    return { added: true, type: reactionType };
  }
}

export async function getUserReaction(
  postId: string,
  userId: string
): Promise<ReactionType | null> {
  const reactionRef = doc(db, POSTS_COLLECTION, postId, REACTIONS_SUBCOLLECTION, userId);
  const reactionDoc = await getDoc(reactionRef);
  
  if (reactionDoc.exists()) {
    return reactionDoc.data().type as ReactionType;
  }
  return null;
}

export async function getUserReactionsForPosts(
  postIds: string[],
  userId: string
): Promise<Record<string, ReactionType | null>> {
  const reactions: Record<string, ReactionType | null> = {};
  
  await Promise.all(postIds.map(async (postId) => {
    reactions[postId] = await getUserReaction(postId, userId);
  }));
  
  return reactions;
}
