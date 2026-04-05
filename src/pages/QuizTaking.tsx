import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';

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
  
  // Use a ref to access the latest state in the interval callback
  const isFinishedRef = useRef(isFinished);
  isFinishedRef.current = isFinished;

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('quizzes')
        .select('*, questions(*, options(*))')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching quiz:', error);
      } else {
        setQuiz(data);
        if (data.time_limit) {
          setTimeLeft(data.time_limit);
        }
      }
      setLoading(false);
    };

    fetchQuiz();
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || isFinishedRef.current) return;

    if (timeLeft <= 0) {
      finishQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (selectedOptions[questionId]) return; // Prevent changing answer
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
    
    // Scoring Logic
    let calculatedScore = 0;
    
    quiz.questions.forEach((q: any) => {
      const selectedOptionId = selectedOptions[q.id];
      const selectedOption = q.options.find((o: any) => o.id === selectedOptionId);
      
      if (selectedOption?.is_correct) {
        calculatedScore += q.points || 10;
      }
    });

    setScore(calculatedScore);
    setIsFinished(true);

    // Upsert score to database
    try {
      await supabase.from('quiz_attempts').insert({
        user_id: profile.id,
        quiz_id: quiz.id,
        score: calculatedScore
      });

      await supabase.from('profiles').update({
        total_score: (profile.total_score || 0) + calculatedScore
      }).eq('id', profile.id);

      await refreshProfile();
    } catch (err) {
      console.error('Error saving score:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>;
  }

  if (!quiz) {
    return <div className="min-h-screen flex items-center justify-center text-white">Quiz not found</div>;
  }

  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className={cn("w-full max-w-md p-8 rounded-2xl backdrop-blur-xl border text-center shadow-2xl", isDark ? "bg-black/40 border-teal-500/30" : "bg-white/60 border-blue-200")}
        >
          <h2 className={cn("text-3xl font-bold mb-4", isDark ? "text-white" : "text-gray-900")}>Quiz Completed!</h2>
          <div className={cn("text-6xl font-bold mb-6", isDark ? "text-teal-400" : "text-blue-600")}>
            {score} <span className="text-2xl text-gray-500">XP</span>
          </div>
          <p className={cn("mb-8", isDark ? "text-gray-300" : "text-gray-600")}>
            Great job! You've earned {score} points for completing "{quiz.title}".
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className={cn(
              "w-full py-3 rounded-xl font-semibold transition-all",
              isDark ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]" : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            )}
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const hasSelected = !!selectedOptions[currentQuestion.id];

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-3xl mx-auto flex flex-col justify-center">
      <div className="mb-8 flex justify-between items-center">
        <h1 className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>{quiz.title}</h1>
        <div className="flex items-center gap-6">
          {timeLeft !== null && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
              timeLeft < 60 
                ? "bg-red-500/20 text-red-500 animate-pulse" 
                : (isDark ? "bg-white/10 text-teal-400" : "bg-blue-50 text-blue-600")
            )}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          )}
          <span className={cn("font-medium", isDark ? "text-teal-400" : "text-blue-600")}>
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </span>
        </div>
      </div>

      <motion.div 
        key={currentQuestionIndex}
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className={cn("p-8 rounded-2xl backdrop-blur-xl border shadow-xl", isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100")}
      >
        {currentQuestion.image_url && (
          <img src={currentQuestion.image_url} alt="Question" className="w-full h-48 object-cover rounded-xl mb-6" />
        )}
        
        <h2 className={cn("text-2xl font-semibold mb-8", isDark ? "text-white" : "text-gray-900")}>
          {currentQuestion.question_text}
        </h2>

        <div className="space-y-4">
          {currentQuestion.options.map((option: any) => {
            const isSelected = selectedOptions[currentQuestion.id] === option.id;
            const isCorrect = option.is_correct;
            
            let optionClasses = "";
            let Icon = null;

            if (hasSelected) {
              if (isSelected && isCorrect) {
                optionClasses = isDark ? "border-green-500 bg-green-500/10 text-white" : "border-green-600 bg-green-50 text-gray-900";
                Icon = <CheckCircle className={cn("w-5 h-5", isDark ? "text-green-400" : "text-green-600")} />;
              } else if (isSelected && !isCorrect) {
                optionClasses = isDark ? "border-red-500 bg-red-500/10 text-white" : "border-red-600 bg-red-50 text-gray-900";
                Icon = <XCircle className={cn("w-5 h-5", isDark ? "text-red-400" : "text-red-600")} />;
              } else if (!isSelected && isCorrect) {
                optionClasses = isDark ? "border-green-500 bg-transparent text-white" : "border-green-600 bg-transparent text-gray-900";
                Icon = <CheckCircle className={cn("w-5 h-5", isDark ? "text-green-400" : "text-green-600")} />;
              } else {
                optionClasses = isDark ? "border-gray-800 opacity-40 text-gray-500" : "border-gray-200 opacity-40 text-gray-400";
              }
            } else {
              optionClasses = isDark ? "border-gray-700 hover:border-gray-500 text-gray-300" : "border-gray-200 hover:border-gray-300 text-gray-700";
            }

            return (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(currentQuestion.id, option.id)}
                disabled={hasSelected}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center",
                  optionClasses
                )}
              >
                <span>{option.option_text}</span>
                {Icon}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleNext}
            disabled={!hasSelected}
            className={cn(
              "px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
              isDark 
                ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            )}
          >
            {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
