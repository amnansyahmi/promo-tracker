import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Status, PromoType, ExpiryStatus } from '@/types';

const DEMO_PROMOS = [
  {
    title: 'Maybank MAE Spend & Win RM1,000,000',
    brandName: 'Maybank',
    promoType: PromoType.SPEND_AND_WIN,
    category: 'Bank Card',
    country: 'Malaysia',
    sourcePlatform: 'Website',
    sourceUrl: 'https://www.maybank2u.com.my',
    endDate: '2026-12-31T23:59:59Z',
    expiryStatus: ExpiryStatus.ACTIVE,
    rewardTitle: 'RM1,000,000 Cash Prize',
    costLevel: 'Requires Spend',
    trustLevel: 'Official',
    status: Status.APPROVED,
    createdAt: new Date().toISOString()
  },
  {
    title: 'Touch n Go eWallet RM5 Cashback for 7-Eleven',
    brandName: 'TnG eWallet',
    promoType: PromoType.CASHBACK,
    category: 'E-wallet',
    country: 'Malaysia',
    sourcePlatform: 'App',
    sourceUrl: 'https://www.touchngo.com.my',
    endDate: '2026-06-30T23:59:59Z',
    expiryStatus: ExpiryStatus.ACTIVE,
    rewardTitle: 'RM5 Cashback',
    costLevel: 'Requires Purchase',
    trustLevel: 'Official',
    status: Status.APPROVED,
    createdAt: new Date().toISOString()
  },
  {
    title: 'Shopee Daily Giveaway: iPhone 16 Pro',
    brandName: 'Shopee Malaysia',
    promoType: PromoType.GIVEAWAY,
    category: 'Shopping',
    country: 'Malaysia',
    sourcePlatform: 'Instagram',
    sourceUrl: 'https://www.shopee.com.my',
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    expiryStatus: ExpiryStatus.ENDING_SOON,
    rewardTitle: 'iPhone 16 Pro',
    costLevel: 'Free',
    trustLevel: 'Verified',
    status: Status.APPROVED,
    createdAt: new Date().toISOString()
  }
];

export async function seedDatabase() {
  const q = query(collection(db, 'promos'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log('Seeding database with demo promos...');
    for (const promo of DEMO_PROMOS) {
      await addDoc(collection(db, 'promos'), promo);
    }
    return true;
  }
  return false;
}
