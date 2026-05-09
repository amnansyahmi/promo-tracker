import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Status, Promo, PromoSubmission } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Edit, ExternalLink, Trash2, Search, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { seedDatabase } from '@/lib/seeds';

import { discoverPromosAI } from '@/lib/gemini';

export default function Admin() {
  const { isAdmin } = useAuth();
  const [submissions, setSubmissions] = useState<PromoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPromos, setDiscoveredPromos] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchSubmissions();
  }, [isAdmin]);

  const fetchSubmissions = async () => {
    try {
      const q = query(collection(db, 'promo_submissions'), where('status', '==', 'Pending'));
      const snap = await getDocs(q);
      setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromoSubmission)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const approveSubmission = async (sub: PromoSubmission) => {
    try {
      // 1. Create promo from submission
      const promoData: Partial<Promo> = {
        ...sub.aiExtractedJson,
        title: sub.aiExtractedJson.title || 'New Promo',
        brandName: sub.aiExtractedJson.brand_name || 'Brand',
        promoType: sub.aiExtractedJson.promo_type || 'Giveaway',
        category: sub.aiExtractedJson.category || 'Shopping',
        sourceUrl: sub.sourceUrl || sub.aiExtractedJson.source_url,
        status: Status.APPROVED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reviewedByAdminId: 'admin'
      };
      const promoRef = await addDoc(collection(db, 'promos'), promoData);
      
      // 2. Update submission status
      await updateDoc(doc(db, 'promo_submissions', sub.id!), { status: 'Approved' });

      // 3. Send Notification to submitter
      if (sub.submittedBy && sub.submittedBy !== 'guest') {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: sub.submittedBy,
            title: 'Promo Approved! 🎉',
            message: `Your submission "${sub.aiExtractedJson.title}" has been published. Thank you for contributing!`,
            type: 'success',
            isRead: false,
            createdAt: new Date().toISOString(),
            link: `/promo/${promoRef.id}`
          });
        } catch (err) {
          console.error("Failed to send notification:", err);
        }
      }
      
      toast.success('Promotion Approved and Notification Sent!');
      fetchSubmissions();
    } catch (e) {
      toast.error('Approval failed');
    }
  };

  const rejectSubmission = async (id: string, sub: PromoSubmission) => {
    try {
      await updateDoc(doc(db, 'promo_submissions', id), { status: 'Rejected' });

      // Send Notification to submitter
      if (sub.submittedBy && sub.submittedBy !== 'guest') {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: sub.submittedBy,
            title: 'Submission Update',
            message: `Your submission "${sub.aiExtractedJson.title}" could not be approved at this time.`,
            type: 'warning',
            isRead: false,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          console.error("Failed to send notification:", err);
        }
      }

      toast.success('Submission Rejected');
      fetchSubmissions();
    } catch (e) {
      toast.error('Rejection failed');
    }
  };

  const handleDiscover = async () => {
    if (!discoverQuery) return;
    setDiscovering(true);
    setDiscoveredPromos([]);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout
    try {
      const data = await discoverPromosAI(discoverQuery);
      clearTimeout(timeoutId);
      setDiscoveredPromos(data);
      toast.success(`Found ${data?.length || 0} potential promos!`);
    } catch (error: any) {
      toast.error(error.message || 'Discovery failed. Try making the query more specific.');
    } finally {
      setDiscovering(false);
    }
  };

  const addDiscoveredPromo = async (promo: any, index: number) => {
    try {
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
      
      const newPromos = [...discoveredPromos];
      newPromos.splice(index, 1);
      setDiscoveredPromos(newPromos);
      toast.success('Promo added directly to DB!');
    } catch (error) {
      console.error("Error adding:", error);
      toast.error("Failed to add discovered promo");
    }
  };

  if (!isAdmin) {
    return <div className="p-10 text-center font-bold">Access Denied</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-slate-900">Admin Dashboard</h1>
      
      <Tabs defaultValue="pending">
        <TabsList className="bg-slate-100 p-1 mb-6">
          <TabsTrigger value="pending">Pending Review ({submissions.length})</TabsTrigger>
          <TabsTrigger value="discover">AI Discover</TabsTrigger>
          <TabsTrigger value="active">Active Promos</TabsTrigger>
          <TabsTrigger value="manual">Manual Add</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="rounded-2xl border border-slate-200 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-500 font-bold">Brand & Title</TableHead>
                  <TableHead className="text-slate-500 font-bold">Source</TableHead>
                  <TableHead className="text-slate-500 font-bold">Confidence</TableHead>
                  <TableHead className="text-right text-slate-500 font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-slate-400">No pending submissions.</TableCell>
                  </TableRow>
                ) : (
                  submissions.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-slate-50 border-slate-100">
                      <TableCell>
                        <div className="font-bold text-slate-900">{sub.aiExtractedJson?.title || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{sub.aiExtractedJson?.brand_name || 'No Brand'}</div>
                      </TableCell>
                      <TableCell>
                        {sub.uploadedImageUrl ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 mb-1">
                            <img src={sub.uploadedImageUrl} alt="Proof" className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                        {sub.sourceUrl ? (
                          <a href={sub.sourceUrl} target="_blank" className="flex items-center text-blue-600 hover:underline text-xs">
                            Link <ExternalLink size={10} className="ml-1" />
                          </a>
                        ) : <span className="text-xs text-slate-400">Text Only</span> }
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                          {sub.aiExtractedJson?.confidence_score}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => approveSubmission(sub)} className="text-green-600 hover:bg-green-50 hover:text-green-700">
                          <Check size={18} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => rejectSubmission(sub.id!, sub)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                          <X size={18} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="discover">
          <Card className="rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
              Automated Web Discovery
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Use Gemini AI to crawl the web and social media for new promotions. The AI will search Google and extract matching promos into structured data.
            </p>
            
            <div className="flex gap-2 mb-8">
              <Input 
                placeholder="e.g. Latest KFC Malaysia promotions 2026" 
                className="flex-1 rounded-xl"
                value={discoverQuery}
                onChange={e => setDiscoverQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDiscover()}
              />
              <Button 
                onClick={handleDiscover} 
                disabled={!discoverQuery || discovering}
                className="bg-slate-900 hover:bg-slate-800 rounded-xl px-6 font-bold text-white shadow-sm"
              >
                {discovering ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Search className="mr-2 h-4 w-4" />}
                Discover Promos
              </Button>
            </div>

            {discovering && (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-600" />
                <p>Searching the web and extracting promos...</p>
                <p className="text-xs italic mt-2">This may take up to 20 seconds.</p>
              </div>
            )}

            {!discovering && discoveredPromos.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 mb-4">Found {discoveredPromos.length} potential promos:</h3>
                {discoveredPromos.map((promo, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50 relative">
                    <Badge className="absolute top-4 right-4 bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                      {promo.confidence_score}% Confidence
                    </Badge>
                    <h4 className="font-bold text-lg text-slate-900 pr-24">{promo.title || 'Untitled'}</h4>
                    <p className="text-sm font-bold text-blue-600 mb-2">{promo.brand_name || 'Unknown Brand'}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      <div><span className="text-slate-500">Type:</span> {promo.promo_type}</div>
                      <div><span className="text-slate-500">Platform:</span> {promo.source_platform}</div>
                      <div className="col-span-2 text-slate-500">
                        {promo.source_url ? (
                          <a href={promo.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                            {promo.source_url}
                          </a>
                        ) : 'No source URL'}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                       <Button size="sm" onClick={() => addDiscoveredPromo(promo, idx)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg">
                         <Check size={14} className="mr-1" /> Add to Platform
                       </Button>
                       <Button size="sm" variant="outline" onClick={() => setDiscoveredPromos(discoveredPromos.filter((_, i) => i !== idx))} className="rounded-lg text-red-600 border-red-200 hover:bg-red-50 bg-white">
                         <X size={14} className="mr-1" /> Dismiss
                       </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="active">
          <div className="text-center py-20 text-slate-400">
            Promo management coming soon...
            <div className="mt-4">
              <Button onClick={() => seedDatabase().then(s => s ? toast.success('Seeded!') : toast.info('Already seeded!'))}>
                Seed Demo Promos
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sources">
          <div className="text-center py-20 text-slate-400">Source management coming soon...</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
