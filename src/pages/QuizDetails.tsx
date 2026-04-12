import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { 
  Loader2, Play, Clock, HelpCircle, Trophy, 
  ArrowLeft, Calendar, User, Tag, Shield, Globe
} from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

export function QuizDetails() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuizDetails() {
      if (!id) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          creator:profiles(username, avatar_url),
          questions(count)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching quiz details:', error);
      } else {
        setQuiz(data);
      }
      setLoading(false);
    }

    fetchQuizDetails();
  }, [id]);

  if (loading) {
    return (
      <PageTransition className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </PageTransition>
    );
  }

  if (!quiz) {
    return (
      <PageTransition className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h2 className={cn("text-2xl font-bold mb-4", isDark ? "text-white" : "text-gray-900")}>Quiz not found</h2>
          <button onClick={() => navigate('/explore')} className="text-teal-500 hover:underline">Back to Explore</button>
        </div>
      </PageTransition>
    );
  }

  const questionCount = quiz.questions?.[0]?.count || 0;

  return (
    <PageTransition className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className={cn(
          "mb-8 flex items-center gap-2 px-4 py-2 rounded-xl transition-all",
          isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
        )}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Image and Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "relative aspect-video rounded-3xl overflow-hidden border shadow-2xl",
              isDark ? "bg-gray-900 border-white/10" : "bg-gray-100 border-blue-100"
            )}
          >
            {quiz.image_url ? (
              <img 
                src={quiz.image_url} 
                alt={quiz.title} 
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <HelpCircle className="w-20 h-20 text-gray-700" />
              </div>
            )}
            <div className="absolute top-4 right-4 flex gap-2">
              <div className={cn(
                "px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-bold flex items-center gap-1.5",
                isDark ? "bg-black/40 border-white/20 text-teal-400" : "bg-white/80 border-blue-200 text-blue-600"
              )}>
                <Tag className="w-3 h-3" />
                {quiz.category}
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-bold flex items-center gap-1.5",
                quiz.is_public 
                  ? (isDark ? "bg-green-500/20 border-green-500/20 text-green-400" : "bg-green-50 border-green-200 text-green-600")
                  : (isDark ? "bg-yellow-500/20 border-yellow-500/20 text-yellow-400" : "bg-yellow-50 border-yellow-200 text-yellow-600")
              )}>
                {quiz.is_public ? <Globe className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                {quiz.is_public ? 'Public' : 'Private'}
              </div>
            </div>
          </motion.div>

          <div className="space-y-4">
            <h1 className={cn("text-4xl font-black tracking-tight", isDark ? "text-white" : "text-gray-900")}>
              {quiz.title}
            </h1>
            <p className={cn("text-lg leading-relaxed", isDark ? "text-gray-400" : "text-gray-600")}>
              {quiz.description || "No description provided for this quiz."}
            </p>
          </div>

          <div className={cn(
            "p-6 rounded-2xl border flex items-center gap-4",
            isDark ? "bg-white/5 border-white/10" : "bg-blue-50 border-blue-100"
          )}>
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
              isDark ? "bg-teal-500 text-black" : "bg-blue-600 text-white"
            )}>
              {quiz.creator?.avatar_url ? (
                <img src={quiz.creator.avatar_url} className="w-full h-full rounded-full object-cover" />
              ) : (
                quiz.creator?.username?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div>
              <p className={cn("text-xs font-black uppercase tracking-widest", isDark ? "text-teal-400" : "text-blue-600")}>Created By</p>
              <p className={cn("font-bold", isDark ? "text-white" : "text-gray-900")}>{quiz.creator?.username || 'Unknown User'}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata and Action */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "p-8 rounded-3xl border shadow-xl space-y-8",
              isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100"
            )}
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl", isDark ? "bg-teal-500/10 text-teal-400" : "bg-blue-50 text-blue-600")}>
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className={cn("text-xs font-bold uppercase tracking-tight opacity-50", isDark ? "text-white" : "text-gray-900")}>Questions</p>
                  <p className={cn("text-xl font-black", isDark ? "text-white" : "text-gray-900")}>{questionCount} MCQs</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl", isDark ? "bg-teal-500/10 text-teal-400" : "bg-blue-50 text-blue-600")}>
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className={cn("text-xs font-bold uppercase tracking-tight opacity-50", isDark ? "text-white" : "text-gray-900")}>Time Limit</p>
                  <p className={cn("text-xl font-black", isDark ? "text-white" : "text-gray-900")}>{quiz.time_limit ? `${quiz.time_limit / 60} minutes` : 'No limit'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl", isDark ? "bg-teal-500/10 text-teal-400" : "bg-blue-50 text-blue-600")}>
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <p className={cn("text-xs font-bold uppercase tracking-tight opacity-50", isDark ? "text-white" : "text-gray-900")}>Experience</p>
                  <p className={cn("text-xl font-black", isDark ? "text-white" : "text-gray-900")}>{questionCount * 10} XP Reward</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => navigate(`/quiz-taking/${quiz.id}`)}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95",
                isDark 
                  ? "bg-teal-500 hover:bg-teal-400 text-black shadow-teal-500/20" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
              )}
            >
              <Play className="w-6 h-6" />
              Start Quiz Now
            </button>
          </motion.div>

          <div className={cn(
            "p-6 rounded-3xl border text-center space-y-2",
            isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"
          )}>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <Calendar className="w-3 h-3" />
              Created on {new Date(quiz.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
