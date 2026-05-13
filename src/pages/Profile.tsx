import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogOut, LogIn, Shield, User, ChevronRight, Bell, Settings, HelpCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user, profile, signIn, logout, isAdmin, signingIn } = useAuth();

  return (
    <div className="max-w-md mx-auto px-4 pt-6 min-h-screen animate-in fade-in duration-300">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
      </header>

      <Card className="border border-slate-200 shadow-sm rounded-3xl overflow-hidden mb-8 bg-white">
        <CardContent className="p-6">
          {user ? (
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold border-2 border-blue-50">
                {profile?.displayName?.[0] || user.email?.[0] || 'U'}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-slate-900 tracking-tight">{profile?.displayName || 'User'}</h2>
                <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                {isAdmin && (
                  <Link to="/admin">
                    <span className="inline-flex items-center px-2 py-0.5 mt-2 rounded-md text-[10px] font-bold bg-slate-900 text-white uppercase tracking-widest shadow-sm">
                      <Shield size={10} className="mr-1" /> Admin Access
                    </span>
                  </Link>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={logout} className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <LogOut size={20} />
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mx-auto mb-4">
                <User size={32} />
              </div>
              <h2 className="font-bold text-lg text-slate-900 mb-4 tracking-tight">Welcome to PromoHunter</h2>
              <Button 
                onClick={signIn} 
                disabled={signingIn}
                className="w-full bg-blue-600 rounded-xl py-6 font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
              >
                {signingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={18} className="mr-2" /> Sign in with Google
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2 mb-10">
        <Link to="/notifications"><MenuButton icon={Bell} label="Notifications" /></Link>
        <Link to="/preferences"><MenuButton icon={Settings} label="Preferences" /></Link>
        <MenuButton icon={HelpCircle} label="Help Center" />
        <MenuButton icon={FileText} label="Terms & Privacy" />
      </div>

      {user && (
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2 mb-4">My Activity</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/saved">
              <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 text-center hover:border-blue-200 transition-colors">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Saved</p>
              </Card>
            </Link>
            <Link to="/history">
              <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 text-center hover:border-slate-300 transition-colors">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Submissions / History</p>
              </Card>
            </Link>
          </div>
        </section>
      )}

      {isAdmin && (
        <div className="mb-10">
          <Link to="/admin">
            <Button variant="outline" className="w-full h-14 rounded-xl border border-slate-300 text-slate-800 font-bold bg-white hover:bg-slate-50 shadow-sm">
              <Shield size={18} className="mr-2 text-slate-600" /> Open Admin Dashboard
            </Button>
          </Link>
        </div>
      )}

      <footer className="text-center pb-10">
        <p className="text-[10px] text-slate-300 font-medium tracking-wide">PROMOHUNTER MY VERSION 1.0.0</p>
        <p className="text-[10px] text-slate-300 tracking-wide">MADE FOR MALAYSIA 🇲🇾</p>
      </footer>
    </div>
  );
}

function MenuButton({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <button className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 hover:bg-slate-50 transition-colors group">
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors border border-slate-100">
          <Icon size={20} />
        </div>
        <span className="ml-4 font-semibold text-slate-700 tracking-tight">{label}</span>
      </div>
      <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
    </button>
  );
}
