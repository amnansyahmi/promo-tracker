import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Promo, Status } from '@/types';
import { PromoCard } from '@/components/PromoCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, SlidersHorizontal, Loader2, Sparkles, Globe } from 'lucide-react';
import { discoverPromosAI } from '@/lib/gemini';
import { toast } from 'sonner';
import { savePromoWithDedup } from '@/lib/promoService';
import { useAuth } from '@/contexts/AuthContext';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const categoryFilter = searchParams.get('category');
  const { user } = useAuth();

  const handleWebSearch = async () => {
    if (!searchTerm) {
      toast.error("Enter a search term to search the web!");
      return;
    }
    
    setIsWebSearching(true);
    try {
      const results = await discoverPromosAI(`${searchTerm} contests promotions deals Malaysia 2026`);
      if (results && results.length > 0) {
        let addedCount = 0;
        let updatedCount = 0;
        
        for (const item of results) {
          const result = await savePromoWithDedup({
            title: item.title || searchTerm,
            brandName: item.brand_name || 'Web Result',
            promoType: item.promo_type || 'Unknown',
            category: item.category || 'Other',
            country: 'Malaysia',
            sourceUrl: item.source_url || '',
            endDate: item.end_date || null,
            rewardTitle: item.reward_title || '',
            trustLevel: 'Verified',
            status: Status.APPROVED,
          }, user?.uid || 'anonymous');
          
          if (!result.exists) addedCount++;
          else if (result.updated) updatedCount++;
        }
        
        if (addedCount > 0) {
          toast.success(`Found and added ${addedCount} new contests from the web!`);
        } else if (updatedCount > 0) {
          toast.success(`Updated ${updatedCount} existing contests with new web details!`);
        } else {
          toast.info("Found contests on the web, but they were already in our database.");
        }
        
        // Refresh local results by letting the search term be re-applied
        setSearchTerm(searchTerm); 
      } else {
        toast.info("AI couldn't find any additional new contests on the web right now.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to perform web search.");
    } finally {
      setIsWebSearching(false);
    }
  };

  useEffect(() => {
    const fetchPromos = async () => {
      setLoading(true);
      try {
        let q = query(
          collection(db, 'promos'),
          where('status', '==', Status.APPROVED),
          limit(50)
        );

        if (categoryFilter) {
          q = query(
            collection(db, 'promos'),
            where('status', '==', Status.APPROVED),
            where('category', '==', categoryFilter),
            limit(50)
          );
        }

        const snap = await getDocs(q);
        let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promo));
        
        // Sort in memory instead
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (searchTerm) {
          // Simple client-side search since Firestore doesn't support full-text search easily without external tools
          results = results.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.brandName.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setPromos(results);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromos();
  }, [categoryFilter, searchTerm]);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 min-h-screen animate-in fade-in duration-300">
      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Search promos..." 
            className="pl-10 h-12 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-blue-500"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                if (e.target.value) newParams.set('q', e.target.value);
                else newParams.delete('q');
                return newParams;
              });
            }}
          />
        </div>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl bg-white border-slate-200 text-slate-500 hover:text-slate-900 border-none">
          <SlidersHorizontal size={18} />
        </Button>
      </div>

      {categoryFilter && (
        <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-1">
          <Badge 
            variant="secondary" 
            className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 border-none cursor-pointer hover:bg-blue-200"
            onClick={() => {
              setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                newParams.delete('category');
                return newParams;
              });
            }}
          >
            {categoryFilter} <span className="ml-2 opacity-50">×</span>
          </Badge>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-2 text-blue-500" />
          <p>Finding the best deals...</p>
        </div>
      ) : (
        <>
          {promos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 pb-10">
              {promos.map(promo => (
                <PromoCard key={promo.id} promo={promo} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-6 bg-slate-50 border border-dotted border-slate-300 rounded-3xl mb-10">
               <div className="bg-white w-12 h-12 rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                 <Sparkles className="text-blue-500" size={24} />
               </div>
               <p className="text-slate-900 font-bold mb-1">No local results for "{searchTerm}"</p>
               <p className="text-slate-500 text-xs mb-6">But don't worry! I can search the entire web for active contests matching your query.</p>
               
               <Button 
                onClick={handleWebSearch}
                disabled={isWebSearching}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-6"
               >
                 {isWebSearching ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Globe className="mr-2 h-4 w-4" />}
                 {isWebSearching ? "Searching Web..." : "Deep Search Web via AI"}
               </Button>
            </div>
          )}

          {promos.length > 0 && (
            <div className="mb-20">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center text-center">
                <Sparkles className="text-blue-600 mb-2" size={20} />
                <p className="text-[11px] text-blue-700 font-medium mb-3">Want more results? Use AI to find newest contests on Google.</p>
                <Button 
                  onClick={handleWebSearch}
                  disabled={isWebSearching}
                  variant="outline"
                  className="bg-white border-blue-200 text-blue-600 font-bold rounded-xl w-full"
                >
                  {isWebSearching ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Globe className="mr-2 h-4 w-4" />}
                  Deeper Web Search
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
