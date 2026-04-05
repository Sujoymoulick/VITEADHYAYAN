import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Loader2, Chrome } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { PageTransition } from '../components/PageTransition';

const GoogleLogo = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

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
        if (error) {
          if (error.message === 'Invalid login credentials') {
            throw new Error('Invalid email or password. If you signed up with Google, please use the "Continue with Google" option.');
          }
          throw error;
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google login.');
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <PageTransition className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full max-w-md p-8 rounded-2xl backdrop-blur-xl border shadow-2xl relative overflow-hidden",
          isDark 
            ? "bg-black/40 border-teal-500/30 shadow-teal-500/10" 
            : "bg-white/60 border-blue-200 shadow-blue-500/10"
        )}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-blue-600 opacity-50" />
        
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
                isDark ? "text-white/40" : "text-gray-500"
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
                    : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500 focus:bg-white shadow-sm"
                )}
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5",
                isDark ? "text-white/40" : "text-gray-500"
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
                    : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500 focus:bg-white shadow-sm"
                )}
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "p-3 rounded-lg text-sm font-medium border overflow-hidden",
                  error.includes('Check your email') 
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20 shadow-lg shadow-red-500/5 transition-all"
                )}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-3 rounded-xl font-bold flex items-center justify-center transition-all active:scale-95 group overflow-hidden relative",
              isDark 
                ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)]" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-8 mb-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className={cn("w-full border-t border-dashed", isDark ? "border-white/10" : "border-gray-200")}></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-center">
            <span className={cn("px-3 py-1 rounded-full border", isDark ? "bg-[#121212] text-white/40 border-white/5" : "bg-white text-gray-400 border-gray-100")}>
              Alternative Authorization
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          disabled={loading}
          className={cn(
            "w-full py-3 rounded-xl font-bold flex items-center justify-center transition-all bg-white text-gray-900 border-2 hover:border-blue-500 hover:bg-gray-50 shadow-sm",
            isDark ? "border-white/10 shadow-white/5" : "border-gray-100 shadow-black/5"
          )}
        >
          <GoogleLogo />
          Continue with Google
        </motion.button>

        <div className="mt-8 text-center pt-4 border-t border-white/5">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className={cn(
              "text-sm font-medium hover:underline transition-colors uppercase tracking-wide",
              isDark ? "text-white/40 hover:text-teal-400" : "text-gray-500 hover:text-blue-600"
            )}
          >
            {isLogin ? "New to Adhyayan? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </PageTransition>
  );
}

