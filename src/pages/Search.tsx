import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Promo, Status } from '@/types';
import { PromoCard } from '@/components/PromoCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, SlidersHorizontal, Loader2 } from 'lucide-react';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const categoryFilter = searchParams.get('category');

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
      ) : promos.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 pb-20">
          {promos.map(promo => (
            <PromoCard key={promo.id} promo={promo} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-slate-400 italic">No promotions found for your search.</p>
        </div>
      )}
    </div>
  );
}
