import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Bell, Calendar as CalendarIcon, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Preferences() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    autoAddToCalendar: false,
    categories: {
      food: true,
      shopping: true,
      travel: false,
      tech: true,
    }
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'user_preferences', user.uid)).then(docSnap => {
        if (docSnap.exists()) {
          setPreferences(docSnap.data() as any);
        }
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be logged in to save preferences.");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'user_preferences', user.uid), preferences);
      toast.success("Preferences saved successfully!");
    } catch (err) {
      toast.error("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24 min-h-screen bg-slate-50">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ChevronLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Preferences</h1>
      </div>

      <Card className="mb-6 rounded-2xl shadow-sm border-slate-100">
        <CardContent className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center">
            <Bell size={16} className="mr-2" /> Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Email Notifications</p>
                <p className="text-xs text-slate-500">Weekly digest of top promos</p>
              </div>
              <Switch checked={preferences.emailNotifications} onCheckedChange={c => setPreferences({...preferences, emailNotifications: c})} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Push Notifications</p>
                <p className="text-xs text-slate-500">Alerts for "Ending Soon" promos</p>
              </div>
              <Switch checked={preferences.pushNotifications} onCheckedChange={c => setPreferences({...preferences, pushNotifications: c})} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 rounded-2xl shadow-sm border-slate-100">
        <CardContent className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center">
            <CalendarIcon size={16} className="mr-2" /> Calendar Sync
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">Apple/Google Calendar</p>
              <p className="text-xs text-slate-500">Allow downloading .ics files for expiry dates</p>
            </div>
            <Switch checked={preferences.autoAddToCalendar} onCheckedChange={c => setPreferences({...preferences, autoAddToCalendar: c})} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 rounded-2xl shadow-sm border-slate-100">
        <CardContent className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Interests</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">Food & Beverage</p>
              <Switch checked={preferences.categories.food} onCheckedChange={c => setPreferences({...preferences, categories: {...preferences.categories, food: c}})} />
            </div>
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">Shopping</p>
              <Switch checked={preferences.categories.shopping} onCheckedChange={c => setPreferences({...preferences, categories: {...preferences.categories, shopping: c}})} />
            </div>
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">Travel</p>
              <Switch checked={preferences.categories.travel} onCheckedChange={c => setPreferences({...preferences, categories: {...preferences.categories, travel: c}})} />
            </div>
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">Tech & Gadgets</p>
              <Switch checked={preferences.categories.tech} onCheckedChange={c => setPreferences({...preferences, categories: {...preferences.categories, tech: c}})} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-xl font-bold mb-8">
        <Save size={18} className="mr-2" /> {saving ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  );
}
