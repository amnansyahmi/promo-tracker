import { collection, query, where, getDocs, limit, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Promo } from '@/types';

export const savePromoWithDedup = async (payload: any, userId: string) => {
  let existingDocId = null;
  let existingData: any = null;

  // 1. Check by normalized URL
  if (payload.sourceUrl) {
    try {
      const normalizedUrl = payload.sourceUrl.split('?')[0].replace(/\/+$/, '');
      const q = query(
        collection(db, 'promos'), 
        where('sourceUrl', '>=', normalizedUrl),
        where('sourceUrl', '<=', normalizedUrl + '\uf8ff'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        existingDocId = snap.docs[0].id;
        existingData = snap.docs[0].data();
      }
    } catch (e) {
      console.error("URL dedup error", e);
    }
  }

  // 2. Check by Brand + Title if not found by URL
  if (!existingDocId && payload.brandName && payload.brandName !== 'Unknown' && payload.title) {
    const q = query(
      collection(db, 'promos'),
      where('brandName', '==', payload.brandName),
      where('title', '==', payload.title),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      existingDocId = snap.docs[0].id;
      existingData = snap.docs[0].data();
    }
  }

  if (existingDocId && existingData) {
    let needsUpdate = false;
    const updateObj: any = { updatedAt: new Date().toISOString() };

    if (!existingData.description && payload.description) {
      updateObj.description = payload.description;
      needsUpdate = true;
    }
    if ((!existingData.prizes || existingData.prizes.length === 0) && (payload.prizes?.length > 0)) {
      updateObj.prizes = payload.prizes;
      needsUpdate = true;
    }
    if ((!existingData.howToJoinSteps || existingData.howToJoinSteps.length === 0) && (payload.howToJoinSteps?.length > 0)) {
      updateObj.howToJoinSteps = payload.howToJoinSteps;
      needsUpdate = true;
    }
    if (!existingData.endDate && payload.endDate) {
      updateObj.endDate = payload.endDate;
      needsUpdate = true;
    }
    if ((!existingData.imageUrls || existingData.imageUrls.length === 0) && (payload.imageUrls?.length > 0)) {
      updateObj.imageUrls = payload.imageUrls;
      updateObj.imageUrl = payload.imageUrl;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await updateDoc(doc(db, 'promos', existingDocId), updateObj);
      return { id: existingDocId, updated: true, exists: true };
    }
    return { id: existingDocId, updated: false, exists: true };
  }

  // No duplicate found, create new
  const docRef = await addDoc(collection(db, 'promos'), {
    ...payload,
    status: payload.status || 'Approved',
    expiryStatus: payload.expiryStatus || 'Active',
    createdByUserId: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { id: docRef.id, updated: false, exists: false };
};
