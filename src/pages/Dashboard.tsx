import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Trophy, Target, Award, Play, ArrowRight, Edit3, Globe, Lock, Plus, Star, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/PageTransition';

export function Dashboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [featuredQuizzes, setFeaturedQuizzes] = useState<any[]>([]);
  const [myQuizzes, setMyQuizzes] = useState<any[]>([]);
  const [stats, setStats] = useState({ rank: '-', score: 0, quizzesAttempted: 0 });

  useEffect(() => {
    const fetchQuizzes = async () => {
      // Fetch public featured quizzes (not including own)
      const { data: featured } = await supabase
        .from('quizzes_with_stats')
        .select('*')
        .eq('is_public', true)
        .neq('creator_id', profile?.id || '')
        .order('created_at', { ascending: false })
        .limit(3);
      if (featured) setFeaturedQuizzes(featured);

      // Fetch own quizzes (both public and private)
      if (profile) {
        const { data: owns } = await supabase
          .from('quizzes_with_stats')
          .select('*')
          .eq('creator_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(3);
        if (owns) setMyQuizzes(owns);
      }
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
    <PageTransition className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
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
            <span className={isDark ? "text-gray-400" : "text-gray-600"}>Level {Math.floor(stats.score / 1000) + 1}</span>
            <span className={isDark ? "text-teal-400" : "text-blue-600"}>{stats.score % 1000} / 1000 XP for next level</span>
          </div>
          <div className={cn("h-4 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-gray-200")}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(stats.score % 1000) / 10}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn("h-full rounded-full", isDark ? "bg-gradient-to-r from-teal-600 to-teal-400 shadow-[0_0_10px_rgba(0,255,255,0.5)]" : "bg-gradient-to-r from-blue-600 to-blue-400")}
            />
          </div>
        </div>
      </div>

      {/* My Creations Section */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>My Creations</h2>
          <Link to="/create-quiz" className={cn(
            "px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all whitespace-nowrap",
            isDark 
              ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.2)]" 
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30"
          )}>
            <Plus className="w-4 h-4" /> Create New
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {myQuizzes.length > 0 ? myQuizzes.map((quiz, i) => (
            <div key={quiz.id} className="relative group/card">
              <Link to={`/quiz/${quiz.id}`}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i }}
                  className={cn("rounded-2xl overflow-hidden backdrop-blur-xl border group cursor-pointer h-full", isDark ? "bg-black/40 border-white/10 hover:border-teal-500/50" : "bg-white/60 border-blue-100 hover:border-blue-400 shadow-sm")}
                >
                  <div className="h-40 bg-gray-800 relative overflow-hidden">
                    {quiz.image_url ? (
                      <img 
                        src={quiz.image_url} 
                        alt={quiz.title} 
                        referrerPolicy="no-referrer" 
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <Target className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    
                    {/* Visibility Badge */}
                    <div className={cn(
                      "absolute top-3 left-3 px-2 py-1 rounded-lg backdrop-blur-md border text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                      quiz.is_public !== false
                        ? (isDark ? "bg-teal-500/20 border-teal-500/40 text-teal-400" : "bg-blue-100 border-blue-200 text-blue-700")
                        : (isDark ? "bg-amber-500/20 border-amber-500/40 text-amber-500" : "bg-amber-100 border-amber-200 text-amber-700")
                    )}>
                      {quiz.is_public !== false ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {quiz.is_public !== false ? 'Public' : 'Private'}
                    </div>

                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className={cn("p-3 rounded-full", isDark ? "bg-teal-500 text-black" : "bg-blue-600 text-white")}>
                        <Play className="w-6 h-6 ml-1" />
                      </div>
                    </div>

                    {/* Rating Badge */}
                    {quiz.total_ratings > 0 && (
                      <div className={cn(
                        "absolute top-3 right-3 px-2 py-1 rounded-lg backdrop-blur-md border text-[10px] font-black flex items-center gap-1",
                        isDark ? "bg-black/60 border-white/20 text-yellow-400 shadow-xl" : "bg-white/80 border-gray-200 text-yellow-600 shadow-sm"
                      )}>
                        <Star className="w-3 h-3 fill-current" />
                        {Number(quiz.avg_rating).toFixed(1)}
                        <span className="opacity-60 font-medium">({quiz.total_ratings})</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <span className={cn("text-xs font-semibold px-2 py-1 rounded-md mb-3 inline-block", isDark ? "bg-teal-500/20 text-teal-400" : "bg-blue-100 text-blue-700")}>
                      {quiz.custom_topic || quiz.category || 'General'}
                    </span>
                    <h3 className={cn("text-lg font-bold mb-1", isDark ? "text-white" : "text-gray-900")}>{quiz.title}</h3>
                    <div className={cn("flex items-center gap-1.5 mb-3 text-xs font-medium", isDark ? "text-gray-500" : "text-gray-500")}>
                      <User className="w-3 h-3" />
                      <span>by @{quiz.creator_name || 'anonymous'}</span>
                    </div>
                    <p className={cn("text-sm line-clamp-2", isDark ? "text-gray-400" : "text-gray-600")}>{quiz.description}</p>
                  </div>
                </motion.div>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/edit-quiz/${quiz.id}`);
                }}
                className={cn(
                  "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border opacity-100 md:opacity-0 md:group-hover/card:opacity-100 transition-all z-20",
                  isDark ? "bg-black/60 border-white/20 text-teal-400 hover:bg-teal-500 hover:text-black shadow-xl" : "bg-white/80 border-gray-200 text-blue-600 hover:bg-blue-600 hover:text-white"
                )}
                title="Edit Quiz"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )) : (
            <div className={cn("col-span-3 p-12 text-center rounded-2xl border border-dashed", isDark ? "border-white/20 text-gray-400" : "border-gray-300 text-gray-500")}>
              <p>You haven't created any quizzes yet.</p>
              <Link to="/create-quiz" className={cn("inline-block mt-4 text-sm font-bold underline transition-colors", isDark ? "text-teal-400 hover:text-teal-300" : "text-blue-600 hover:text-blue-700")}>
                Start Creating Your First Quiz
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Community Highlights Section */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>Community Highlights</h2>
          <Link to="/explore" className={cn(
            "px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all whitespace-nowrap",
            isDark 
              ? "bg-white/10 hover:bg-white/20 text-white border border-white/10" 
              : "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm"
          )}>
            Explore More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredQuizzes.length > 0 ? featuredQuizzes.map((quiz, i) => (
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

                  {/* Rating Badge */}
                  {quiz.total_ratings > 0 && (
                    <div className={cn(
                      "absolute top-3 right-3 px-2 py-1 rounded-lg backdrop-blur-md border text-[10px] font-black flex items-center gap-1",
                      isDark ? "bg-black/60 border-white/20 text-yellow-400 shadow-xl" : "bg-white/80 border-gray-200 text-yellow-600 shadow-sm"
                    )}>
                      <Star className="w-3 h-3 fill-current" />
                      {Number(quiz.avg_rating).toFixed(1)}
                      <span className="opacity-60 font-medium">({quiz.total_ratings})</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <span className={cn("text-xs font-semibold px-2 py-1 rounded-md mb-3 inline-block", isDark ? "bg-teal-500/20 text-teal-400" : "bg-blue-100 text-blue-700")}>
                    {quiz.category || 'General'}
                  </span>
                  <h3 className={cn("text-lg font-bold mb-1", isDark ? "text-white" : "text-gray-900")}>{quiz.title}</h3>
                  <div className={cn("flex items-center gap-1.5 mb-3 text-xs font-medium", isDark ? "text-gray-500" : "text-gray-500")}>
                    <User className="w-3 h-3" />
                    <span>by @{quiz.creator_name || 'anonymous'}</span>
                  </div>
                  <p className={cn("text-sm line-clamp-2", isDark ? "text-gray-400" : "text-gray-600")}>{quiz.description}</p>
                </div>
              </motion.div>
            </Link>
          )) : (
            <div className={cn("col-span-3 p-12 text-center rounded-2xl border border-dashed", isDark ? "border-white/20 text-gray-400" : "border-gray-300 text-gray-500")}>
              <p>Check back later for new public quizzes!</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

