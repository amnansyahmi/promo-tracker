import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { AppNotification } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, BellOff, Info, CheckCircle2, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error(error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-green-600" size={18} />;
      case 'warning': return <AlertTriangle className="text-amber-600" size={18} />;
      case 'error': return <XCircle className="text-red-600" size={18} />;
      default: return <Info className="text-blue-600" size={18} />;
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 min-h-screen bg-slate-50">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
        </div>
        <Bell className="text-slate-300" size={24} />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map(notification => (
            <Card 
              key={notification.id} 
              className={`rounded-2xl border transition-all ${notification.isRead ? 'bg-white border-slate-100 opacity-80' : 'bg-white border-blue-100 shadow-md scale-[1.02]'}`}
              onClick={() => markAsRead(notification.id)}
            >
              <CardContent className="p-4 flex space-x-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notification.isRead ? 'bg-slate-100' : 'bg-blue-50'}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-sm font-bold truncate ${notification.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                       {formatDistanceToNow(new Date(notification.createdAt))} ago
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">{notification.message}</p>
                  {notification.link && (
                    <Link to={notification.link} className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider">
                      View Details
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <BellOff size={32} />
          </div>
          <p className="font-bold text-slate-500">Perfectly quiet</p>
          <p className="text-xs mt-1 text-slate-400">No new notifications at the moment.</p>
        </div>
      )}
    </div>
  );
}
