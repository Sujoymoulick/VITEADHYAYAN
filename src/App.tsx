import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { GalaxyBackground } from './components/GalaxyBackground';
import { Navbar } from './components/Navbar';
import { PageLoader } from './components/PageLoader';
import { useTheme } from './contexts/ThemeContext';

// Lazy load pages
const Auth = lazy(() => import('./pages/Auth').then(m => ({ default: m.Auth })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Explore = lazy(() => import('./pages/Explore').then(m => ({ default: m.Explore })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const QuizCreator = lazy(() => import('./pages/QuizCreator').then(m => ({ default: m.QuizCreator })));
const QuizTaking = lazy(() => import('./pages/QuizTaking').then(m => ({ default: m.QuizTaking })));
const QuizHistory = lazy(() => import('./pages/QuizHistory').then(m => ({ default: m.QuizHistory })));
const Leaderboard = lazy(() => import('./pages/Leaderboard').then(m => ({ default: m.Leaderboard })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })));
const QuizBattle = lazy(() => import('./pages/QuizBattle').then(m => ({ default: m.QuizBattle })));
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const QuizDetails = lazy(() => import('./pages/QuizDetails').then(m => ({ default: m.QuizDetails })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile && !profile.onboarding_completed && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <>
      <GalaxyBackground theme={theme} />
      {user && profile?.onboarding_completed && <Navbar />}
      <AnimatePresence mode="wait">
        <motion.div 
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={user && profile?.onboarding_completed ? "pb-[72px] md:pb-0" : ""}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes location={location}>
              <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
              <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
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
              <Route path="/edit-quiz/:id" element={<ProtectedRoute><QuizCreator /></ProtectedRoute>} />
              <Route path="/quiz/:id" element={<ProtectedRoute><QuizDetails /></ProtectedRoute>} />
              <Route path="/quiz-taking/:id" element={<ProtectedRoute><QuizTaking /></ProtectedRoute>} />
              <Route path="/battle" element={<ProtectedRoute><QuizBattle /></ProtectedRoute>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
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
