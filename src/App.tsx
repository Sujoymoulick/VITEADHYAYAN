import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { GalaxyBackground } from './components/GalaxyBackground';
import { Navbar } from './components/Navbar';
import { Auth } from './pages/Auth';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Explore } from './pages/Explore';
import { Settings } from './pages/Settings';
import { QuizCreator } from './pages/QuizCreator';
import { QuizTaking } from './pages/QuizTaking';
import { QuizHistory } from './pages/QuizHistory';
import { Leaderboard } from './pages/Leaderboard';
import { Loader2 } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (profile && !profile.onboarding_completed && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <>
      <GalaxyBackground theme={theme} />
      {user && profile?.onboarding_completed && <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            {profile?.onboarding_completed ? <Navigate to="/dashboard" replace /> : <Onboarding />}
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><QuizHistory /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/create-quiz" element={<ProtectedRoute><QuizCreator /></ProtectedRoute>} />
        <Route path="/quiz/:id" element={<ProtectedRoute><QuizTaking /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
