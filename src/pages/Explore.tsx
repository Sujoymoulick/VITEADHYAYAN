import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Target, Play, Plus, Search, Compass, Star, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/PageTransition';

export function Explore() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchQuizzes = async () => {
      let query = supabase
        .from('quizzes_with_stats')
        .select('*')
        .eq('is_public', true) // Only show public quizzes in Explore
        .order('created_at', { ascending: false });
      
      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }
      
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery}%`);
      }
      
      const { data } = await query;
      if (data) setQuizzes(data);
    };
    
    fetchQuizzes();
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('quizzes')
        .select('category')
        .eq('is_public', true); // Only pull categories from public quizzes
      
      if (data) {
        const uniqueCategories = Array.from(new Set(data.map(q => q.category).filter(Boolean))) as string[];
        setCategories(['All', ...uniqueCategories]);
      }
    };
    fetchCategories();
  }, []);

  return (
    <PageTransition className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className={cn("text-3xl font-bold tracking-tight flex items-center gap-3", isDark ? "text-white" : "text-gray-900")}>
            <Compass className={cn("w-8 h-8", isDark ? "text-teal-400" : "text-blue-600")} />
            Explore Quizzes
          </h1>
          <p className={cn("mt-2", isDark ? "text-gray-400" : "text-gray-600")}>
            Discover new topics and challenge yourself
          </p>
        </div>
        
        <Link to="/create-quiz" className={cn(
          "px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all whitespace-nowrap shadow-sm",
          isDark 
            ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.2)]" 
            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30"
        )}>
          <Plus className="w-5 h-5" /> Create Quiz
        </Link>
      </div>

      <div className={cn("p-4 rounded-2xl backdrop-blur-xl border mb-8 flex flex-col md:flex-row gap-4", isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100 shadow-sm")}>
        <div className="relative flex-grow">
          <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", isDark ? "text-gray-400" : "text-gray-500")} />
          <input 
            type="text"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-12 pr-4 py-3 rounded-xl outline-none transition-all border font-medium",
              isDark 
                ? "bg-white/5 border-white/10 text-white focus:border-teal-400" 
                : "bg-white border-gray-200 text-gray-900 focus:border-blue-500"
            )}
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={cn(
            "px-4 py-3 rounded-xl outline-none transition-all border font-medium min-w-[200px] appearance-none",
            isDark 
              ? "bg-white/5 border-white/10 text-white focus:border-teal-400" 
              : "bg-white border-gray-200 text-gray-900 focus:border-blue-500"
          )}
        >
          {categories.map(cat => (
            <option key={cat} value={cat} className={isDark ? "bg-gray-900" : ""}>
              {cat === 'All' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {quizzes.length > 0 ? quizzes.map((quiz, i) => (
          <Link to={`/quiz/${quiz.id}`} key={quiz.id}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * i }}
              className={cn("rounded-2xl overflow-hidden backdrop-blur-xl border group cursor-pointer h-full flex flex-col", isDark ? "bg-black/40 border-white/10 hover:border-teal-500/50" : "bg-white/60 border-blue-100 hover:border-blue-400 shadow-sm")}
            >
              <div className="h-40 bg-gray-800 relative overflow-hidden flex-shrink-0">
                {quiz.image_url ? (
                  <img 
                    src={quiz.image_url} 
                    alt={quiz.title} 
                    referrerPolicy="no-referrer" 
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <Target className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className={cn("p-3 rounded-full", isDark ? "bg-teal-500 text-black" : "bg-blue-600 text-white")}>
                    <Play className="w-6 h-6 ml-1" />
                  </div>
                </div>

                {/* Rating Badge */}
                {quiz.total_ratings > 0 && (
                  <div className={cn(
                    "absolute top-3 right-3 px-2 py-1 rounded-lg backdrop-blur-md border text-[10px] font-black flex items-center gap-1",
                    isDark ? "bg-black/60 border-white/20 text-yellow-400 shadow-xl" : "bg-white/80 border-gray-200 text-yellow-600 shadow-sm"
                  )}>
                    <Star className="w-3 h-3 fill-current" />
                    {Number(quiz.avg_rating).toFixed(1)}
                    <span className="opacity-60 font-medium">({quiz.total_ratings})</span>
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <span className={cn("text-xs font-semibold px-2 py-1 rounded-md mb-3 inline-block w-max", isDark ? "bg-teal-500/20 text-teal-400" : "bg-blue-100 text-blue-700")}>
                  {quiz.category || 'General'}
                </span>
                <h3 className={cn("text-lg font-bold mb-1", isDark ? "text-white" : "text-gray-900")}>{quiz.title}</h3>
                <div className={cn("flex items-center gap-1.5 mb-3 text-xs font-medium", isDark ? "text-gray-500" : "text-gray-500")}>
                  <User className="w-3 h-3" />
                  <span>by @{quiz.creator_name || 'anonymous'}</span>
                </div>
                <p className={cn("text-sm line-clamp-2 mt-auto", isDark ? "text-gray-400" : "text-gray-600")}>{quiz.description}</p>
              </div>
            </motion.div>
          </Link>
        )) : (
          <div className={cn("col-span-full p-12 text-center rounded-2xl border border-dashed", isDark ? "border-white/20 text-gray-400" : "border-gray-300 text-gray-500")}>
            <p>No quizzes found matching your criteria.</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
