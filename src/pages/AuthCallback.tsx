import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Small delay to ensure Supabase has processed the PKCE code from the URL
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error.message);
        navigate('/', { replace: true });
        return;
      }

      if (session) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
        <p className="text-gray-400 animate-pulse">Finalizing authentication...</p>
      </div>
    </div>
  );
}
