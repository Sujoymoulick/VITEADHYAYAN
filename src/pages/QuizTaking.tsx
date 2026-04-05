import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle, Clock, XCircle, Trophy } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

export function QuizTaking() {
  const { id } = useParams<{ id: string }>();
  const { profile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const isFinishedRef = useRef(isFinished);
  isFinishedRef.current = isFinished;
  const channelRef = useRef<any>(null);

  // ─── Fetch latest quiz from DB (always fresh, no cache) ─────────────────────
  const fetchQuiz = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('quizzes')
      .select('*, questions(*, options(*))')
      .eq('id', id)
      .maybeSingle();          // maybeSingle avoids the "single JSON object" error

    if (error) {
      console.error('[QuizTaking] fetch error:', error);
    } else if (data) {
      // Sort questions and options by created_at to preserve order
      const sorted = {
        ...data,
        questions: (data.questions || [])
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((q: any) => ({
            ...q,
            options: (q.options || []).sort((a: any, b: any) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          }))
      };
      setQuiz(sorted);
      if (sorted.time_limit && !isFinishedRef.current) {
        setTimeLeft(sorted.time_limit);
      }
    }
    setLoading(false);
  }, [id]);

  // ─── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  // ─── Realtime subscription: re-fetch when quiz or its questions change ────
  useEffect(() => {
    if (!id) return;

    // Clean up existing channel
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`quiz_live_${id}`)
      // Watch the quiz row itself
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'quizzes', filter: `id=eq.${id}` },
        () => {
          if (!isFinishedRef.current) fetchQuiz();
        }
      )
      // Watch its questions
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'questions', filter: `quiz_id=eq.${id}` },
        () => {
          if (!isFinishedRef.current) fetchQuiz();
        }
      )
      // Watch options (in case answer key changes)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'options' },
        () => {
          if (!isFinishedRef.current) fetchQuiz();
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Also re-fetch when the tab gets focus (covers non-realtime edits)
    const onFocus = () => { if (!isFinishedRef.current) fetchQuiz(); };
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [id, fetchQuiz]);

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || isFinishedRef.current) return;
    if (timeLeft <= 0) { finishQuiz(); return; }
    const t = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft]); // eslint-disable-line

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (selectedOptions[questionId]) return;
    setSelectedOptions(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < (quiz?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!quiz || !profile || isFinishedRef.current) return;
    isFinishedRef.current = true;

    // Remove realtime channel immediately — game is over
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    let calculatedScore = 0;
    quiz.questions.forEach((q: any) => {
      const chosen = selectedOptions[q.id];
      const opt = q.options.find((o: any) => o.id === chosen);
      if (opt?.is_correct) calculatedScore += q.points || 10;
    });

    setScore(calculatedScore);
    setIsFinished(true);

    try {
      await supabase.from('quiz_attempts').insert({
        user_id: profile.id,
        quiz_id: quiz.id,
        score: calculatedScore,
      });
      await supabase.from('profiles').update({
        total_score: (profile.total_score || 0) + calculatedScore,
      }).eq('id', profile.id);
      await refreshProfile();
    } catch (err) {
      console.error('[QuizTaking] Error saving score:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <PageTransition className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>Loading latest questions...</p>
      </div>
    </PageTransition>
  );

  if (!quiz || !quiz.questions?.length) return (
    <PageTransition className="min-h-screen flex items-center justify-center text-white">
      <div className="text-center">
        <p className={cn('text-xl font-semibold mb-4', isDark ? 'text-white' : 'text-gray-900')}>Quiz not found</p>
        <button onClick={() => navigate('/dashboard')} className="text-teal-400 underline text-sm">Back to Dashboard</button>
      </div>
    </PageTransition>
  );

  if (isFinished) return (
    <PageTransition className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180 }}
        className={cn('w-full max-w-md p-8 rounded-2xl backdrop-blur-xl border text-center shadow-2xl',
          isDark ? 'bg-black/40 border-teal-500/30' : 'bg-white/60 border-blue-200')}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={cn('w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-xl',
            isDark ? 'bg-teal-500/20 shadow-teal-500/30' : 'bg-yellow-100 shadow-yellow-500/30')}>
          <Trophy className={cn('w-10 h-10', isDark ? 'text-teal-400' : 'text-yellow-500')} />
        </motion.div>
        <h2 className={cn('text-3xl font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>Quiz Completed!</h2>
        <p className={cn('text-sm mb-6', isDark ? 'text-gray-400' : 'text-gray-600')}>{quiz.title}</p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className={cn('text-7xl font-black mb-2', isDark ? 'text-teal-400' : 'text-blue-600')}>
          {score}
        </motion.div>
        <p className={cn('text-sm mb-8', isDark ? 'text-gray-500' : 'text-gray-500')}>XP earned</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/dashboard')}
            className={cn('flex-1 py-3 rounded-xl font-semibold transition-all',
              isDark ? 'bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]'
                     : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg')}>
            Dashboard
          </button>
          <button onClick={() => navigate('/explore')}
            className={cn('flex-1 py-3 rounded-xl font-semibold transition-all border',
              isDark ? 'border-white/10 text-white hover:bg-white/10' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>
            Explore
          </button>
        </div>
      </motion.div>
    </PageTransition>
  );

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const hasSelected = !!selectedOptions[currentQuestion?.id];

  return (
    <PageTransition className="min-h-screen p-6 md:p-12 max-w-3xl mx-auto flex flex-col justify-center">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <h1 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>{quiz.title}</h1>
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold',
              timeLeft < 60
                ? 'bg-red-500/20 text-red-500 animate-pulse'
                : (isDark ? 'bg-white/10 text-teal-400' : 'bg-blue-50 text-blue-600'))}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          )}
          <span className={cn('font-medium text-sm', isDark ? 'text-teal-400' : 'text-blue-600')}>
            Q {currentQuestionIndex + 1} / {quiz.questions.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className={cn('w-full h-1.5 rounded-full mb-8 overflow-hidden', isDark ? 'bg-white/10' : 'bg-gray-200')}>
        <motion.div className={cn('h-full rounded-full', isDark ? 'bg-teal-400' : 'bg-blue-500')}
          animate={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          transition={{ duration: 0.4 }} />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className={cn('p-8 rounded-2xl backdrop-blur-xl border shadow-xl',
            isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100')}>

          {currentQuestion?.image_url && (
            <img src={currentQuestion.image_url} alt="Question" className="w-full h-48 object-cover rounded-xl mb-6" />
          )}

          <h2 className={cn('text-2xl font-semibold mb-8', isDark ? 'text-white' : 'text-gray-900')}>
            {currentQuestion?.question_text}
          </h2>

          <div className="space-y-4">
            {currentQuestion?.options?.map((option: any) => {
              const isSelected = selectedOptions[currentQuestion.id] === option.id;
              const isCorrect = option.is_correct;
              let cls = '';
              let Icon: any = null;

              if (hasSelected) {
                if (isSelected && isCorrect) {
                  cls = isDark ? 'border-green-500 bg-green-500/10 text-white' : 'border-green-600 bg-green-50 text-gray-900';
                  Icon = <CheckCircle className={cn('w-5 h-5', isDark ? 'text-green-400' : 'text-green-600')} />;
                } else if (isSelected && !isCorrect) {
                  cls = isDark ? 'border-red-500 bg-red-500/10 text-white' : 'border-red-600 bg-red-50 text-gray-900';
                  Icon = <XCircle className={cn('w-5 h-5', isDark ? 'text-red-400' : 'text-red-600')} />;
                } else if (!isSelected && isCorrect) {
                  cls = isDark ? 'border-green-500/50 bg-transparent text-white opacity-70' : 'border-green-600/50 bg-transparent text-gray-900 opacity-70';
                  Icon = <CheckCircle className={cn('w-5 h-5', isDark ? 'text-green-400' : 'text-green-600')} />;
                } else {
                  cls = isDark ? 'border-gray-800 opacity-30 text-gray-500' : 'border-gray-200 opacity-30 text-gray-400';
                }
              } else {
                cls = isDark ? 'border-gray-700 hover:border-teal-500/50 hover:bg-teal-500/5 text-gray-300 cursor-pointer'
                             : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 cursor-pointer';
              }

              return (
                <motion.button key={option.id}
                  whileHover={!hasSelected ? { scale: 1.01 } : {}}
                  whileTap={!hasSelected ? { scale: 0.99 } : {}}
                  onClick={() => handleOptionSelect(currentQuestion.id, option.id)}
                  disabled={hasSelected}
                  className={cn('w-full p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center', cls)}>
                  <span className="font-medium">{option.option_text}</span>
                  {Icon}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={handleNext} disabled={!hasSelected}
              className={cn('px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                isDark ? 'bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]'
                       : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg')}>
              {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question →' : 'Finish Quiz'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </PageTransition>
  );
}
