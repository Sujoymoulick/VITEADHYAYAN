import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Send, Loader2, CheckCircle2 } from 'lucide-react';

interface QuizFeedbackProps {
  quizId: string;
}

export function QuizFeedback({ quizId }: QuizFeedbackProps) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasExistingFeedback, setHasExistingFeedback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingFeedback();
  }, [quizId, profile?.id]);

  const checkExistingFeedback = async () => {
    if (!profile?.id || !quizId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('quiz_feedback')
        .select('id')
        .eq('quiz_id', quizId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (data) {
        setHasExistingFeedback(true);
      }
    } catch (err) {
      console.error('Error checking feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!profile?.id || rating === 0) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('quiz_feedback').insert({
        quiz_id: quizId,
        user_id: profile.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;
  if (hasExistingFeedback || isSubmitted) {
    if (isSubmitted) {
      return (
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className={cn(
             "mt-8 p-6 rounded-2xl border text-center",
             isDark ? "bg-teal-500/10 border-teal-500/20 text-teal-400" : "bg-green-50 border-green-200 text-green-700"
           )}
        >
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8" />
            <p className="font-semibold text-lg">Thank you for your feedback!</p>
            <p className="text-sm opacity-80">Your input helps us improve the learning experience.</p>
          </div>
        </motion.div>
      );
    }
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "mt-8 p-6 rounded-2xl border shadow-lg backdrop-blur-md",
        isDark ? "bg-white/5 border-white/10" : "bg-white/70 border-gray-200"
      )}
    >
      <h3 className={cn("text-lg font-bold mb-4", isDark ? "text-white" : "text-gray-900")}>
        How was your experience?
      </h3>

      <div className="flex flex-col gap-6">
        {/* Star Rating */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110 active:scale-90"
            >
              <Star
                className={cn(
                  "w-8 h-8 transition-colors",
                  (hoveredRating || rating) >= star
                    ? "fill-yellow-400 text-yellow-400"
                    : isDark ? "text-gray-700" : "text-gray-300"
                )}
              />
            </button>
          ))}
          <span className={cn("ml-2 text-sm font-medium", isDark ? "text-gray-400" : "text-gray-500")}>
            {rating > 0 ? `${rating} / 5` : "Selection rating"}
          </span>
        </div>

        {/* Comment Box */}
        <div className="flex flex-col gap-2">
          <label className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-gray-500" : "text-gray-400")}>
            Optional Comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you think of the questions?"
            className={cn(
              "w-full p-4 rounded-xl text-sm outline-none transition-all border min-h-[100px] resize-none",
              isDark 
                ? "bg-black/20 border-white/10 text-white focus:border-teal-500/50" 
                : "bg-white/50 border-gray-200 text-gray-900 focus:border-blue-400"
            )}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className={cn(
            "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
            rating === 0 || isSubmitting
              ? "opacity-50 cursor-not-allowed bg-gray-500 text-white"
              : isDark
                ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          )}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Feedback
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
