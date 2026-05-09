import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Promo, Status } from '@/types';
import { PromoCard } from '@/components/PromoCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search as SearchIcon, Terminal, TrendingUp, Clock, Zap, Loader2, Sparkles, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

import { discoverPromosAI } from '@/lib/gemini';

export default function Home() {
  const [latestPromos, setLatestPromos] = useState<Promo[]>([]);
  const [endingSoon, setEndingSoon] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDiscoveringAI, setIsDiscoveringAI] = useState(false);
  const [userEntries, setUserEntries] = useState<string[]>([]);
  const { user } = useAuth();

  const handleAIDiscover = async () => {
    setIsDiscoveringAI(true);
    try {
      const data = await discoverPromosAI('Latest promotions and food deals malaysia 2026');
      if (data && data.length > 0) {
        for (const promo of data) {
          const promoData: Partial<Promo> = {
            title: promo.title || 'Unknown Title',
            brandName: promo.brand_name || 'Unknown Brand',
            promoType: promo.promo_type || 'Unknown',
            category: promo.category || 'Other',
            country: 'Malaysia',
            sourceUrl: promo.source_url || '',
            endDate: promo.end_date || null,
            rewardTitle: promo.reward_title,
            howToJoinSteps: promo.how_to_join_steps || [],
            termsAndConditionsSummary: promo.terms_and_conditions_summary || [],
            trustLevel: 'Verified',
            costLevel: promo.cost_level || 'Unknown',
            tipsToWin: [],
            status: Status.APPROVED,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await addDoc(collection(db, 'promos'), promoData);
        }
        window.location.reload();
      } else {
        alert("Failed to find promos, the AI might be resting.");
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error fetching from AI");
    } finally {
      setIsDiscoveringAI(false);
    }
  };

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const qLatest = query(
          collection(db, 'promos'),
          where('status', '==', Status.APPROVED),
          limit(6)
        );
        const latestSnap = await getDocs(qLatest);
        // Sort in memory to avoid composite index requirements
        let latestArr = latestSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promo));
        latestArr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLatestPromos(latestArr);

        const now = new Date().toISOString();
        const qEnding = query(
          collection(db, 'promos'),
          where('status', '==', Status.APPROVED),
          limit(20)
        );
        const endingSnap = await getDocs(qEnding);
        let endingArr = endingSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Promo))
          .filter(p => p.endDate && p.endDate >= now);
        endingArr.sort((a, b) => {
          if (!a.endDate || !b.endDate) return 0;
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        });
        setEndingSoon(endingArr.slice(0, 6));

        if (user) {
          const entrySnap = await getDocs(query(
            collection(db, 'promo_entries'),
            where('userId', '==', user.uid)
          ));
          setUserEntries(entrySnap.docs.map(d => d.data().promoId));
        }
      } catch (error) {
        console.error('Error fetching promos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromos();
  }, [user]);

  const categories = [
    { name: 'Giveaway', icon: Zap },
    { name: 'Contest', icon: TrendingUp },
    { name: 'Cashback', icon: Clock },
    { name: 'Bank Card', icon: Terminal },
  ];

  return (
    <div className="max-w-md mx-auto px-4 pt-6 animate-in fade-in duration-500">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Discover Promos</h1>
          <Link to="/notifications" className="relative p-2 bg-white rounded-full shadow-sm border border-slate-100">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </Link>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon className="text-slate-400" size={18} />
          </div>
          <Link to="/search">
            <div className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-400 text-sm shadow-sm hover:border-blue-300 transition-colors">
              Search for brands, categories...
            </div>
          </Link>
        </div>
      </header>

      <section className="mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex space-x-2 pb-2">
          {categories.map((cat, i) => (
            <Link key={cat.name} to={`/search?category=${cat.name}`}>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold flex-shrink-0 flex items-center ${i === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors'}`}>
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center">
            <span className="w-2 h-4 bg-red-500 rounded-sm mr-2" />
            Ending Soon
          </h2>
          <Link to="/search?sort=ending" className="text-xs text-blue-600 font-bold hover:underline">VIEW ALL</Link>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : endingSoon.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {endingSoon.map(promo => (
              <PromoCard key={promo.id} promo={promo} isEntered={userEntries.includes(promo.id || '')} />
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-10">No promos ending soon.</p>
        )}
      </section>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center">
            <span className="w-2 h-4 bg-blue-600 rounded-sm mr-2" />
            Latest Added
          </h2>
          <Link to="/search?sort=latest" className="text-xs text-blue-600 font-bold hover:underline">VIEW ALL</Link>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : latestPromos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {latestPromos.map(promo => (
              <PromoCard key={promo.id} promo={promo} isEntered={userEntries.includes(promo.id || '')} />
            ))}
          </div>
        ) : (
          <div className="text-slate-400 text-center py-10 bg-slate-50 border border-slate-200 rounded-2xl px-6">
            <TrendingUp className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="font-bold text-slate-800 mb-2">No promos found</p>
            <p className="text-sm mb-6">The database is empty. You can fetch some real promos using AI immediately!</p>
            
            <div className="space-y-3">
              <Button 
                onClick={handleAIDiscover} 
                disabled={isDiscoveringAI}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm"
              >
                {isDiscoveringAI ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4 text-blue-400" />}
                {isDiscoveringAI ? "Searching the web..." : "Auto-Fetch Promos via AI"}
              </Button>
              <Button 
                onClick={() => {
                  import('@/lib/seeds').then(m => m.seedDatabase()).then(() => window.location.reload());
                }} 
                variant="outline"
                className="w-full rounded-xl"
              >
                Seed Demo Promos
              </Button>
            </div>
            
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              <strong>Tip:</strong> Go to the <Link to="/admin" className="text-blue-600 hover:underline">Admin Panel</Link> and use the AI Discover tab to search for specific promos!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
