import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Promo, SavedPromo, PromoEntry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronLeft, 
  Share2, 
  Heart, 
  Calendar, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Info,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function PromoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [promo, setPromo] = useState<Promo | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromo = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'promos', id));
        if (docSnap.exists()) {
          setPromo({ id: docSnap.id, ...docSnap.data() } as Promo);
          
          if (user) {
            // Check if saved
            const savedSnap = await getDocs(query(
              collection(db, 'saved_promos'),
              where('userId', '==', user.uid),
              where('promoId', '==', id)
            ));
            setIsSaved(!savedSnap.empty);

            // Check if entered
            const entrySnap = await getDocs(query(
              collection(db, 'promo_entries'),
              where('userId', '==', user.uid),
              where('promoId', '==', id)
            ));
            setHasEntered(!entrySnap.empty);
          }
        } else {
          toast.error('Promotion not found');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching promo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromo();
  }, [id, user, navigate]);

  const toggleEntry = async () => {
    if (!user) {
      toast.error('Please login to track participation');
      return;
    }
    if (!id || !promo) return;

    try {
      if (hasEntered) {
        toast.info('You have already entered this contest!');
      } else {
        const entryId = `${user.uid}_${id}`;
        const newEntry: PromoEntry = {
          userId: user.uid,
          promoId: id,
          enteredAt: new Date().toISOString(),
          status: 'Entered'
        };
        await setDoc(doc(db, 'promo_entries', entryId), newEntry);
        setHasEntered(true);
        toast.success("Engagement tracked! You're in! 🍀");
      }
    } catch (error) {
      toast.error('Failed to update entry status');
    }
  };

  const toggleSave = async () => {
    if (!user) {
      toast.error('Please login to save promos');
      return;
    }
    if (!id || !promo) return;

    try {
      if (isSaved) {
        const q = query(
          collection(db, 'saved_promos'),
          where('userId', '==', user.uid),
          where('promoId', '==', id)
        );
        const snap = await getDocs(q);
        snap.forEach(async (d) => await deleteDoc(d.ref));
        setIsSaved(false);
        toast.success('Removed from saved');
      } else {
        const saveId = `${user.uid}_${id}`;
        const newSave: SavedPromo = {
          userId: user.uid,
          promoId: id,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'saved_promos', saveId), newSave);
        setIsSaved(true);
        toast.success('Saved to your collection');
      }
    } catch (error) {
      toast.error('Failed to update saved status');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!promo) return null;

  return (
    <div className="max-w-md mx-auto pb-24 bg-white min-h-screen animate-in slide-in-from-bottom-5 duration-500">
      <div className="relative">
        <img 
          src={promo.imageUrl || 'https://placehold.co/600x400/1e293b/ffffff?text=' + encodeURIComponent(promo.brandName)} 
          className="w-full h-80 object-cover"
          alt={promo.title}
        />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Button variant="secondary" size="icon" className="rounded-full bg-white/80 backdrop-blur shadow-lg border-none hover:bg-white" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} className="text-slate-900" />
          </Button>
          <div className="flex space-x-2">
            <Button variant="secondary" size="icon" className="rounded-full bg-white/80 backdrop-blur shadow-lg border-none hover:bg-white text-slate-900" onClick={() => {
              navigator.share?.({ title: promo.title, url: window.location.href });
            }}>
              <Share2 size={20} />
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className={`rounded-full bg-white/80 backdrop-blur shadow-lg border-none hover:bg-white ${isSaved ? 'text-red-500' : 'text-slate-900'}`}
              onClick={toggleSave}
            >
              <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 -mt-6 bg-white rounded-t-[32px] relative z-10 border-t border-slate-100 shadow-sm shadow-slate-200">
        <div className="flex items-center space-x-2 mb-4">
          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {promo.promoType}
          </Badge>
          <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 px-3 py-1 rounded-full hover:bg-slate-100">
            {promo.category}
          </Badge>
          {hasEntered && (
            <Badge className="bg-green-600 text-white border-none px-3 py-1 rounded-full flex items-center">
              <CheckCircle size={12} className="mr-1" /> ENTERED
            </Badge>
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-2 tracking-tight">{promo.title}</h1>
        <p className="text-slate-500 font-medium mb-6">by <span className="text-slate-900 font-bold">{promo.brandName}</span></p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-slate-50 border border-slate-100 shadow-sm rounded-2xl p-4 transition-colors hover:border-slate-200">
            <div className="flex items-center text-slate-500 text-xs mb-1 font-medium">
              <Calendar size={14} className="mr-1" /> Expiry Date
            </div>
            <div className="font-bold text-slate-900">
              {promo.endDate ? new Date(promo.endDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
            </div>
          </Card>
          <Card className="bg-slate-50 border border-slate-100 shadow-sm rounded-2xl p-4 transition-colors hover:border-slate-200">
            <div className="flex items-center text-slate-500 text-xs mb-1 font-medium">
              <AlertCircle size={14} className="mr-1" /> Reward
            </div>
            <div className="font-bold text-slate-900 truncate">
              {promo.rewardTitle || 'Various'}
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center text-slate-900 tracking-tight">
              <span className="w-1.5 h-5 bg-blue-600 rounded-full mr-2" />
              How to Join
            </h2>
            <div className="space-y-3">
              {promo.howToJoinSteps?.map((step, idx) => (
                <div key={idx} className="flex space-x-3 items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5 shadow-sm">
                    {idx + 1}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">{step}</p>
                </div>
              )) || <p className="text-slate-400 text-sm italic">Refer to source for steps.</p>}
            </div>
          </section>

          {promo.tipsToWin && promo.tipsToWin.length > 0 && (
            <section className="bg-amber-50 rounded-3xl p-5 border border-amber-100 shadow-sm">
              <h2 className="text-lg font-bold mb-3 flex items-center text-amber-900 tracking-tight">
                <Lightbulb size={20} className="mr-2 text-amber-600" />
                Tips to Win
              </h2>
              <ul className="space-y-2">
                {promo.tipsToWin.map((tip, idx) => (
                  <li key={idx} className="text-sm text-amber-800 flex items-start leading-relaxed">
                    <CheckCircle2 size={16} className="mr-2 mt-0.5 flex-shrink-0 text-amber-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center text-slate-900 tracking-tight">
              <span className="w-1.5 h-5 bg-slate-800 rounded-full mr-2" />
              Terms & Conditions Summary
            </h2>
            <ul className="space-y-2 list-disc pl-5 marker:text-slate-300">
              {promo.termsAndConditionsSummary?.map((term, idx) => (
                <li key={idx} className="text-slate-700 text-sm leading-relaxed">{term}</li>
              )) || <li className="text-slate-400 text-sm italic">Check official source for details.</li>}
            </ul>
          </section>

          <section className="bg-teal-50 rounded-3xl p-5 border border-teal-100 shadow-sm">
            <h2 className="text-lg font-bold mb-3 flex items-center text-teal-900 tracking-tight">
              <ShieldCheck size={20} className="mr-2 text-teal-600" />
              Trust Score
            </h2>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-teal-800">Verification Level</span>
              <Badge className="bg-teal-600 text-white shadow-sm border-none">{promo.trustLevel || 'Unverified'}</Badge>
            </div>
            <p className="text-xs text-teal-700/70 italic leading-relaxed">
              Verification is based on the source platform and manual review. Always verify details on the official page before joining.
            </p>
          </section>
        </div>

        <div className="mt-10 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start space-x-3 shadow-sm">
          <Info size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-slate-500 italic leading-snug">
            PromoHunter MY summarizes promo information using automation and AI. Always verify the details, eligibility, expiry date, and full terms on the official source before joining.
          </p>
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-5 pt-4 pb-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none flex gap-2">
        <Button 
          className={`flex-1 h-14 rounded-xl shadow-xl text-base font-bold pointer-events-auto ${hasEntered ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'}`}
          onClick={toggleEntry}
        >
          {hasEntered ? 'Participated!' : 'Mark as Entered'} <CheckCircle size={18} className="ml-2" />
        </Button>
        <Button 
          className="h-14 w-14 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 font-bold pointer-events-auto p-0"
          onClick={() => window.open(promo.sourceUrl, '_blank')}
        >
          <ExternalLink size={20} />
        </Button>
      </div>
    </div>
  );
}
