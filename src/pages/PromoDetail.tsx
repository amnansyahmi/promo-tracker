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
  CheckCircle,
  MessageCircle,
  Trash2,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';

export default function PromoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
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
          savedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'saved_promos', saveId), newSave);
        setIsSaved(true);
        toast.success('Saved to your collection');
      }
    } catch (error) {
      toast.error('Failed to update saved status');
    }
  };

  const handleDelete = async () => {
    if (!user || user.uid !== promo.createdByUserId) return;
    if (confirm("Are you sure you want to delete this promo?")) {
      try {
        await deleteDoc(doc(db, 'promos', promo.id));
        toast.success("Promo deleted");
        navigate(-1);
      } catch (err) {
        toast.error("Failed to delete");
      }
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!promo) return null;

  return (
    <div className="max-w-md mx-auto pb-24 bg-white min-h-screen animate-in slide-in-from-bottom-5 duration-500">
      <div className="relative">
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-80">
          {(promo.imageUrls && promo.imageUrls.length > 0) ? (
            promo.imageUrls.map((imgUrl, idx) => (
              <img 
                key={idx}
                src={imgUrl} 
                className="w-full h-full object-cover flex-shrink-0 snap-center"
                alt={`${promo.title} - ${idx + 1}`}
              />
            ))
          ) : (
            <img 
              src={promo.imageUrl || 'https://placehold.co/600x400/1e293b/ffffff?text=' + encodeURIComponent(promo.brandName)} 
              className="w-full h-full object-cover flex-shrink-0 snap-center"
              alt={promo.title}
            />
          )}
        </div>
        {(promo.imageUrls && promo.imageUrls.length > 1) && (
          <div className="absolute bottom-10 left-0 right-0 flex justify-center space-x-1">
            {promo.imageUrls.map((_, idx) => (
              <div key={idx} className="w-1.5 h-1.5 rounded-full bg-white/50" />
            ))}
          </div>
        )}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Button variant="secondary" size="icon" className="rounded-full bg-white/80 backdrop-blur shadow-lg border-none hover:bg-white" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} className="text-slate-900" />
          </Button>
          <div className="flex space-x-2">
            {user && (user.uid === promo.createdByUserId || isAdmin) && (
              <>
                <Button variant="secondary" size="icon" className="rounded-full bg-white/80 text-blue-500 shadow-lg border-none hover:bg-blue-50" onClick={() => navigate(`/edit/${promo.id}`)}>
                  <Edit size={20} />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-full bg-white/80 text-rose-500 shadow-lg border-none hover:bg-rose-50" onClick={handleDelete}>
                  <Trash2 size={20} />
                </Button>
              </>
            )}
            <Button variant="secondary" size="icon" className="rounded-full bg-[#25D366] text-white shadow-lg border-none hover:bg-[#128C7E]" onClick={() => {
              const text = encodeURIComponent(`Check out this promo: ${promo.title}\n\n${window.location.href}`);
              window.open(`https://wa.me/?text=${text}`, '_blank');
            }}>
              <MessageCircle size={20} />
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full bg-white/80 backdrop-blur shadow-lg border-none hover:bg-white text-slate-900" onClick={async () => {
              try {
                if (navigator.share) {
                  await navigator.share({ title: promo.title, url: window.location.href });
                }
              } catch (err: any) {
                if (err.name !== 'AbortError') {
                  console.error('Share failed:', err.message);
                }
              }
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

          <div className="flex gap-2 mb-8">
            <Card className="flex-1 bg-slate-50 border border-slate-100 shadow-sm rounded-2xl p-4 transition-colors hover:border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center text-slate-500 text-xs mb-1 font-medium">
                    <Calendar size={14} className="mr-1" /> Expiry Date
                  </div>
                  <div className="font-bold text-slate-900">
                    {promo.endDate ? new Date(promo.endDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
                  </div>
                </div>
                {promo.endDate && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 rounded-lg"
                    onClick={() => {
                      const startDate = new Date(promo.endDate!);
                      // Ensure date is a valid object
                      if (isNaN(startDate.getTime())) {
                        toast.error("Invalid expiry date");
                        return;
                      }

                      // Set event to last all day or a specific time. Let's make it an all-day event for the expiry date to remind them to use it
                      const startStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                      const endStr = new Date(startDate.getTime() + 24 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                      
                      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PromoHunter MY//Calendar Event//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:Promo Expiring: ${promo.title || promo.brandName}
DTSTART:${startStr}
DTEND:${endStr}
DESCRIPTION:Don't forget to use your ${promo.brandName} promo! Link: ${window.location.href}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
                       const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                       const url = window.URL.createObjectURL(blob);
                       const a = document.createElement('a');
                       a.href = url;
                       a.download = `promo_${promo.id}_expiry.ics`;
                       document.body.appendChild(a);
                       a.click();
                       document.body.removeChild(a);
                       window.URL.revokeObjectURL(url);
                       toast.success('Added reminder to your calendar!');
                    }}
                  >
                    Add to Calendar
                  </Button>
                )}
              </div>
            </Card>
          </div>
          <div className="mb-8">
            <Card className="bg-gradient-to-br from-yellow-500 to-amber-600 border-none shadow-md shadow-amber-200/50 rounded-2xl p-6 transition-all hover:shadow-lg text-white">
              <div className="flex items-center text-amber-100 text-sm mb-2 font-semibold uppercase tracking-wider">
                <AlertCircle size={16} className="mr-2" /> Reward
              </div>
              <div className="font-extrabold text-3xl leading-tight drop-shadow-sm mb-4">
                {promo.rewardTitle || 'Various'}
              </div>
              {promo.prizes && promo.prizes.length > 0 && promo.prizes.some(p => p.trim()) && (
                <div className="bg-white/10 rounded-xl p-4 mt-2">
                  <p className="text-amber-100 text-xs font-bold uppercase mb-2">Prize List</p>
                  <ul className="space-y-2 text-sm max-w-full">
                    {promo.prizes.filter(p => p.trim()).map((prize, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 mr-2 flex-shrink-0" />
                        <span className="font-medium whitespace-pre-wrap">{prize}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
          
          {(promo.howToJoinSteps && promo.howToJoinSteps.length > 0) && (
            <section className="bg-amber-50 rounded-2xl p-5 border border-amber-100/50 shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center text-amber-900 tracking-tight">
                <span className="w-1.5 h-5 bg-amber-400 rounded-full mr-2" />
                How to Join
              </h2>
              <ol className="space-y-3 list-decimal pl-5 marker:text-amber-500 marker:font-bold">
                {promo.howToJoinSteps.map((step, idx) => (
                  <li key={idx} className="text-amber-950 text-sm leading-relaxed pl-1">{step}</li>
                ))}
              </ol>
            </section>
          )}

          {promo.qrCodeData && (
            <section className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
              <h2 className="text-sm font-bold mb-2 flex items-center text-slate-700 uppercase tracking-wider">
                QR Code Data
              </h2>
              <div className="p-3 bg-white border border-slate-200 rounded-xl break-all text-xs text-slate-600 font-mono w-full">
                {promo.qrCodeData.startsWith('http') ? (
                  <a href={promo.qrCodeData} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{promo.qrCodeData}</a>
                ) : (
                  promo.qrCodeData
                )}
              </div>
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

          {promo.sourceUrl && promo.sourceUrl.trim() !== '' && (
            <section>
              <h2 className="text-lg font-bold mb-2 flex items-center text-slate-900 tracking-tight">
                <span className="w-1.5 h-5 bg-slate-400 rounded-full mr-2" />
                Original Link / Source
              </h2>
              <a 
                href={promo.sourceUrl.startsWith('http') ? promo.sourceUrl : `https://${promo.sourceUrl}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 break-all text-sm font-medium underline underline-offset-2"
              >
                {promo.sourceUrl}
              </a>
            </section>
          )}

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
        {promo.sourceUrl && promo.sourceUrl.trim() !== '' && (
          <Button 
            className="h-14 w-14 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 font-bold pointer-events-auto p-0"
            onClick={() => window.open(promo.sourceUrl.startsWith('http') ? promo.sourceUrl : `https://${promo.sourceUrl}`, '_blank')}
          >
            <ExternalLink size={20} />
          </Button>
        )}
      </div>
    </div>
  );
}
