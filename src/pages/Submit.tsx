import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
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
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [aiData, setAiData] = useState<any>(null);

  const handleExtract = async () => {
    if (!sourceUrl && !rawText && !imageUrl) {
      toast.error('Please provide a link, text, or image');
      return;
    }

    setExtracting(true);
    try {
      const data = await extractPromoDetails(rawText, sourceUrl, imageUrl);
      
      if (data) {
        setAiData(data);
        toast.success('AI successfully extracted details!');
      } else {
         throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Extraction error:', error);
      toast.error(error.message || 'Failed to extract details automatically');
      // Set dummy data so they can still submit
      setAiData({
        title: sourceUrl || 'New Submission',
        brand_name: 'Manual Entry',
        confidence_score: 0
      });
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
      // Save submission to Firestore
      await addDoc(collection(db, 'promo_submissions'), {
        submittedBy: user.uid,
        sourceUrl,
        rawText,
        uploadedImageUrl: imageUrl,
        aiExtractedJson: aiData,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });

      toast.success('Thank you! Your submission is pending review.');
      navigate('/');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit promotion');
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
    <div className="max-w-md mx-auto px-4 pt-6 animate-in slide-in-from-right-10 duration-500">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Submit a Promo</h1>
        <p className="text-slate-500 text-sm italic">Help the community by sharing a promotion you found!</p>
      </header>

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
                <p className="text-xs text-slate-500">Upload a screenshot of the contest or poster.</p>
                <ImageUpload onUpload={(url) => setImageUrl(url)} />
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
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 pl-1">Extracted Preview</h2>
          <Card className="border border-blue-100 bg-blue-50 rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                  AI
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Verified Preview</p>
                  <p className="text-xs text-slate-500 leading-none">{aiData.brand_name || 'Unknown Brand'}</p>
                </div>
              </div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight mb-3">{aiData.title || 'Untitled Promo'}</h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs mt-4 p-3 bg-white rounded-xl border border-blue-100">
                <div>
                  <p className="text-slate-400 mb-1 font-medium">Promo Type</p>
                  <p className="font-bold text-slate-800">{aiData.promo_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1 font-medium">Expiry Date</p>
                  <p className="font-bold text-slate-800">{aiData.end_date || 'Unknown'}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center text-xs text-blue-600 font-bold bg-white px-2 py-1 rounded-md border border-blue-100">
                  <Sparkles size={12} className="mr-1" />
                  Confidence: {aiData.confidence_score}%
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 h-12 rounded-xl font-bold shadow-lg shadow-slate-200 text-white"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
            Confirm Submission
          </Button>
          <p className="text-center text-[10px] text-slate-400 px-10 italic">
            Your submission will be reviewed by our team before it goes live.
          </p>
        </div>
      )}
    </div>
  );
}
