import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Promo, SavedPromo } from '@/types';
import { PromoCard } from '@/components/PromoCard';
import { Heart, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Saved() {
  const { user, loading: authLoading } = useAuth();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'saved_promos'),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const savedData = snap.docs.map(doc => doc.data() as SavedPromo);
        
        const promoPromises = savedData.map(async (s) => {
          const pDoc = await getDoc(doc(db, 'promos', s.promoId));
          if (pDoc.exists()) return { id: pDoc.id, ...pDoc.data() } as Promo;
          return null;
        });

        const results = await Promise.all(promoPromises);
        setPromos(results.filter((p): p is Promo => p !== null));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) fetchSaved();
  }, [user, authLoading]);

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 pt-20 text-center">
        <Heart size={48} className="mx-auto text-neutral-200 mb-4" />
        <h2 className="text-xl font-bold mb-2">Login to see your saved promos</h2>
        <p className="text-neutral-500 text-sm mb-6 px-10">Save promotions you are interested in and get expiry reminders.</p>
        <Link to="/profile">
          <Button className="w-full bg-orange-600 rounded-xl">Go to Profile</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 min-h-screen animate-in fade-in duration-300 bg-[#F8FAFC]">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Saved Promos</h1>
        <p className="text-slate-500 text-sm">Don't miss out on these deals!</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : promos.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 pb-20">
          {promos.map(promo => (
            <PromoCard key={promo.id} promo={promo} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-10">
          <Heart size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 italic mb-6">Your collection is empty.</p>
          <Link to="/">
            <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600">Explore Promotions</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
