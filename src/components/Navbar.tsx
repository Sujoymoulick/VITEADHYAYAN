import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { 
  Home, Compass, Trophy, History, Settings, 
  LogOut, BrainCircuit, Swords, MoreVertical, X,
  User, Play
} from 'lucide-react';

export function Navbar() {
  const { profile, signOut } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Explore', path: '/explore', icon: Compass },
    { name: 'Battle', path: '/battle', icon: Swords },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'History', path: '/history', icon: History },
  ];

  return (
    <nav className={cn(
      "sticky top-0 z-50 backdrop-blur-xl border-b transition-all",
      isDark ? "bg-black/40 border-white/10" : "bg-white/80 border-blue-100 shadow-sm"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className={cn(
                "p-1.5 rounded-xl transition-all group-hover:rotate-12",
                isDark ? "bg-teal-500/10 text-teal-400" : "bg-blue-600/10 text-blue-600"
              )}>
                <BrainCircuit className="w-8 h-8" />
              </div>
              <span className={cn("font-bold text-xl tracking-tight", isDark ? "text-white" : "text-gray-900")}>
                Adhyayan
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1 mr-4">
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

            {/* Profile Dropdown & Mobile Menu */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsOpen(!isOpen)}
                  className={cn(
                    "flex items-center gap-2 p-1 rounded-full transition-all active:scale-95",
                    isOpen && (isDark ? "ring-4 ring-teal-500/10" : "ring-4 ring-blue-500/10")
                  )}
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full border-2 border-teal-500/50 object-cover shadow-lg" />
                  ) : (
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all shadow-lg",
                      isDark 
                        ? "bg-teal-500/20 text-teal-400 border-teal-500/50" 
                        : "bg-blue-100 text-blue-600 border-blue-200"
                    )}>
                      {profile?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  {/* Three-Dot Menu Indicator */}
                  <div className={cn(
                    "p-1.5 rounded-lg md:hidden",
                    isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                  )}>
                    {isOpen ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
                  </div>
                </button>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    className={cn(
                      "absolute right-0 mt-3 w-64 rounded-2xl border backdrop-blur-2xl shadow-2xl overflow-hidden z-[60]",
                      isDark ? "bg-black/90 border-white/10 shadow-black/50" : "bg-white/95 border-gray-100 shadow-blue-500/10"
                    )}
                  >
                    {/* User Profile Hook */}
                    <div className={cn("p-4 border-b", isDark ? "border-white/5" : "border-gray-50 bg-gray-50/50")}>
                      <div className="flex items-center gap-3">
                        <Link to="/settings" onClick={() => setIsOpen(false)} className="relative group">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg overflow-hidden",
                            isDark ? "bg-teal-500 text-black" : "bg-blue-600 text-white"
                          )}>
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                              profile?.username?.[0]?.toUpperCase() || 'U'
                            )}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Settings className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </Link>
                        <div className="flex flex-col">
                          <span className={cn("font-bold text-sm truncate", isDark ? "text-white" : "text-gray-900")}>
                            {profile?.username || 'Learner'}
                          </span>
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-teal-400" : "text-blue-600")}>
                            {profile?.total_score || 0} XP earned
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 space-y-0.5">
                      {/* Mobile-Only Navigation Links */}
                      <div className="md:hidden space-y-0.5 pb-2 border-b mb-2 border-white/5">
                        <p className={cn("px-3 py-1 text-[10px] uppercase font-black tracking-widest opacity-40", isDark ? "text-white" : "text-gray-900")}>Navigation</p>
                        {navItems.map((item) => {
                          const isActive = location.pathname === item.path;
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                isActive 
                                  ? (isDark ? "bg-teal-500 text-black" : "bg-blue-600 text-white")
                                  : (isDark ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-blue-50")
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>

                      <p className={cn("px-3 py-1 text-[10px] uppercase font-black tracking-widest opacity-40", isDark ? "text-white" : "text-gray-900")}>Settings</p>
                      <Link
                        to="/settings"
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                          isDark ? "text-gray-300 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                        )}
                      >
                        <div className={cn("p-1.5 rounded-lg", isDark ? "bg-white/5" : "bg-blue-500/10")}>
                          <User className="w-4 h-4" />
                        </div>
                        Profile Settings
                      </Link>
                      
                      <button
                        onClick={handleSignOut}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                          isDark ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50"
                        )}
                      >
                        <div className={cn("p-1.5 rounded-lg transition-colors", isDark ? "bg-red-500/10" : "bg-red-100/50")}>
                          <LogOut className="w-4 h-4" />
                        </div>
                        Sign Out
                      </button>
                    </div>

                    <div className={cn("px-4 py-3 text-center border-t", isDark ? "border-white/5" : "border-gray-50")}>
                      <p className={cn("text-[9px] font-black uppercase tracking-widest opacity-40", isDark ? "text-white" : "text-gray-900")}>Adhyayan v1.0.5</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
