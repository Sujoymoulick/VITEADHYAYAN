import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Loader2, ArrowRight, User, Palette, Sparkles } from 'lucide-react';

const INTERESTS = ['Science', 'History', 'Technology', 'Pop Culture', 'Geography', 'Mathematics'];

export function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>('dark');
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === 'dark';

  const handleNext = () => {
    if (step === 1 && !username.trim()) {
      setError('Username is required');
      return;
    }
    setError(null);
    setStep(s => s + 1);
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username,
          preferred_theme: selectedTheme,
          onboarding_completed: true,
          // We could store interests in a separate table or a JSONB column, 
          // but for this blueprint, we'll just mark onboarding as complete.
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setTheme(selectedTheme);
      await refreshProfile();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "w-full max-w-lg p-8 rounded-2xl backdrop-blur-xl border shadow-2xl",
          isDark 
            ? "bg-black/40 border-teal-500/30 shadow-teal-500/10" 
            : "bg-white/60 border-blue-200 shadow-blue-500/10"
        )}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
            Welcome to Adhyayan
          </h2>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  step >= i 
                    ? (isDark ? "bg-teal-400 w-4" : "bg-blue-600 w-4") 
                    : (isDark ? "bg-white/20" : "bg-black/10")
                )}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-red-500/10 text-red-500 border border-red-500/20">
            {error}
          </div>
        )}

        <div className="min-h-[250px]">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <User className={isDark ? "text-teal-400" : "text-blue-600"} />
                <h3 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>Choose your identity</h3>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter a unique username"
                className={cn(
                  "w-full px-4 py-3 rounded-xl outline-none transition-all text-lg",
                  isDark 
                    ? "bg-white/5 border border-white/10 text-white focus:border-teal-400" 
                    : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500"
                )}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Palette className={isDark ? "text-teal-400" : "text-blue-600"} />
                <h3 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>Select your aesthetic</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedTheme('dark')}
                  className={cn(
                    "p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3",
                    selectedTheme === 'dark'
                      ? "border-teal-400 bg-teal-400/10"
                      : "border-gray-700 bg-black/50 hover:border-gray-500"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-black to-gray-800 border border-teal-500/50 shadow-[0_0_15px_rgba(0,255,255,0.3)]" />
                  <span className="text-white font-medium">Dark Galaxy</span>
                </button>
                <button
                  onClick={() => setSelectedTheme('light')}
                  className={cn(
                    "p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3",
                    selectedTheme === 'light'
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 shadow-lg shadow-blue-200" />
                  <span className="text-gray-900 font-medium">Light Nebula</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className={isDark ? "text-teal-400" : "text-blue-600"} />
                <h3 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>Select your interests</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {INTERESTS.map(interest => {
                  const isSelected = interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={cn(
                        "px-4 py-2 rounded-full border transition-all",
                        isSelected
                          ? (isDark ? "bg-teal-500/20 border-teal-400 text-teal-300" : "bg-blue-600/10 border-blue-600 text-blue-700")
                          : (isDark ? "bg-white/5 border-white/10 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-600 hover:text-gray-900")
                      )}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          {step < 3 ? (
            <button
              onClick={handleNext}
              className={cn(
                "px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all",
                isDark 
                  ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
              )}
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className={cn(
                "px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all",
                isDark 
                  ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
              )}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
