import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { savePromoWithDedup } from '@/lib/promoService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link2, Type, Image as ImageIcon, Sparkles, Send, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ImageUpload';

import { extractPromoDetails } from '@/lib/gemini';

export default function Submit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [aiData, setAiData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      getDoc(doc(db, 'promos', id)).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setAiData({
            title: d.title,
            brand_name: d.brandName,
            promo_type: d.promoType,
            category: d.category,
            country: d.country,
            reward_title: d.rewardTitle,
            prizes: d.prizes,
            description: d.description,
            terms_and_conditions_summary: d.termsAndConditionsSummary,
            how_to_join_steps: d.howToJoinSteps,
            qr_code_data: d.qrCodeData,
            start_date: d.startDate,
            end_date: d.endDate,
            confidence_score: 100
          });
          setSourceUrl(d.sourceUrl || '');
          setImageUrls(d.imageUrls || (d.imageUrl ? [d.imageUrl] : []));
        }
      });
    }
  }, [id]);

  const handleExtract = async () => {
    if (!sourceUrl && !rawText && imageUrls.length === 0) {
      toast.error('Please provide a link, text, or image');
      return;
    }

    setExtracting(true);
    try {
      let enhancedText = rawText;
      if (sourceUrl && !rawText) {
        try {
          const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(sourceUrl)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.contents) {
              // Extract meta information and body text
              const parser = new DOMParser();
              const doc = parser.parseFromString(data.contents, 'text/html');
              const title = doc.title || '';
              const metaDesc = (doc.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || '';
              const ogTitle = (doc.querySelector('meta[property="og:title"]') as HTMLMetaElement)?.content || '';
              const ogDesc = (doc.querySelector('meta[property="og:description"]') as HTMLMetaElement)?.content || '';
              
              // Remove scripts and styles
              doc.querySelectorAll('script, style, noscript, iframe, img, svg').forEach(el => el.remove());
              const bodyText = doc.body ? (doc.body.innerText || doc.body.textContent || '') : '';
              
              const isLoginWall = title.toLowerCase().includes('login') || (title.toLowerCase().includes('instagram') && !ogTitle) || bodyText.toLowerCase().includes('enable cookies');

              if (isLoginWall) {
                enhancedText = `NOTE: Scraper encountered a potential login wall.\nURL: ${sourceUrl}\nPage Title: ${title}\nOG Title: ${ogTitle}\nOG Description: ${ogDesc}\n\nAI should use Google Search to find details about this specific post/campaign.`;
              } else if (bodyText.length > 50 || ogTitle || ogDesc) {
                enhancedText = `Title: ${title}\nOG Title: ${ogTitle}\nOG Description: ${ogDesc}\nMeta Description: ${metaDesc}\n\nBody Content Excerpt:\n${bodyText.replace(/\s+/g, ' ').trim().substring(0, 15000)}`;
              }
            }
          }
        } catch (e) {
          console.warn("Failed to fetch URL content, falling back to Gemini Search", e);
        }
      }

      const data = await extractPromoDetails(enhancedText, sourceUrl, imageUrls);
      
      if (data && data.title && data.brand_name) {
        setAiData(data);
        if (data.source_url && !sourceUrl) {
          setSourceUrl(data.source_url);
        }
        toast.success('AI successfully extracted details!');
      } else {
         throw new Error('AI could not identify a clear promotion from the provided content.');
      }
    } catch (error: any) {
      console.error('Extraction error:', error);
      toast.error(error.message || 'Failed to extract details automatically');
      // Only set minimal data if we have absolutely nothing
      if (!aiData) {
        setAiData({
          title: '',
          brand_name: '',
          confidence_score: 0
        });
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please login to submit');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: aiData?.title || sourceUrl || 'New Submission',
        brandName: aiData?.brand_name || 'Unknown',
        promoType: aiData?.promo_type || 'Unknown',
        category: aiData?.category || 'Unknown',
        country: aiData?.country || 'Malaysia',
        rewardTitle: aiData?.reward_title || '',
        prizes: typeof aiData?.prizes === 'string' 
          ? [aiData.prizes] 
          : (aiData?.prizes || []),
        description: aiData?.description || rawText || '',
        termsAndConditionsSummary: typeof aiData?.terms_and_conditions_summary === 'string' 
          ? [aiData.terms_and_conditions_summary] 
          : (aiData?.terms_and_conditions_summary || []),
        howToJoinSteps: typeof aiData?.how_to_join_steps === 'string'
          ? [aiData.how_to_join_steps]
          : (aiData?.how_to_join_steps || []),
        qrCodeData: aiData?.qr_code_data || '',
        sourceUrl: sourceUrl || '',
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : '', 
        imageUrls: imageUrls,
        startDate: aiData?.start_date || null,
        endDate: aiData?.end_date || null,
        updatedAt: new Date().toISOString(),
      };

      if (id) {
        await updateDoc(doc(db, 'promos', id), payload);
        toast.success('Your promo is updated!');
        navigate(`/promo/${id}`);
      } else {
        const result = await savePromoWithDedup(payload, user.uid);
        
        if (result.exists) {
          if (result.updated) {
            toast.success('Wait! This promo already existed. We updated it with your new details!');
          } else {
            toast.info('This promotion was already submitted by someone else! Taking you there now.');
          }
          navigate(`/promo/${result.id}`);
        } else {
          toast.success('Your promo is now live!');
          navigate('/');
        }
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error('Failed to submit promotion: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold mb-4">Please login to submit promos</h2>
        <Button onClick={() => navigate('/profile')}>Go to Profile</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 animate-in slide-in-from-right-10 duration-500 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">{id ? 'Edit Promo' : 'Submit a Promo'}</h1>
        <p className="text-slate-500 text-sm italic">{id ? 'Update your contest details.' : 'Help the community by sharing a promotion you found!'}</p>
      </header>

      {/* AI Extraction Tips */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 items-start mb-6">
        <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
          <Sparkles size={18} />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-blue-900 text-xs">Extraction Tip</h3>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Social media links (IG/TikTok) are often blocked. For faster results, 
            <span className="font-bold underline ml-1">upload a screenshot</span> or <span className="font-bold">paste the caption</span> 
            instead.
          </p>
        </div>
      </div>

      <Tabs defaultValue="link" className="w-full mb-8">
        <TabsList className="grid grid-cols-3 w-full p-1 bg-slate-100 rounded-xl">
          <TabsTrigger value="link" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Link2 size={16} className="mr-2" /> Link
          </TabsTrigger>
          <TabsTrigger value="text" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Type size={16} className="mr-2" /> Text
          </TabsTrigger>
          <TabsTrigger value="image" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ImageIcon size={16} className="mr-2" /> Image
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4 border border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <TabsContent value="link" className="m-0">
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Paste an Instagram, TikTok, Facebook, or Website link.</p>
                <Input 
                  placeholder="https://..." 
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-blue-500"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="text" className="m-0">
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Paste the promo title, description, or official caption.</p>
                <Textarea 
                  placeholder="Share details here..." 
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50 min-h-[120px] focus-visible:ring-blue-500"
                />
              </div>
            </TabsContent>

            <TabsContent value="image" className="m-0">
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Upload a screenshot or a short video (max 20MB) of the contest.</p>
                <ImageUpload onUpload={(urls) => setImageUrls(urls)} initialImages={imageUrls} />
              </div>
            </TabsContent>

            <Button 
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-bold shadow-lg shadow-blue-100"
              onClick={handleExtract}
              disabled={extracting}
            >
              {extracting ? <Loader2 className="animate-spin mr-2" /> : <Sparkles size={18} className="mr-2" />}
              {extracting ? 'AI is Extracting...' : 'Extract with Magic AI'}
            </Button>
          </CardContent>
        </Card>
      </Tabs>

      {aiData && (
        <div className="space-y-4 mb-8 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 pl-1">Verify & Edit</h2>
          <Card className="border border-blue-100 bg-white rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                  AI
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">AI Extracted Data</p>
                  <p className="text-xs text-slate-500 leading-none">Review and edit before submitting.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Brand / Company Name</label>
                  <Input 
                    value={aiData.brand_name || ''} 
                    onChange={e => setAiData({...aiData, brand_name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                  <Input 
                    value={aiData.title || ''} 
                    onChange={e => setAiData({...aiData, title: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                  <Textarea 
                    value={aiData.description || ''} 
                    onChange={e => setAiData({...aiData, description: e.target.value})}
                    className="mt-1 min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Prize / Reward Summary</label>
                  <Input 
                    value={aiData.reward_title || ''} 
                    onChange={e => setAiData({...aiData, reward_title: e.target.value})}
                    className="mt-1"
                    placeholder="e.g., iPhone 15 Pro, RM500 Cash"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Multiple Prizes List (One per line)</label>
                  <Textarea 
                    value={Array.isArray(aiData.prizes) ? aiData.prizes.join('\n') : (aiData.prizes || '')} 
                    onChange={e => setAiData({...aiData, prizes: e.target.value.split('\n')})}
                    className="mt-1"
                    placeholder="Grand Prize: iPhone 15\nConsolation: RM50 voucher"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">How To Join (One step per line)</label>
                  <Textarea 
                    value={Array.isArray(aiData.how_to_join_steps) ? aiData.how_to_join_steps.join('\n') : (aiData.how_to_join_steps || '')} 
                    onChange={e => setAiData({...aiData, how_to_join_steps: e.target.value.split('\n')})}
                    className="mt-1"
                    placeholder="Step 1: Buy product\nStep 2: Scan QR"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">QR Code URL / Data (Optional)</label>
                  <Input 
                    value={aiData.qr_code_data || ''} 
                    onChange={e => setAiData({...aiData, qr_code_data: e.target.value})}
                    className="mt-1"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">T&C Summary (Leave blank if none)</label>
                  <Textarea 
                    value={Array.isArray(aiData.terms_and_conditions_summary) ? aiData.terms_and_conditions_summary.join('\n') : (aiData.terms_and_conditions_summary || '')} 
                    onChange={e => setAiData({...aiData, terms_and_conditions_summary: e.target.value.split('\n')})}
                    className="mt-1"
                    placeholder="e.g., Minimum spend RM50"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center text-xs text-blue-600 font-bold bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                <Sparkles size={14} className="mr-2" />
                AI Confidence: {aiData.confidence_score}%
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 h-12 rounded-xl font-bold shadow-lg shadow-slate-200 text-white"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : (id ? <Send size={18} className="mr-2" /> : <Send size={18} className="mr-2" />)}
            {id ? 'Save Changes' : 'Submit Promo'}
          </Button>
          <p className="text-center text-[10px] text-slate-400 px-10 italic">
            {id ? 'Your changes will be live immediately!' : 'Your promo will go live immediately!'}
          </p>
        </div>
      )}
    </div>
  );
}
