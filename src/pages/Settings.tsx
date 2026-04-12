import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Moon, Sun, Save, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ImageUploader } from '../components/ImageUploader';
import { PageTransition } from '../components/PageTransition';

export function Settings() {
  const { profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const [username, setUsername] = useState(profile?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          avatar_url: avatarUrl,
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="min-h-screen p-6 md:p-12 max-w-3xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/dashboard" className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-white/10 text-gray-300" : "hover:bg-black/5 text-gray-600")}>
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className={cn("text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-gray-900")}>
          Settings
        </h1>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className={cn("p-8 rounded-2xl backdrop-blur-xl border shadow-xl mb-8", isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100")}
      >
        <h2 className={cn("text-xl font-semibold mb-6", isDark ? "text-white" : "text-gray-900")}>Appearance</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              "p-4 rounded-xl border-2 transition-all flex items-center gap-3",
              isDark
                ? "border-teal-400 bg-teal-400/10"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <Moon className={cn("w-6 h-6", isDark ? "text-teal-400" : "text-gray-500")} />
            <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>Dark Galaxy</span>
          </button>
          <button
            onClick={() => setTheme('light')}
            className={cn(
              "p-4 rounded-xl border-2 transition-all flex items-center gap-3",
              !isDark
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-700 bg-black/50 hover:border-gray-500"
            )}
          >
            <Sun className={cn("w-6 h-6", !isDark ? "text-blue-600" : "text-gray-400")} />
            <span className={cn("font-medium", !isDark ? "text-gray-900" : "text-white")}>Light Nebula</span>
          </button>
        </div>

        <h2 className={cn("text-xl font-semibold mb-6", isDark ? "text-white" : "text-gray-900")}>Profile</h2>
        
        <div className="space-y-6">
          <div>
            <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>
              Profile Picture
            </label>
            <ImageUploader 
              onUploadSuccess={setAvatarUrl} 
              onUploadStateChange={setIsUploadingAvatar}
              initialImage={avatarUrl}
              className="h-48 max-w-xs"
            />
          </div>

          <div>
            <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl outline-none transition-all",
                isDark 
                  ? "bg-white/5 border border-white/10 text-white focus:border-teal-400" 
                  : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500"
              )}
            />
          </div>

          {message && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              message.type === 'success' 
                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                : "bg-red-500/10 text-red-500 border border-red-500/20"
            )}>
              {message.text}
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={loading || isUploadingAvatar}
              className={cn(
                "px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all",
                isDark 
                  ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30",
                (loading || isUploadingAvatar) && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isUploadingAvatar ? 'Uploading...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}
