import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Trophy, Target, Award, Play, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Dashboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [stats, setStats] = useState({ rank: '-', score: 0, quizzesAttempted: 0 });

  useEffect(() => {
    const fetchQuizzes = async () => {
      const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false }).limit(3);
      if (data) setQuizzes(data);
    };
    
    const fetchStats = async () => {
      if (!profile) return;
      const { data } = await supabase.from('leaderboard').select('*').eq('id', profile.id).single();
      if (data) {
        setStats({
          rank: `#${data.rank}`,
          score: data.total_score,
          quizzesAttempted: data.quizzes_attempted
        });
      }
    };

    fetchQuizzes();
    fetchStats();
  }, [profile]);

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className={cn("text-3xl md:text-4xl font-bold tracking-tight", isDark ? "text-white" : "text-gray-900")}>
          Welcome back, {profile?.username || 'Explorer'}
        </h1>
        <p className={cn("mt-2 text-lg", isDark ? "text-teal-400/80" : "text-blue-600/80")}>
          Ready to conquer new knowledge?
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Stat Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={cn("p-6 rounded-2xl backdrop-blur-xl border", isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100 shadow-sm")}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={cn("p-3 rounded-xl", isDark ? "bg-teal-500/20 text-teal-400" : "bg-blue-100 text-blue-600")}>
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className={cn("font-medium", isDark ? "text-gray-400" : "text-gray-600")}>Total Score</h3>
          </div>
          <p className={cn("text-4xl font-bold", isDark ? "text-white" : "text-gray-900")}>{stats.score}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={cn("p-6 rounded-2xl backdrop-blur-xl border", isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100 shadow-sm")}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={cn("p-3 rounded-xl", isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600")}>
              <Target className="w-6 h-6" />
            </div>
            <h3 className={cn("font-medium", isDark ? "text-gray-400" : "text-gray-600")}>Quizzes Attempted</h3>
          </div>
          <p className={cn("text-4xl font-bold", isDark ? "text-white" : "text-gray-900")}>{stats.quizzesAttempted}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className={cn("p-6 rounded-2xl backdrop-blur-xl border", isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100 shadow-sm")}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={cn("p-3 rounded-xl", isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600")}>
              <Award className="w-6 h-6" />
            </div>
            <h3 className={cn("font-medium", isDark ? "text-gray-400" : "text-gray-600")}>Global Rank</h3>
          </div>
          <p className={cn("text-4xl font-bold", isDark ? "text-white" : "text-gray-900")}>{stats.rank}</p>
        </motion.div>
      </div>

      <div className="mb-12">
        <h2 className={cn("text-2xl font-bold mb-6", isDark ? "text-white" : "text-gray-900")}>Lakshya Tracker</h2>
        <div className={cn("p-6 rounded-2xl backdrop-blur-xl border", isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100 shadow-sm")}>
          <div className="flex justify-between text-sm mb-2">
            <span className={isDark ? "text-gray-400" : "text-gray-600"}>Level 5</span>
            <span className={isDark ? "text-teal-400" : "text-blue-600"}>2400 / 3000 XP</span>
          </div>
          <div className={cn("h-4 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-gray-200")}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '80%' }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn("h-full rounded-full", isDark ? "bg-gradient-to-r from-teal-600 to-teal-400 shadow-[0_0_10px_rgba(0,255,255,0.5)]" : "bg-gradient-to-r from-blue-600 to-blue-400")}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>Featured Quizzes</h2>
          
          <Link to="/explore" className={cn(
            "px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all whitespace-nowrap",
            isDark 
              ? "bg-white/10 hover:bg-white/20 text-white border border-white/10" 
              : "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm"
          )}>
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quizzes.length > 0 ? quizzes.map((quiz, i) => (
            <Link to={`/quiz/${quiz.id}`} key={quiz.id}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i }}
                className={cn("rounded-2xl overflow-hidden backdrop-blur-xl border group cursor-pointer h-full", isDark ? "bg-black/40 border-white/10 hover:border-teal-500/50" : "bg-white/60 border-blue-100 hover:border-blue-400 shadow-sm")}
              >
                <div className="h-40 bg-gray-800 relative overflow-hidden">
                  {quiz.image_url ? (
                    <img src={quiz.image_url} alt={quiz.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <Target className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className={cn("p-3 rounded-full", isDark ? "bg-teal-500 text-black" : "bg-blue-600 text-white")}>
                      <Play className="w-6 h-6 ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <span className={cn("text-xs font-semibold px-2 py-1 rounded-md mb-3 inline-block", isDark ? "bg-teal-500/20 text-teal-400" : "bg-blue-100 text-blue-700")}>
                    {quiz.category || 'General'}
                  </span>
                  <h3 className={cn("text-lg font-bold mb-1", isDark ? "text-white" : "text-gray-900")}>{quiz.title}</h3>
                  <p className={cn("text-sm line-clamp-2", isDark ? "text-gray-400" : "text-gray-600")}>{quiz.description}</p>
                </div>
              </motion.div>
            </Link>
          )) : (
            <div className={cn("col-span-3 p-12 text-center rounded-2xl border border-dashed", isDark ? "border-white/20 text-gray-400" : "border-gray-300 text-gray-500")}>
              <p>No quizzes available yet. Be the first to create one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
