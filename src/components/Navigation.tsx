import { NavLink } from 'react-router-dom';
import { Home, Search, PlusSquare, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navigation() {
  const items = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: PlusSquare, label: 'Submit', path: '/submit' },
    { icon: Heart, label: 'Saved', path: '/saved' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 w-full h-20 bg-white border-t border-slate-100 flex items-center justify-around px-2 z-50">
      {items.map((item) => {
        if (item.path === '/submit') {
          return (
            <NavLink key={item.path} to={item.path} className="-mt-10">
              <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white transition-transform hover:scale-105">
                <item.icon size={24} />
              </div>
            </NavLink>
          );
        }
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-colors duration-200 min-w-[64px]",
                isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              )
            }
          >
            <item.icon size={24} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
