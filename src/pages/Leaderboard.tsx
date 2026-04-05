import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { ArrowLeft, Trophy, Medal, Crown, Loader2, Star, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/PageTransition';

export function Leaderboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'global' | 'monthly'>('global');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('rank', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching leaderboard:', error);
      } else if (data) {
        setLeaders(data);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [activeTab]);

  const topThree = leaders.slice(0, 3);
  const others = leaders.slice(3);
  const userRank = leaders.find(l => l.id === profile?.id);

  return (
    <PageTransition className={cn("min-h-screen transition-colors", isDark ? "bg-[#0b0e14] text-white" : "bg-gray-50 text-gray-900")}>
      <div className="max-w-xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/dashboard" className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-black/5")}>
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Tabs */}
        <div className={cn("flex p-1 rounded-2xl mb-12", isDark ? "bg-white/5" : "bg-gray-200/50")}>
          <button 
            onClick={() => setActiveTab('global')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'global' 
                ? (isDark ? "bg-white/10 text-white shadow-lg" : "bg-white text-gray-900 shadow-md")
                : (isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700")
            )}
          >
            Global
          </button>
          <button 
            onClick={() => setActiveTab('monthly')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'monthly' 
                ? (isDark ? "bg-white/10 text-white shadow-lg" : "bg-white text-gray-900 shadow-md")
                : (isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700")
            )}
          >
            Monthly
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className={cn("w-10 h-10 animate-spin", isDark ? "text-teal-500" : "text-blue-600")} />
            <span className="text-sm font-medium animate-pulse opacity-50">Loading rankings...</span>
          </div>
        ) : (
          <>
            {/* Podium Section */}
            <div className="grid grid-cols-3 items-end gap-2 mb-12 relative px-2">
              {/* Rank 2 */}
              {topThree[1] && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative mb-3">
                    <div className={cn("w-16 h-16 md:w-20 md:h-20 rounded-full border-4 p-1", isDark ? "border-[#3b82f6]/30 bg-[#3b82f6]/10" : "border-blue-200 bg-blue-50")}>
                      <img src={topThree[1].avatar_url || `https://ui-avatars.com/api/?name=${topThree[1].username}&background=random`} alt="" className="w-full h-full rounded-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#3b82f6] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0b0e14]">2</div>
                  </div>
                  <span className="text-[11px] font-bold opacity-80 mb-1 truncate w-full text-center">@{topThree[1].username}</span>
                  <span className="text-[12px] font-black text-[#3b82f6]">{topThree[1].total_score} pts</span>
                  <Trophy className="w-5 h-5 mt-2 text-[#3b82f6] opacity-80" />
                </motion.div>
              )}

              {/* Rank 1 */}
              {topThree[0] && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                  className="flex flex-col items-center -mt-8 z-10"
                >
                  <div className="relative mb-4">
                    <div className={cn("w-24 h-24 md:w-28 md:h-28 rounded-full border-4 p-1.5 shadow-[0_0_30px_rgba(234,179,8,0.2)]", isDark ? "border-[#eab308] bg-[#eab308]/10" : "border-yellow-400 bg-yellow-50")}>
                      <img src={topThree[0].avatar_url || `https://ui-avatars.com/api/?name=${topThree[0].username}&background=random`} alt="" className="w-full h-full rounded-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#eab308] text-black text-[12px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#0b0e14]">1</div>
                    <motion.div 
                       animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                       className="absolute -top-2 -right-2"
                    >
                      <Crown className="w-6 h-6 text-[#eab308] fill-[#eab308]" />
                    </motion.div>
                  </div>
                  <span className="text-[13px] font-black mb-1 truncate w-full text-center">@{topThree[0].username}</span>
                  <span className="text-[14px] font-black text-[#eab308]">{topThree[0].total_score} pts</span>
                  <Trophy className="w-7 h-7 mt-2 text-[#ea8308]" />
                </motion.div>
              )}

              {/* Rank 3 */}
              {topThree[2] && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative mb-3">
                    <div className={cn("w-16 h-16 md:w-20 md:h-20 rounded-full border-4 p-1", isDark ? "border-[#22c55e]/30 bg-[#22c55e]/10" : "border-green-200 bg-green-50")}>
                      <img src={topThree[2].avatar_url || `https://ui-avatars.com/api/?name=${topThree[2].username}&background=random`} alt="" className="w-full h-full rounded-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#22c55e] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0b0e14]">3</div>
                  </div>
                  <span className="text-[11px] font-bold opacity-80 mb-1 truncate w-full text-center">@{topThree[2].username}</span>
                  <span className="text-[12px] font-black text-[#22c55e]">{topThree[2].total_score} pts</span>
                  <Trophy className="w-5 h-5 mt-2 text-[#22c55e] opacity-80" />
                </motion.div>
              )}
            </div>

            {/* User Rank Banner */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-2xl flex items-center justify-between mb-8 border",
                isDark ? "bg-[#161b22] border-white/5" : "bg-white border-gray-100 shadow-sm"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-gray-500" : "text-gray-400")}>Your Position:</span>
                <div className={cn("px-3 py-1 rounded-full text-sm font-black", isDark ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-green-100 text-green-700")}>
                  {userRank ? `${userRank.rank}th` : 'N/A'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className={cn("h-6 w-px", isDark ? "bg-white/10" : "bg-gray-200")} />
                 <div className="flex items-center gap-1 opacity-60">
                   <span className="text-xs font-bold">5s</span>
                   <Loader2 className="w-3 h-3 animate-spin" />
                 </div>
              </div>
            </motion.div>

            {/* List */}
            <div className="space-y-1">
              {others.map((item, idx) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-2xl transition-all active:scale-[0.98]",
                    item.id === profile?.id ? (isDark ? "bg-white/10" : "bg-blue-50") : "hover:bg-white/5"
                  )}
                >
                  <span className="w-6 text-[11px] font-black opacity-30">{item.rank}.</span>
                  <div className="relative">
                    <img src={item.avatar_url || `https://ui-avatars.com/api/?name=${item.username}&background=random`} alt="" className="w-10 h-10 rounded-full object-cover border border-white/5" />
                  </div>
                  <span className={cn("flex-grow text-sm font-bold", isDark ? "text-white" : "text-gray-900")}>@{item.username}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black tabular-nums">{item.total_score}</span>
                    {idx % 3 === 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500 opacity-50" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}

