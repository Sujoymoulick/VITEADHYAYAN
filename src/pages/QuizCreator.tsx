import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Edit3 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ImageUploader } from '../components/ImageUploader';
import { PageTransition } from '../components/PageTransition';

interface Option {
  text: string;
  isCorrect: boolean;
}

interface Question {
  text: string;
  imageUrl: string;
  points: number;
  options: Option[];
}

export function QuizCreator() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams(); // For edit mode
  const isDark = theme === 'dark';
  const isEditMode = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [quizImage, setQuizImage] = useState('');
  const [timeLimit, setTimeLimit] = useState(10); // in minutes
  
  const [questions, setQuestions] = useState<Question[]>([
    { text: '', imageUrl: '', points: 10, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }
  ]);

  const [loading, setLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Keep track of the latest data for the auto-save interval
  const quizDataRef = useRef({ title, description, category, quizImage, timeLimit, questions, hasUnsavedChanges, draftId });

  // Initial data fetch for Edit Mode
  useEffect(() => {
    if (isEditMode && profile) {
      fetchQuizData();
    }
  }, [id, profile]);

  const fetchQuizData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Quiz Details
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (quizError) throw quizError;
      if (quiz.creator_id !== profile?.id) {
        throw new Error('You do not have permission to edit this quiz.');
      }

      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setCategory(quiz.category || 'General');
      setQuizImage(quiz.image_url || '');
      setTimeLimit(Math.floor(quiz.time_limit / 60));

      // 2. Fetch Questions
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select(`
          *,
          options (*)
        `)
        .eq('quiz_id', id)
        .order('created_at', { ascending: true });

      if (qError) throw qError;

      if (qData && qData.length > 0) {
        const formattedQuestions: Question[] = qData.map(q => ({
          text: q.question_text,
          imageUrl: q.image_url || '',
          points: q.points,
          options: q.options.map((o: any) => ({
            text: o.option_text,
            isCorrect: o.is_correct
          }))
        }));
        setQuestions(formattedQuestions);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    quizDataRef.current = { title, description, category, quizImage, timeLimit, questions, hasUnsavedChanges, draftId };
    setHasUnsavedChanges(true);
  }, [title, description, category, quizImage, timeLimit, questions]);

  useEffect(() => {
    // Auto-save every 2 minutes (only for new creators or drafts)
    if (isEditMode) return;

    const interval = setInterval(() => {
      const currentData = quizDataRef.current;
      if (currentData.hasUnsavedChanges && currentData.title.trim()) {
        autoSaveDraft(currentData);
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [profile, isEditMode]);

  const autoSaveDraft = async (data: typeof quizDataRef.current) => {
    if (!profile) return;
    
    try {
      const draftData = {
        creator_id: profile.id,
        title: data.title,
        description: data.description,
        category: data.category,
        image_url: data.quizImage,
        time_limit: data.timeLimit * 60,
        questions: data.questions
      };

      if (data.draftId) {
        await supabase.from('quiz_drafts').update(draftData).eq('id', data.draftId);
      } else {
        const { data: newDraft, error } = await supabase.from('quiz_drafts').insert([draftData]).select().single();
        if (error) throw error;
        if (newDraft) {
          setDraftId(newDraft.id);
          quizDataRef.current.draftId = newDraft.id;
        }
      }
      
      setHasUnsavedChanges(false);
      quizDataRef.current.hasUnsavedChanges = false;
      
      setSuccessMsg('Draft auto-saved');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: '', imageUrl: '', points: 10, options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options.length < 4) {
      newQuestions[qIndex].options.push({ text: '', isCorrect: false });
      setQuestions(newQuestions);
    }
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex].text = text;
    setQuestions(newQuestions);
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.forEach((opt, i) => {
      opt.isCorrect = i === oIndex;
    });
    setQuestions(newQuestions);
  };

  const handleSaveDraft = async () => {
    if (!profile) return;
    if (!title.trim()) {
      setError('Quiz title is required to save a draft');
      setSuccessMsg(null);
      return;
    }

    setIsSavingDraft(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const draftData = {
        creator_id: profile.id,
        title,
        description,
        category,
        image_url: quizImage,
        time_limit: timeLimit * 60,
        questions: questions
      };

      if (draftId) {
        const { error } = await supabase.from('quiz_drafts').update(draftData).eq('id', draftId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('quiz_drafts').insert([draftData]).select().single();
        if (error) throw error;
        if (data) {
          setDraftId(data.id);
          quizDataRef.current.draftId = data.id;
        }
      }
      
      setHasUnsavedChanges(false);
      quizDataRef.current.hasUnsavedChanges = false;
      
      setSuccessMsg('Draft saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!title.trim()) {
      setError('Quiz title is required');
      setSuccessMsg(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Update/Insert Quiz
      let activeQuizId = id;

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('quizzes')
          .update({
            title,
            description,
            category,
            image_url: quizImage,
            time_limit: timeLimit * 60
          })
          .eq('id', id);
        
        if (updateError) throw updateError;

        // DELETE existing questions and options for a clean state
        // Questions have cascade delete for options
        const { error: deleteError } = await supabase
          .from('questions')
          .delete()
          .eq('quiz_id', id);
        
        if (deleteError) throw deleteError;
      } else {
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .insert({
            creator_id: profile.id,
            title,
            description,
            category,
            image_url: quizImage,
            time_limit: timeLimit * 60 // convert to seconds
          })
          .select()
          .single();

        if (quizError) throw quizError;
        activeQuizId = quizData.id;
      }

      // 2. Insert Questions & Options
      for (const q of questions) {
        if (!q.text.trim()) continue;

        const { data: qData, error: qError } = await supabase
          .from('questions')
          .insert({
            quiz_id: activeQuizId,
            question_text: q.text,
            image_url: q.imageUrl,
            points: q.points
          })
          .select()
          .single();

        if (qError) throw qError;

        const optionsToInsert = q.options.filter(o => o.text.trim()).map(o => ({
          question_id: qData.id,
          option_text: o.text,
          is_correct: o.isCorrect
        }));

        if (optionsToInsert.length > 0) {
          const { error: oError } = await supabase.from('options').insert(optionsToInsert);
          if (oError) throw oError;
        }
      }

      // 3. Cleanup draft if it exists
      if (draftId || (isEditMode && draftId)) {
        await supabase.from('quiz_drafts').delete().eq('id', draftId);
      }

      setHasUnsavedChanges(false);
      quizDataRef.current.hasUnsavedChanges = false;

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-white/10 text-gray-300" : "hover:bg-black/5 text-gray-600")}>
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className={cn("text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-gray-900")}>
            {isEditMode ? 'Edit Quiz' : 'Create Quiz'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {!isEditMode && (
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft || loading}
              className={cn(
                "px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all border",
                isDark 
                  ? "bg-black/40 border-white/20 text-white hover:bg-white/10" 
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              {isSavingDraft ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Draft
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading || isSavingDraft}
            className={cn(
              "px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all",
              isDark 
                ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditMode ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
            {isEditMode ? 'Update Quiz' : 'Publish Quiz'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
          {error}
        </div>
      )}
      
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">
          {successMsg}
        </div>
      )}

      <div className="space-y-8">
        {/* Quiz Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={cn("p-8 rounded-2xl backdrop-blur-xl border shadow-xl", isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100")}
        >
          <h2 className={cn("text-xl font-semibold mb-6", isDark ? "text-white" : "text-gray-900")}>Quiz Details</h2>
          
          <div className="space-y-6">
            <div>
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Cover Image</label>
              <ImageUploader onUploadSuccess={setQuizImage} className="h-48" initialImage={quizImage} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Advanced React Patterns"
                  className={cn(
                    "w-full px-4 py-3 rounded-xl outline-none transition-all",
                    isDark ? "bg-white/5 border border-white/10 text-white focus:border-teal-400" : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500"
                  )}
                />
              </div>
              <div className="md:col-span-1">
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl outline-none transition-all appearance-none",
                    isDark ? "bg-white/5 border border-white/10 text-white focus:border-teal-400" : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500"
                  )}
                >
                  <option value="General" className={isDark ? "bg-gray-900" : ""}>General</option>
                  <option value="Science" className={isDark ? "bg-gray-900" : ""}>Science</option>
                  <option value="Technology" className={isDark ? "bg-gray-900" : ""}>Technology</option>
                  <option value="History" className={isDark ? "bg-gray-900" : ""}>History</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Time Limit (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 1)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl outline-none transition-all",
                    isDark ? "bg-white/5 border border-white/10 text-white focus:border-teal-400" : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500"
                  )}
                />
              </div>
            </div>

            <div>
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={cn(
                  "w-full px-4 py-3 rounded-xl outline-none transition-all resize-none",
                  isDark ? "bg-white/5 border border-white/10 text-white focus:border-teal-400" : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500"
                )}
              />
            </div>
          </div>
        </motion.div>

        {/* Questions */}
        {questions.map((q, qIndex) => (
          <motion.div 
            key={qIndex}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={cn("p-8 rounded-2xl backdrop-blur-xl border shadow-xl relative", isDark ? "bg-black/40 border-white/10" : "bg-white/60 border-blue-100")}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>Question {qIndex + 1}</h3>
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                  placeholder="Enter your question here..."
                  className={cn(
                    "w-full px-4 py-3 rounded-xl outline-none transition-all text-lg font-medium",
                    isDark ? "bg-white/5 border border-white/10 text-white focus:border-teal-400" : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500"
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-400" : "text-gray-600")}>Optional Image</label>
                  <ImageUploader onUploadSuccess={(url) => updateQuestion(qIndex, 'imageUrl', url)} className="h-32" initialImage={q.imageUrl} />
                </div>
                
                <div className="md:col-span-2 space-y-3">
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-400" : "text-gray-600")}>Options (Select the correct one)</label>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-3">
                      <button
                        onClick={() => setCorrectOption(qIndex, oIndex)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors",
                          opt.isCorrect 
                            ? (isDark ? "border-teal-400 bg-teal-400" : "border-blue-600 bg-blue-600") 
                            : (isDark ? "border-gray-600" : "border-gray-300")
                        )}
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        className={cn(
                          "w-full px-4 py-2 rounded-lg outline-none transition-all",
                          isDark ? "bg-white/5 border border-white/10 text-white focus:border-teal-400" : "bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500"
                        )}
                      />
                    </div>
                  ))}
                  {q.options.length < 4 && (
                    <button
                      onClick={() => addOption(qIndex)}
                      className={cn("text-sm font-medium mt-2", isDark ? "text-teal-400 hover:text-teal-300" : "text-blue-600 hover:text-blue-700")}
                    >
                      + Add Option
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        <button
          onClick={addQuestion}
          className={cn(
            "w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-all font-medium",
            isDark 
              ? "border-white/20 text-gray-400 hover:border-teal-500 hover:text-teal-400 hover:bg-teal-500/5" 
              : "border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
          )}
        >
          <Plus className="w-5 h-5" /> Add Another Question
        </button>
      </div>
    </PageTransition>
  );
}
