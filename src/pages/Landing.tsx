import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Trophy, 
  Users, 
  Rocket, 
  Sparkles, 
  BookOpen, 
  ChevronRight,
  Monitor,
  Layout,
  Crown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { PageTransition } from '../components/PageTransition';

interface FeatureCardProps {
  key?: any;
  icon: any;
  title: string;
  description: string;
  index: number;
  isDark: boolean;
}

const FeatureCard = ({ icon: Icon, title, description, index, isDark }: FeatureCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
    className={cn(
      "p-8 rounded-2xl border backdrop-blur-md transition-all group hover:-translate-y-2",
      isDark 
        ? "bg-white/5 border-white/10 hover:border-teal-500/50 hover:bg-white/10" 
        : "bg-white/50 border-blue-100 hover:border-blue-500/50 hover:bg-white shadow-xl shadow-blue-500/5"
    )}
  >
    <div className={cn(
      "w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
      isDark ? "bg-teal-500/20 text-teal-400" : "bg-blue-600/10 text-blue-600"
    )}>
      <Icon className="w-6 h-6" />
    </div>
    <h3 className={cn("text-xl font-bold mb-3", isDark ? "text-white" : "text-gray-900")}>{title}</h3>
    <p className={cn("text-sm leading-relaxed", isDark ? "text-gray-400" : "text-gray-600")}>{description}</p>
  </motion.div>
);

export function Landing() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 100], [1, 0]);
  const scale = useTransform(scrollY, [0, 100], [1, 1.1]);

  const features = [
    {
      icon: Zap,
      title: "Gamified Quizzes",
      description: "Learn faster with interactive challenges, instant feedback, and XP-based progression."
    },
    {
      icon: Trophy,
      title: "Global Leaderboard",
      description: "Compete against learners from around the world and climb the ranks from Elite to Grand Master."
    },
    {
      icon: Sparkles,
      title: "AI-Powered Insights",
      description: "Get personalized quiz generation and recommendations tailored to your learning style."
    },
    {
      icon: Layout,
      title: "Premium Experience",
      description: "Stunning Dark and Light modes with micro-animations designed for deep focus."
    },
    {
      icon: Users,
      title: "Social Learning",
      description: "Create and share your own quizzes to inspire a global community of modern learners."
    },
    {
      icon: BookOpen,
      title: "Vast Categories",
      description: "Explore a wide range of subjects from Science and Technology to History and Arts."
    }
  ];

  return (
    <PageTransition className="min-h-screen relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32 px-4 overflow-hidden">
        <motion.div 
          style={{ opacity, scale }}
          className="text-center max-w-4xl mx-auto z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8 backdrop-blur-xl",
              isDark ? "bg-white/5 border-white/10 text-teal-400" : "bg-blue-600/5 border-blue-600/10 text-blue-600"
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Next-Gen Learning Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "text-6xl md:text-8xl font-black mb-8 tracking-tighter",
              isDark ? "text-white" : "text-gray-900"
            )}
          >
            Unlock Your <br />
            <span className={cn(
              "inline-block font-extrabold text-transparent bg-clip-text bg-gradient-to-r",
              isDark ? "from-teal-400 via-blue-500 to-teal-400" : "from-blue-600 via-indigo-600 to-blue-600"
            )}>
              Genius Potential
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              "text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed",
              isDark ? "text-gray-400" : "text-gray-600"
            )}
          >
            Adhyayan combines gamification with high-fidelity aesthetics to create the ultimate 
            knowledge-sharing ecosystem for modern minds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/auth')}
              className={cn(
                "px-10 py-5 rounded-2xl font-black flex items-center gap-3 transition-all text-lg shadow-2xl relative group overflow-hidden",
                isDark 
                  ? "bg-teal-500 text-black shadow-teal-500/20" 
                  : "bg-blue-600 text-white shadow-blue-500/30"
              )}
            >
              Get Started <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 rotate-[45deg]" />
            </motion.button>
            <button
               onClick={() => {
                 document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
               }}
              className={cn(
                "px-10 py-5 rounded-2xl font-bold flex items-center gap-2 transition-all border-2 text-lg",
                isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-white border-blue-600/10 text-blue-600 hover:bg-blue-50"
              )}
            >
              View Features
            </button>
          </motion.div>
        </motion.div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className={cn(
            "absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20",
            isDark ? "bg-teal-500" : "bg-blue-300"
          )} />
          <div className={cn(
            "absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20",
            isDark ? "bg-blue-500" : "bg-indigo-300"
          )} />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-24">
            <h2 className={cn(
              "text-4xl md:text-5xl font-black mb-6",
              isDark ? "text-white" : "text-gray-900"
            )}>
              Everything You Need to <br />
              Grow Your Mind
            </h2>
            <div className={cn("h-1.5 w-24 mx-auto rounded-full bg-gradient-to-r", isDark ? "from-teal-500 to-blue-500" : "from-blue-600 to-indigo-600")} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <FeatureCard 
                key={idx} 
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                index={idx} 
                isDark={isDark} 
              />
            ))}
          </div>
        </div>
      </section>

      {/* Stat Bar */}
      <section className={cn("py-20 border-y", isDark ? "bg-white/2 border-white/5 shadow-inner" : "bg-blue-600/5 border-blue-100 shadow-sm")}>
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { label: "Active Learners", value: "10K+", icon: Users },
            { label: "Daily Quizzes", value: "2.5K+", icon: Rocket },
            { label: "Questions", value: "50K+", icon: BookOpen },
            { label: "Top Achievers", value: "500+", icon: Crown },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className={cn("text-3xl md:text-4xl font-black mb-2", isDark ? "text-white" : "text-gray-900")}>{stat.value}</div>
              <div className={cn("text-sm font-medium tracking-wide uppercase opacity-60", isDark ? "text-teal-400" : "text-blue-600")}>{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer-like CTA */}
      <section className="py-32 px-4 text-center relative overflow-hidden">
        <div className={cn(
          "max-w-4xl mx-auto p-12 md:p-20 rounded-[3rem] border backdrop-blur-xl relative z-10",
          isDark ? "bg-teal-500/5 border-white/10" : "bg-blue-600/5 border-blue-200"
        )}>
          <h2 className={cn("text-3xl md:text-5xl font-black mb-8 leading-tight", isDark ? "text-white" : "text-gray-900")}>
            Ready to Start Your <br />
            Knowledge Adventure?
          </h2>
          <button
            onClick={() => navigate('/auth')}
            className={cn(
              "px-10 py-5 rounded-2xl font-black transition-all text-xl shadow-2xl",
              isDark ? "bg-teal-500 hover:bg-teal-400 text-black shadow-teal-500/30" : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/40"
            )}
          >
            Create Your Account Now
          </button>
          
          <div className="mt-8 flex items-center justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all">
             <div className="flex items-center gap-2"><Monitor className="w-5 h-5"/> <span>Web</span></div>
             <div className={cn("w-1 h-1 rounded-full", isDark ? "bg-white" : "bg-black")} />
             <div className="flex items-center gap-2"><Rocket className="w-5 h-5"/> <span>Fast</span></div>
          </div>
        </div>
        
        {/* Extra abstract art */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[100%] rotate-12 pointer-events-none opacity-5 bg-gradient-to-r from-teal-500 via-transparent to-blue-500" />
      </section>
      
      {/* Simple Footer */}
      <footer className={cn("py-12 px-4 border-t text-center text-sm font-medium", isDark ? "border-white/5 text-white/30" : "border-gray-100 text-gray-500")}>
        © {new Date().getFullYear()} Adhyayan. Built for the modern learner.
      </footer>
    </PageTransition>
  );
}
