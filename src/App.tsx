import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Home from '@/pages/Home';
import Search from '@/pages/Search';
import PromoDetail from '@/pages/PromoDetail';
import Submit from '@/pages/Submit';
import Saved from '@/pages/Saved';
import Profile from '@/pages/Profile';
import Preferences from '@/pages/Preferences';
import History from '@/pages/History';
import Admin from '@/pages/Admin';
import Notifications from '@/pages/Notifications';
import Navigation from '@/components/Navigation';
import { AuthProvider } from '@/contexts/AuthContext';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/promo/:id" element={<PromoDetail />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/edit/:id" element={<Submit />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/admin/*" element={<Admin />} />
          </Routes>
          <Navigation />
          <Toaster position="top-center" />
        </div>
      </AuthProvider>
    </Router>
  );
}
