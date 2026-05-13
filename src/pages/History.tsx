import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Promo } from '@/types';
import { PromoCard } from '@/components/PromoCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function History() {
  const { user } = useAuth();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'promos'),
        where('createdByUserId', '==', user.uid)
      );
      getDocs(q).then(snap => {
        const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promo));
        // Client-side sort because we need an index for multiple fields
        const sorted = results.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        setPromos(sorted);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="p-10 text-center">
        <p>Please login to view history.</p>
      </div>
    );
  }

  const now = new Date();
  const pastPromos = promos.filter(p => p.endDate && new Date(p.endDate) < now);
  const activePromos = promos.filter(p => !p.endDate || new Date(p.endDate) >= now);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24 bg-[#F8FAFC] min-h-screen">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ChevronLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Submissions</h1>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 flex flex-col items-center">
          <Clock className="animate-spin mb-4 text-blue-500" size={32} />
          <p>Loading your history...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 px-2">Active Promos</h2>
            {activePromos.length === 0 ? (
              <p className="text-slate-500 px-2 italic text-sm">No active promos.</p>
            ) : (
              <div className="space-y-4">
                {activePromos.map(promo => (
                  <PromoCard key={promo.id} promo={promo} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 px-2">History (Expired)</h2>
            {pastPromos.length === 0 ? (
              <p className="text-slate-500 px-2 italic text-sm">No past promos.</p>
            ) : (
              <div className="space-y-4 opacity-75">
                {pastPromos.map(promo => (
                  <PromoCard key={promo.id} promo={promo} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
