import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Show success message for signup if email confirmation is required
        setError('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full max-w-md p-8 rounded-2xl backdrop-blur-xl border shadow-2xl",
          isDark 
            ? "bg-black/40 border-teal-500/30 shadow-teal-500/10" 
            : "bg-white/60 border-blue-200 shadow-blue-500/10"
        )}
      >
        <div className="text-center mb-8">
          <h1 className={cn(
            "text-4xl font-bold mb-2 tracking-tight",
            isDark ? "text-white" : "text-gray-900"
          )}>
            Adhyayan
          </h1>
          <p className={cn(
            "text-sm",
            isDark ? "text-teal-400/80" : "text-blue-600/80"
          )}>
            Next-Gen Gamified Learning
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5",
                isDark ? "text-gray-400" : "text-gray-500"
              )} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all",
                  isDark 
                    ? "bg-white/5 border border-white/10 text-white focus:border-teal-400 focus:bg-white/10" 
                    : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500 focus:bg-white"
                )}
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5",
                isDark ? "text-gray-400" : "text-gray-500"
              )} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all",
                  isDark 
                    ? "bg-white/5 border border-white/10 text-white focus:border-teal-400 focus:bg-white/10" 
                    : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500 focus:bg-white"
                )}
              />
            </div>
          </div>

          {error && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              error.includes('Check your email') 
                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                : "bg-red-500/10 text-red-500 border border-red-500/20"
            )}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-3 rounded-xl font-semibold flex items-center justify-center transition-all",
              isDark 
                ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className={cn(
              "text-sm hover:underline transition-colors",
              isDark ? "text-gray-400 hover:text-teal-400" : "text-gray-600 hover:text-blue-600"
            )}
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
