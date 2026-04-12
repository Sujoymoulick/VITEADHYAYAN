import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Edit3, Globe, Lock, CheckCircle2, X, Send } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ImageUploader } from '../components/ImageUploader';
import { PageTransition } from '../components/PageTransition';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Option {
  id?: string;        // undefined for newly added options
  text: string;
  isCorrect: boolean;
}

interface Question {
  id?: string;        // undefined for newly added questions
  text: string;
  explanation: string; // NEW
  imageUrl: string;
  points: number;
  options: Option[];
}

const newOption = (correct = false): Option => ({ text: '', isCorrect: correct });
const newQuestion = (): Question => ({
  text: '', explanation: '', imageUrl: '', points: 10,
  options: [newOption(true), newOption(false)],
});

// ─── Component ────────────────────────────────────────────────────────────────
export function QuizCreator() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const isDark = theme === 'dark';
  const isEditMode = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [customTopic, setCustomTopic] = useState('');   // NEW: override category
  const [quizImage, setQuizImage] = useState('');
  const [timeLimit, setTimeLimit] = useState(10);
  const [isPublic, setIsPublic] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([newQuestion()]);

  const [loading, setLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const quizDataRef = useRef({ title, description, category, quizImage, timeLimit, isPublic, questions, hasUnsavedChanges, draftId });

  // ─── Edit mode: fetch existing data ──────────────────────────────────────
  useEffect(() => {
    if (isEditMode && profile) fetchQuizData();
  }, [id, profile]);

  const fetchQuizData = async () => {
    setLoading(true);
    try {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes').select('*').eq('id', id).maybeSingle();

      if (quizError) throw quizError;
      if (!quiz) throw new Error('Quiz not found.');
      if (quiz.creator_id !== profile?.id) throw new Error('No permission to edit this quiz.');

      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setCategory(quiz.category || 'General');
      setCustomTopic(quiz.custom_topic || '');
      setQuizImage(quiz.image_url || '');
      setTimeLimit(Math.floor((quiz.time_limit || 600) / 60));
      setIsPublic(quiz.is_public !== false);

      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select('*, options(*)')
        .eq('quiz_id', id)
        .order('created_at', { ascending: true });

      if (qError) throw qError;

      if (qData && qData.length > 0) {
        setQuestions(qData.map(q => ({
          id: q.id,
          text: q.question_text,
          explanation: q.explanation || '',
          imageUrl: q.image_url || '',
          points: q.points || 10,
          options: (q.options || []).map((o: any) => ({
            id: o.id,
            text: o.option_text,
            isCorrect: o.is_correct,
          })),
        })));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    quizDataRef.current = { title, description, category, quizImage, timeLimit, isPublic, questions, hasUnsavedChanges, draftId };
    setHasUnsavedChanges(true);
  }, [title, description, category, quizImage, timeLimit, isPublic, questions]);

  // ─── Auto-save drafts (create mode only) ─────────────────────────────────
  useEffect(() => {
    if (isEditMode) return;
    const interval = setInterval(() => {
      const d = quizDataRef.current;
      if (d.hasUnsavedChanges && d.title.trim()) autoSaveDraft(d);
    }, 120000);
    return () => clearInterval(interval);
  }, [profile, isEditMode]);

  const autoSaveDraft = async (data: typeof quizDataRef.current) => {
    if (!profile) return;
    try {
      const payload = { creator_id: profile.id, title: data.title, description: data.description, category: data.category, image_url: data.quizImage, time_limit: data.timeLimit * 60, is_public: data.isPublic, questions: data.questions };
      if (data.draftId) {
        await supabase.from('quiz_drafts').update(payload).eq('id', data.draftId);
      } else {
        const { data: d2, error } = await supabase.from('quiz_drafts').insert([payload]).select().single();
        if (error) throw error;
        if (d2) { setDraftId(d2.id); quizDataRef.current.draftId = d2.id; }
      }
      setHasUnsavedChanges(false);
      quizDataRef.current.hasUnsavedChanges = false;
      setSuccessMsg('Draft auto-saved'); setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) { console.error('Auto-save failed:', err); }
  };

  // ─── Question / Option helpers ────────────────────────────────────────────
  const addQuestion = () => setQuestions(prev => [...prev, newQuestion()]);

  const removeQuestion = (index: number) => {
    if (questions.length > 1) setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const addOption = (qIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex || q.options.length >= 5) return q;
      return { ...q, options: [...q.options, newOption(false)] };
    }));
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const updated = q.options.filter((_, oi) => oi !== oIndex);
      // Ensure at least one correct answer remains
      if (!updated.some(o => o.isCorrect) && updated.length > 0) updated[0].isCorrect = true;
      return { ...q, options: updated };
    }));
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return { ...q, options: q.options.map((o, oi) => oi === oIndex ? { ...o, text } : o) };
    }));
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return { ...q, options: q.options.map((o, oi) => ({ ...o, isCorrect: oi === oIndex })) };
    }));
  };

  // ─── Manual draft save ────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!profile || !title.trim()) { setError('Quiz title is required to save a draft'); return; }
    setIsSavingDraft(true); setError(null); setSuccessMsg(null);
    try {
      const payload = { creator_id: profile.id, title, description, category, image_url: quizImage, time_limit: timeLimit * 60, is_public: isPublic, questions };
      if (draftId) {
        await supabase.from('quiz_drafts').update(payload).eq('id', draftId);
      } else {
        const { data, error } = await supabase.from('quiz_drafts').insert([payload]).select().single();
        if (error) throw error;
        if (data) { setDraftId(data.id); quizDataRef.current.draftId = data.id; }
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

  // ─── Main save (publish / update) ────────────────────────────────────────
  const handleSave = async () => {
    if (!profile) return;

    // Validation
    if (!title.trim()) { setError('Quiz title is required'); return; }
    const validQuestions = questions.filter(q => q.text.trim());
    if (validQuestions.length === 0) { setError('Add at least one question'); return; }
    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i];
      const filled = q.options.filter(o => o.text.trim());
      if (filled.length < 2) { setError(`Question ${i + 1} needs at least 2 options`); return; }
      if (!filled.some(o => o.isCorrect)) { setError(`Question ${i + 1} needs a correct answer`); return; }
    }

    setLoading(true); setError(null); setSuccessMsg(null);

    try {
      let activeQuizId = id;

      // ── Step 1: Create or update quiz metadata ─────────────────────────────
      if (isEditMode) {
        const { error: ue } = await supabase.from('quizzes')
          .update({ title, description, category, custom_topic: customTopic.trim() || null, image_url: quizImage, time_limit: timeLimit * 60, is_public: isPublic })
          .eq('id', id);
        if (ue) throw ue;
      } else {
        const { data: qd, error: qe } = await supabase.from('quizzes')
          .insert({ creator_id: profile.id, title, description, category, custom_topic: customTopic.trim() || null, image_url: quizImage, time_limit: timeLimit * 60, is_public: isPublic })
          .select().single();
        if (qe) throw qe;
        activeQuizId = qd.id;
      }

      // ── Step 2: Atomic replace via DB function (SECURITY DEFINER bypasses RLS) ────
      // Passes explanation field too
      const payload = validQuestions.map(q => ({
        text: q.text.trim(),
        explanation: q.explanation?.trim() || '',
        imageUrl: q.imageUrl || '',
        points: q.points || 10,
        options: q.options
          .filter(o => o.text.trim())
          .map(o => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
      }));

      const { error: rpcError } = await supabase.rpc('replace_quiz_questions', {
        p_quiz_id: activeQuizId,
        p_questions: payload,
      });
      if (rpcError) throw new Error(`Failed to save questions: ${rpcError.message}`);

      // ── Step 3: Cleanup draft ──────────────────────────────────────────────
      if (draftId) await supabase.from('quiz_drafts').delete().eq('id', draftId);

      setHasUnsavedChanges(false);
      quizDataRef.current.hasUnsavedChanges = false;
      setSuccessMsg(isEditMode ? 'Quiz updated! ✅ Redirecting...' : 'Quiz published! ✅ Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err: any) {
      console.error('[QuizCreator] Save error:', err);
      setError(err.message || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const inputCls = cn(
    'w-full px-4 py-3 rounded-xl outline-none transition-all',
    isDark ? 'bg-white/5 border border-white/10 text-white focus:border-teal-400 placeholder-gray-600'
           : 'bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500 placeholder-gray-400'
  );

  return (
    <PageTransition className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className={cn('p-2 rounded-full transition-colors', isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/5 text-gray-600')}>
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className={cn('text-3xl font-bold tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
            {isEditMode ? 'Edit Quiz' : 'Create Quiz'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {!isEditMode && (
            <button onClick={handleSaveDraft} disabled={isSavingDraft || loading}
              className={cn('px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all border',
                isDark ? 'bg-black/40 border-white/20 text-white hover:bg-white/10' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')}>
              {isSavingDraft ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Draft
            </button>
          )}
              <button
                onClick={() => handleSave()}
                disabled={loading || isUploadingImage}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg",
                  isDark 
                    ? "bg-teal-500 hover:bg-teal-400 text-black shadow-teal-500/20" 
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
                  (loading || isUploadingImage) && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isUploadingImage ? 'Uploading Image...' : (isEditMode ? 'Update Quiz' : 'Publish Quiz')}
              </button>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </motion.div>
        )}
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 p-4 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* Quiz Details Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={cn('p-8 rounded-2xl backdrop-blur-xl border shadow-xl', isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100')}>
          <h2 className={cn('text-xl font-semibold mb-6', isDark ? 'text-white' : 'text-gray-900')}>Quiz Details</h2>
          <div className="space-y-6">
            <div>
              <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>Cover Image</label>
              <ImageUploader 
                onUploadSuccess={setQuizImage} 
                onUploadStateChange={setIsUploadingImage}
                className="h-48" 
                initialImage={quizImage} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Advanced React Patterns" className={inputCls} />
              </div>
              <div className="md:col-span-1">
                <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                  {['General','Science','Technology','History','Mathematics','Language'].map(c => (
                    <option key={c} value={c} className={isDark ? 'bg-gray-900' : ''}>{c}</option>
                  ))}
                </select>
                {/* Custom topic overrides category */}
                <div className="mt-2">
                  <input type="text" value={customTopic} onChange={e => setCustomTopic(e.target.value)}
                    placeholder="Or enter custom topic (optional)"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm outline-none transition-all',
                      isDark ? 'bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-teal-400'
                             : 'bg-white/50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500',
                      customTopic && (isDark ? 'border-teal-400/50' : 'border-blue-400/50')
                    )} />
                  {customTopic && (
                    <p className={cn('text-xs mt-1', isDark ? 'text-teal-400' : 'text-blue-600')}>
                      ✓ Using custom topic instead of category
                    </p>
                  )}
                </div>
              </div>
              <div className="md:col-span-1">
                <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>Time Limit (min)</label>
                <input type="number" min="1" max="120" value={timeLimit}
                  onChange={e => setTimeLimit(parseInt(e.target.value) || 1)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Briefly explain what this quiz covers..." className={cn(inputCls, 'resize-none')} />
            </div>

            {/* Privacy toggle */}
            <div className={cn('pt-4 border-t', isDark ? 'border-white/5' : 'border-gray-100')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-blue-50 text-blue-600')}>
                    {isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>Privacy</h4>
                    <p className={cn('text-xs opacity-50', isDark ? 'text-white' : 'text-gray-600')}>
                      {isPublic ? 'Visible on Explore page' : 'Only you can see this quiz'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsPublic(!isPublic)}
                  className={cn('relative w-14 h-8 rounded-full transition-all duration-300',
                    isPublic ? (isDark ? 'bg-teal-500 shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'bg-blue-600') : (isDark ? 'bg-white/10' : 'bg-gray-200'))}>
                  <motion.div animate={{ x: isPublic ? 24 : 4 }}
                    className={cn('absolute top-1 w-6 h-6 rounded-full shadow-md',
                      isPublic ? 'bg-white' : (isDark ? 'bg-gray-500' : 'bg-white'))} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Questions */}
        <AnimatePresence>
          {questions.map((q, qIndex) => (
            <motion.div key={qIndex}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              className={cn('p-8 rounded-2xl backdrop-blur-xl border shadow-xl relative', isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100')}>

              {/* Question header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                    isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-blue-100 text-blue-600')}>
                    {qIndex + 1}
                  </span>
                  <h3 className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-gray-900')}>Question</h3>
                </div>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qIndex)}
                    className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors" title="Remove question">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-5">
                {/* Question text */}
                <input type="text" value={q.text}
                  onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
                  placeholder="Enter your question here..." className={cn(inputCls, 'text-lg font-medium')} />

                {/* Image + Points row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-600')}>Optional Image</label>
                    <ImageUploader onUploadSuccess={url => updateQuestion(qIndex, 'imageUrl', url)} className="h-32" initialImage={q.imageUrl} />
                  </div>
                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-600')}>Points</label>
                    <input type="number" min="1" max="100" value={q.points}
                      onChange={e => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 10)}
                      className={inputCls} />
                  </div>
                </div>

                {/* Options */}
                <div>
                  <label className={cn('block text-sm font-medium mb-3', isDark ? 'text-gray-400' : 'text-gray-600')}>
                    Answer Options <span className="opacity-50 font-normal">(click circle to mark correct, max 5)</span>
                  </label>
                  <div className="space-y-2">
                    {q.options.map((opt, oIndex) => (
                      <motion.div key={oIndex} layout
                        className={cn('flex items-center gap-3 p-3 rounded-xl border transition-all',
                          opt.isCorrect
                            ? (isDark ? 'border-teal-500/50 bg-teal-500/5' : 'border-green-500/50 bg-green-50')
                            : (isDark ? 'border-white/5 bg-white/2' : 'border-gray-100'))}>
                        {/* Correct answer selector */}
                        <button onClick={() => setCorrectOption(qIndex, oIndex)}
                          title="Mark as correct answer"
                          className={cn('w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center',
                            opt.isCorrect
                              ? (isDark ? 'border-teal-400 bg-teal-400' : 'border-green-500 bg-green-500')
                              : (isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-300 hover:border-gray-400'))}>
                          {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </button>

                        <input type="text" value={opt.text}
                          onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className={cn('flex-1 bg-transparent outline-none text-sm',
                            isDark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400')} />

                        {/* Delete option — only if more than 2 remain */}
                        {q.options.length > 2 && (
                          <button onClick={() => removeOption(qIndex, oIndex)}
                            className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors flex-shrink-0"
                            title="Remove option">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {q.options.length < 5 && (
                    <button onClick={() => addOption(qIndex)}
                      className={cn('mt-3 text-sm font-medium flex items-center gap-1.5 transition-colors',
                        isDark ? 'text-teal-400 hover:text-teal-300' : 'text-blue-600 hover:text-blue-700')}>
                      <Plus className="w-4 h-4" /> Add Option
                    </button>
                  )}
                </div>

                {/* Explanation — NEW */}
                <div>
                  <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-600')}>
                    Explanation <span className="opacity-50 font-normal">(shown after answering)</span>
                  </label>
                  <textarea value={q.explanation}
                    onChange={e => updateQuestion(qIndex, 'explanation', e.target.value)}
                    rows={2} placeholder="Why is this answer correct? Help learners understand..."
                    className={cn(inputCls, 'resize-none text-sm')} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add question button */}
        <button onClick={addQuestion}
          className={cn('w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-all font-medium',
            isDark ? 'border-white/20 text-gray-400 hover:border-teal-500 hover:text-teal-400 hover:bg-teal-500/5'
                   : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50')}>
          <Plus className="w-5 h-5" /> Add Another Question
        </button>
      </div>
    </PageTransition>
  );
}
