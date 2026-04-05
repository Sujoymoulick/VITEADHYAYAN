import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { ArrowLeft, History, Target, Calendar, Award, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/PageTransition';

export function QuizHistory() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile) return;
      
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*, quizzes(title, image_url, category)')
        .eq('user_id', profile.id)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error);
      } else if (data) {
        setAttempts(data);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [profile]);

  return (
    <PageTransition className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/dashboard" className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-white/10 text-gray-300" : "hover:bg-black/5 text-gray-600")}>
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className={cn("text-3xl font-bold tracking-tight flex items-center gap-3", isDark ? "text-white" : "text-gray-900")}>
          <History className={cn("w-8 h-8", isDark ? "text-teal-400" : "text-blue-600")} />
          Quiz History
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className={cn("w-8 h-8 animate-spin", isDark ? "text-teal-500" : "text-blue-600")} />
        </div>
      ) : attempts.length > 0 ? (
        <div className="space-y-4">
          {attempts.map((attempt, index) => (
            <motion.div
              key={attempt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-4 md:p-6 rounded-2xl backdrop-blur-xl border shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center transition-all hover:shadow-md",
                isDark ? "bg-black/40 border-white/10 hover:border-teal-500/30" : "bg-white/60 border-blue-100 hover:border-blue-300"
              )}
            >
              <div className="w-full md:w-32 h-32 md:h-24 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 relative">
                {attempt.quizzes?.image_url ? (
                  <img src={attempt.quizzes.image_url} alt={attempt.quizzes.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <Target className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", isDark ? "bg-teal-500/20 text-teal-400" : "bg-blue-100 text-blue-700")}>
                    {attempt.quizzes?.category || 'General'}
                  </span>
                </div>
                <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-gray-900")}>
                  {attempt.quizzes?.title || 'Unknown Quiz'}
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className={cn("flex items-center gap-1.5", isDark ? "text-gray-400" : "text-gray-600")}>
                    <Calendar className="w-4 h-4" />
                    {new Date(attempt.completed_at).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <div className={cn(
                "flex items-center gap-3 px-6 py-4 rounded-xl md:ml-auto w-full md:w-auto justify-center",
                isDark ? "bg-white/5 border border-white/10" : "bg-blue-50 border border-blue-100"
              )}>
                <Award className={cn("w-6 h-6", isDark ? "text-teal-400" : "text-blue-600")} />
                <div className="text-center">
                  <div className={cn("text-sm font-medium", isDark ? "text-gray-400" : "text-gray-500")}>Score</div>
                  <div className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                    {attempt.score}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={cn("p-12 text-center rounded-2xl border border-dashed", isDark ? "border-white/20 bg-black/20" : "border-gray-300 bg-white/40")}
        >
          <History className={cn("w-12 h-12 mx-auto mb-4 opacity-50", isDark ? "text-teal-400" : "text-blue-600")} />
          <h3 className={cn("text-xl font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>No History Yet</h3>
          <p className={cn(isDark ? "text-gray-400" : "text-gray-600")}>
            You haven't attempted any quizzes yet. Head back to the dashboard to start learning!
          </p>
          <Link 
            to="/dashboard" 
            className={cn(
              "inline-block mt-6 px-6 py-2.5 rounded-xl font-semibold transition-all",
              isDark ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]" : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
            )}
          >
            Explore Quizzes
          </Link>
        </motion.div>
      )}
    </PageTransition>
  );
}
