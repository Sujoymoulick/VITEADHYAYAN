import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { ArrowLeft, Trophy, Medal, Crown, Loader2, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Leaderboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
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
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/dashboard" className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-white/10 text-gray-300" : "hover:bg-black/5 text-gray-600")}>
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex flex-col">
          <h1 className={cn("text-3xl font-bold tracking-tight flex items-center gap-3", isDark ? "text-white" : "text-gray-900")}>
            <Trophy className={cn("w-8 h-8", isDark ? "text-amber-400" : "text-amber-500")} />
            Global Leaderboard
          </h1>
          <p className={cn("text-sm mt-1", isDark ? "text-teal-400/60" : "text-blue-600/60")}>
            Showing top performance from all users
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className={cn("w-8 h-8 animate-spin", isDark ? "text-teal-500" : "text-blue-600")} />
        </div>
      ) : (
        <div className="space-y-4">
          {leaders.map((user, index) => {
            const isCurrentUser = profile?.id === user.id;
            const rank = user.rank;
            
            // Define special styles for top 3
            const isTopThree = rank <= 3;
            const rankStyles = {
              1: {
                card: isDark 
                  ? "bg-gradient-to-r from-yellow-500/10 via-amber-500/20 to-yellow-500/10 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20" 
                  : "bg-gradient-to-r from-yellow-50 via-amber-100 to-yellow-50 border-amber-200 shadow-lg ring-1 ring-amber-200/50",
                icon: "bg-amber-400 text-amber-900 shadow-[0_0_15px_rgba(251,191,36,0.5)]",
                textColor: "text-amber-500",
                glow: "after:absolute after:inset-0 after:rounded-2xl after:shadow-[0_0_20px_rgba(245,158,11,0.1)] after:pointer-events-none"
              },
              2: {
                card: isDark 
                  ? "bg-gradient-to-r from-slate-400/10 via-gray-300/10 to-slate-400/10 border-slate-400/30 shadow-[0_0_20px_rgba(148,163,184,0.1)]" 
                  : "bg-gradient-to-r from-slate-50 via-gray-100 to-slate-50 border-slate-200 shadow-md",
                icon: "bg-slate-300 text-slate-800",
                textColor: "text-slate-400",
                glow: ""
              },
              3: {
                card: isDark 
                  ? "bg-gradient-to-r from-amber-700/10 via-orange-900/10 to-amber-700/10 border-amber-700/30 shadow-[0_0_15px_rgba(180,83,9,0.1)]" 
                  : "bg-gradient-to-r from-orange-50 via-amber-100 to-orange-50 border-orange-200 shadow-md",
                icon: "bg-amber-600 text-amber-50",
                textColor: "text-amber-600",
                glow: ""
              }
            }[rank as 1 | 2 | 3] || {
              card: isCurrentUser 
                ? (isDark ? "bg-teal-500/10 border-teal-500/30" : "bg-blue-50 border-blue-200")
                : (isDark ? "bg-black/40 border-white/5" : "bg-white border-gray-100 shadow-sm"),
              icon: isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500",
              textColor: isDark ? "text-gray-500" : "text-gray-400",
              glow: ""
            };

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={cn(
                  "relative p-4 md:p-6 rounded-2xl backdrop-blur-xl border flex items-center gap-4 md:gap-6 transition-all duration-300",
                  rankStyles.card,
                  rankStyles.glow,
                  isTopThree && "hover:scale-[1.01] cursor-default"
                )}
              >
                <div className={cn(
                  "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-lg md:text-xl flex-shrink-0 relative",
                  rankStyles.icon
                )}>
                  {rank === 1 ? <Crown className="w-7 h-7" /> : 
                   rank === 2 ? <Medal className="w-7 h-7" /> :
                   rank === 3 ? <Medal className="w-7 h-7" /> :
                   <span className="text-sm font-black">#{rank}</span>}
                  
                  {rank === 1 && (
                    <motion.div 
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-1 -right-1"
                    >
                      <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                    </motion.div>
                  )}
                </div>
                
                <div className="relative">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className={cn(
                      "w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 shadow-sm",
                      rank === 1 ? "border-amber-400/50" : rank === 2 ? "border-slate-300/50" : "border-transparent"
                    )} />
                  ) : (
                    <div className={cn(
                      "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-xl border-2", 
                      rank === 1 ? "bg-amber-400/10 text-amber-500 border-amber-400/30" : 
                      isDark ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : 
                      "bg-blue-100 text-blue-600 border-blue-200"
                    )}>
                      {user.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  {isTopThree && (
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900",
                      rank === 1 ? "bg-amber-400 text-amber-900" :
                      rank === 2 ? "bg-slate-300 text-slate-800" :
                      "bg-amber-600 text-amber-50"
                    )}>
                      <span className="text-[10px] font-bold">{rank}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-grow">
                  <h3 className={cn("text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
                    {user.username}
                    {isCurrentUser && (
                      <span className={cn(
                        "text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider", 
                        isDark ? "bg-teal-500/20 text-teal-400" : "bg-blue-600 text-white"
                      )}>
                        YOU
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm font-medium">
                    <span className={cn(isDark ? "text-gray-400" : "text-gray-600")}>
                      {user.quizzes_attempted} {user.quizzes_attempted === 1 ? 'Quiz' : 'Quizzes'}
                    </span>
                    <span className={cn("w-1 h-1 rounded-full", isDark ? "bg-white/20" : "bg-gray-300")} />
                    <span className={cn(
                      rank === 1 ? "text-amber-500" : 
                      rank === 2 ? "text-slate-400" : 
                      rank === 3 ? "text-amber-600" : 
                      isDark ? "text-teal-400/70" : "text-blue-600"
                    )}>
                      {rank === 1 ? 'Grand Master' : rank === 2 ? 'Master' : rank === 3 ? 'Elite' : 'Competitor'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className={cn(
                    "text-2xl md:text-3xl font-black tabular-nums tracking-tight", 
                    rank === 1 ? "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" : 
                    rank === 2 ? "text-slate-400" : 
                    rank === 3 ? "text-amber-600" : 
                    isDark ? "text-teal-400" : "text-blue-600"
                  )}>
                    {user.total_score.toLocaleString()}
                  </div>
                  <div className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-gray-500" : "text-gray-400")}>
                    XP Points
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

