import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Promo, ExpiryStatus } from '@/types';
import { Link } from 'react-router-dom';
import { Calendar, Tag, ShieldCheck, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PromoCardProps {
  promo: Promo;
  isEntered?: boolean;
}

export function PromoCard({ promo, isEntered }: PromoCardProps) {
  const daysLeft = promo.endDate 
    ? Math.ceil((new Date(promo.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link to={`/promo/${promo.id}`} className="block w-full">
      <div className="relative rounded-2xl overflow-hidden shadow-lg h-48 group">
        <div className="absolute inset-0 z-0 bg-slate-200">
          <img 
            src={promo.imageUrl || 'https://placehold.co/600x400/1e293b/ffffff?text=' + encodeURIComponent(promo.brandName)} 
            alt={promo.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
        
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-2">
          {daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm tracking-widest uppercase">
              ENDING SOON: {daysLeft}D
            </span>
          )}
          {!((daysLeft !== null && daysLeft <= 3 && daysLeft >= 0)) && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm tracking-widest uppercase">
              {promo.promoType}
            </span>
          )}
          {isEntered && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center tracking-widest uppercase">
              <ShieldCheck size={10} className="mr-1" /> ENTERED
            </span>
          )}
        </div>

        {promo.trustLevel === 'Official' && (
          <div className="absolute top-3 right-3 z-20">
            <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center tracking-wider uppercase">
               <ShieldCheck size={10} className="mr-1" /> OFFICIAL
            </span>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-16 z-20">
          <p className="text-white/80 text-xs font-medium mb-1 drop-shadow-sm">{promo.brandName}</p>
          <h3 className="text-white text-lg font-bold leading-tight drop-shadow-sm line-clamp-2">{promo.title}</h3>
        </div>
        
        <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full z-20 text-white">
          <Zap size={20} className={promo.costLevel === 'Free' ? "text-yellow-400" : "text-white"} />
        </div>
      </div>
    </Link>
  );
}
