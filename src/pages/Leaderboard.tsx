import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { ArrowLeft, Trophy, Medal, Loader2 } from 'lucide-react';
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
        <h1 className={cn("text-3xl font-bold tracking-tight flex items-center gap-3", isDark ? "text-white" : "text-gray-900")}>
          <Trophy className={cn("w-8 h-8", isDark ? "text-amber-400" : "text-amber-500")} />
          Global Leaderboard
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className={cn("w-8 h-8 animate-spin", isDark ? "text-teal-500" : "text-blue-600")} />
        </div>
      ) : (
        <div className="space-y-4">
          {leaders.map((user, index) => {
            const isCurrentUser = profile?.id === user.id;
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "p-4 md:p-6 rounded-2xl backdrop-blur-xl border flex items-center gap-4 md:gap-6 transition-all",
                  isCurrentUser 
                    ? (isDark ? "bg-teal-500/20 border-teal-500/50 shadow-[0_0_15px_rgba(0,255,255,0.1)]" : "bg-blue-50 border-blue-300 shadow-md")
                    : (isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100")
                )}
              >
                <div className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-lg md:text-xl flex-shrink-0",
                  user.rank === 1 ? "bg-yellow-400 text-yellow-900" :
                  user.rank === 2 ? "bg-gray-300 text-gray-800" :
                  user.rank === 3 ? "bg-amber-600 text-amber-100" :
                  (isDark ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600")
                )}>
                  {user.rank <= 3 ? <Medal className="w-6 h-6" /> : `#${user.rank}`}
                </div>
                
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-12 h-12 rounded-full object-cover border-2 border-transparent" />
                ) : (
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl", isDark ? "bg-teal-500/20 text-teal-400" : "bg-blue-100 text-blue-600")}>
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                
                <div className="flex-grow">
                  <h3 className={cn("text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
                    {user.username}
                    {isCurrentUser && <span className={cn("text-xs px-2 py-0.5 rounded-full", isDark ? "bg-teal-500/20 text-teal-400" : "bg-blue-100 text-blue-700")}>You</span>}
                  </h3>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>
                    {user.quizzes_attempted} {user.quizzes_attempted === 1 ? 'quiz' : 'quizzes'} attempted
                  </p>
                </div>

                <div className="text-right">
                  <div className={cn("text-2xl font-bold", isDark ? "text-teal-400" : "text-blue-600")}>
                    {user.total_score}
                  </div>
                  <div className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-gray-500" : "text-gray-400")}>
                    XP
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
