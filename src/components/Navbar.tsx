import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Home, Compass, Trophy, History, Settings, LogOut, BrainCircuit, Swords } from 'lucide-react';

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

  useEffect(() => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset) {
      console.warn('⚠️ [Adhyayan] Cloudinary is NOT configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env or Vercel settings.');
    } else {
      console.log('✅ [Adhyayan] Cloudinary configuration found.');
    }
  }, []);

  return (
    <nav className={cn(
      "sticky top-0 z-50 backdrop-blur-xl border-b transition-colors",
      isDark ? "bg-black/40 border-white/10" : "bg-white/80 border-blue-100 shadow-sm"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2">
              <BrainCircuit className={cn("w-8 h-8", isDark ? "text-teal-400" : "text-blue-600")} />
              <span className={cn("font-bold text-xl tracking-tight hidden sm:block", isDark ? "text-white" : "text-gray-900")}>
                Adhyayan
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
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

            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1 rounded-full transition-all hover:ring-4 hover:ring-teal-500/10 active:scale-95"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full border-2 border-teal-500/50 object-cover shadow-lg shadow-teal-500/10" />
                ) : (
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all shadow-lg",
                    isDark 
                      ? "bg-teal-500/20 text-teal-400 border-teal-500/50 shadow-teal-500/10" 
                      : "bg-blue-100 text-blue-600 border-blue-200 shadow-blue-500/10"
                  )}>
                    {profile?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    className={cn(
                      "absolute right-0 mt-3 w-64 rounded-2xl border backdrop-blur-2xl shadow-2xl overflow-hidden z-[60]",
                      isDark ? "bg-black/80 border-white/10 shadow-black/50" : "bg-white/90 border-gray-100 shadow-blue-500/10"
                    )}
                  >
                    {/* User Header */}
                    <div className={cn("p-4 border-b", isDark ? "border-white/5" : "border-gray-50 bg-gray-50/50")}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg",
                          isDark ? "bg-teal-500 text-black" : "bg-blue-600 text-white"
                        )}>
                          {profile?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className={cn("font-bold text-sm truncate", isDark ? "text-white" : "text-gray-900")}>
                            {profile?.username || 'Learner'}
                          </span>
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-teal-400" : "text-blue-600")}>
                            Elite Member
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <Link
                        to="/settings"
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                          isDark ? "text-gray-300 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                        )}
                      >
                        <div className={cn("p-1.5 rounded-lg", isDark ? "bg-white/5" : "bg-blue-500/10")}>
                          <Settings className="w-4 h-4" />
                        </div>
                        Settings
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

                    <div className={cn("px-4 py-2 text-[10px] uppercase font-bold tracking-tighter opacity-40 text-center", isDark ? "text-white" : "text-gray-900")}>
                      Adhyayan v1.0.4
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation Bar */}
      <div className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl border-t py-2 shadow-2xl transition-all h-[72px]",
        isDark ? "bg-black/80 border-white/10" : "bg-white/90 border-blue-50/50 shadow-blue-500/10"
      )}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl transition-all relative group",
                  isActive 
                    ? (isDark ? "text-teal-400" : "text-blue-600")
                    : (isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600")
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeMobileTab"
                    className={cn(
                      "absolute inset-0 rounded-2xl -z-10",
                      isDark ? "bg-teal-500/10 shadow-[0_0_15px_rgba(20,184,166,0.15)]" : "bg-blue-50 shadow-[0_4px_10px_rgba(37,99,235,0.05)]"
                    )}
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
                  />
                )}
                <Icon className={cn("w-5 h-5 transition-all", isActive ? "scale-110 stroke-[2.5px]" : "group-hover:scale-110")} />
                <span className={cn("text-[9px] font-black uppercase tracking-tighter transition-all", isActive ? "opacity-100" : "opacity-70")}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
