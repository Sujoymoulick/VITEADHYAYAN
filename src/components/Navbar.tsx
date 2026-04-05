import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Home, Compass, Trophy, History, Settings, LogOut, BrainCircuit } from 'lucide-react';

export function Navbar() {
  const { profile, signOut } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Explore', path: '/explore', icon: Compass },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'History', path: '/history', icon: History },
  ];

  return (
    <nav className={cn(
      "sticky top-0 z-50 backdrop-blur-xl border-b transition-colors",
      isDark ? "bg-black/40 border-white/10" : "bg-white/80 border-blue-100 shadow-sm"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              <BrainCircuit className={cn("w-8 h-8", isDark ? "text-teal-400" : "text-blue-600")} />
              <span className={cn("font-bold text-xl tracking-tight hidden sm:block", isDark ? "text-white" : "text-gray-900")}>
                Adhyayan
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all",
                      isActive 
                        ? (isDark ? "bg-white/10 text-white" : "bg-blue-50 text-blue-700")
                        : (isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-black/5")
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link 
              to="/settings" 
              className={cn("p-2 rounded-full transition-colors", isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5")}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button 
              onClick={handleSignOut}
              className={cn("p-2 rounded-full transition-colors", isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5")}
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <div className="ml-1 sm:ml-2 pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-800">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-teal-500 object-cover" />
              ) : (
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", isDark ? "bg-teal-500/20 text-teal-400 border border-teal-500" : "bg-blue-100 text-blue-600 border border-blue-500")}>
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Nav */}
      <div className="md:hidden border-t border-white/5 overflow-x-auto scrollbar-hide">
        <div className="flex p-2 gap-1 min-w-max">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
                  isActive 
                    ? (isDark ? "bg-white/10 text-white" : "bg-blue-50 text-blue-700")
                    : (isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-black/5")
                )}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
