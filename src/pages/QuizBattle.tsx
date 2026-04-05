import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn, generateRoomCode } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { PageTransition } from '../components/PageTransition';
import {
  Swords, Copy, Check, Loader2, Trophy, ArrowLeft,
  Clock, Users, Zap, CheckCircle, XCircle, Crown, Shield
} from 'lucide-react';

type BattleStage = 'lobby' | 'waiting' | 'countdown' | 'battle' | 'results';

interface BattleRoom {
  id: string;
  code: string;
  quiz_id: string;
  host_id: string;
  guest_id: string | null;
  status: string;
  current_question: number;
  host_score: number;
  guest_score: number;
  host_answered: boolean;
  guest_answered: boolean;
}

interface QuizOption { id: string; option_text: string; is_correct: boolean; }
interface QuizQuestion { id: string; question_text: string; image_url?: string; points: number; options: QuizOption[]; }
interface QuizData { id: string; title: string; questions: QuizQuestion[]; }
interface OwnQuiz { id: string; title: string; }

const QUESTION_TIME = 30;

export function QuizBattle() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [stage, _setStage] = useState<BattleStage>('lobby');
  const setStage = (s: BattleStage) => { stageRef.current = s; _setStage(s); };
  const [ownQuizzes, setOwnQuizzes] = useState<OwnQuiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timer, setTimer] = useState(QUESTION_TIME);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hostScore, setHostScore] = useState(0);
  const [guestScore, setGuestScore] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [hostProfile, setHostProfile] = useState<any>(null);
  const [guestProfile, setGuestProfile] = useState<any>(null);

  const roomRef = useRef<BattleRoom | null>(null);
  const isHostRef = useRef(false);
  const channelRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageRef = useRef<BattleStage>('lobby');

  const isHost = room ? room.host_id === profile?.id : false;

  // Fetch own quizzes for lobby
  useEffect(() => {
    if (!profile) return;
    supabase.from('quizzes').select('id, title').eq('creator_id', profile.id).then(({ data }) => {
      if (data) setOwnQuizzes(data);
    });
  }, [profile]);

  // Load player profiles when room has both players
  useEffect(() => {
    if (!room) return;
    supabase.from('profiles').select('id, username, avatar_url').eq('id', room.host_id).single().then(({ data }) => {
      if (data) setHostProfile(data);
    });
    if (room.guest_id) {
      supabase.from('profiles').select('id, username, avatar_url').eq('id', room.guest_id).single().then(({ data }) => {
        if (data) setGuestProfile(data);
      });
    }
  }, [room?.host_id, room?.guest_id]);

  // Fetch quiz data when room is ready
  useEffect(() => {
    if (!room) return;
    supabase
      .from('quizzes')
      .select('id, title, questions(id, question_text, image_url, points, options(id, option_text, is_correct))')
      .eq('id', room.quiz_id)
      .single()
      .then(({ data }) => {
        if (data) setQuiz(data as QuizData);
      });
  }, [room?.quiz_id]);

  // Supabase realtime subscription
  const subscribeToRoom = useCallback((roomId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`battle_room_${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as BattleRoom;
          roomRef.current = updated;
          setRoom(updated);
          setHostScore(updated.host_score);
          setGuestScore(updated.guest_score);
          setCurrentIdx(updated.current_question);

          // Stage transitions (use stageRef to avoid stale closures)
          const currentStage = stageRef.current;
          if (updated.status === 'countdown' && currentStage !== 'countdown') {
            setStage('countdown');
          } else if (updated.status === 'in_progress' && (currentStage === 'countdown' || currentStage === 'waiting')) {
            setSelectedOption(null);
            setStage('battle');
          } else if (updated.status === 'finished' && currentStage !== 'results') {
            if (timerRef.current) clearInterval(timerRef.current);
            setStage('results');
          }

          // Both answered — advance question (host drives)
          if (
            updated.status === 'in_progress' &&
            updated.host_answered &&
            updated.guest_answered &&
            isHostRef.current
          ) {
            setTimeout(() => advanceQuestion(updated), 1200);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  // Countdown effect
  useEffect(() => {
    if (stage !== 'countdown') return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Host updates status to in_progress
          if (isHostRef.current && roomRef.current) {
            supabase.from('battle_rooms').update({ status: 'in_progress' }).eq('id', roomRef.current.id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  // Per-question timer
  useEffect(() => {
    if (stage !== 'battle') return;
    setTimer(QUESTION_TIME);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit if not answered
          if (!selectedOption && roomRef.current) {
            const field = isHostRef.current ? 'host_answered' : 'guest_answered';
            supabase.from('battle_rooms').update({ [field]: true }).eq('id', roomRef.current.id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage, currentIdx]);

  const advanceQuestion = async (updatedRoom: BattleRoom) => {
    if (!quiz) return;
    const nextIdx = updatedRoom.current_question + 1;
    if (nextIdx >= quiz.questions.length) {
      await supabase.from('battle_rooms').update({ status: 'finished' }).eq('id', updatedRoom.id);
    } else {
      await supabase.from('battle_rooms').update({
        current_question: nextIdx,
        host_answered: false,
        guest_answered: false,
      }).eq('id', updatedRoom.id);
      setSelectedOption(null);
    }
  };

  const createRoom = async () => {
    if (!profile || !selectedQuizId) { setError('Please select a quiz first'); return; }
    setLoadingAction(true);
    setError(null);
    try {
      const code = generateRoomCode();
      const { data, error: err } = await supabase.from('battle_rooms').insert({
        code,
        quiz_id: selectedQuizId,
        host_id: profile.id,
        status: 'waiting',
      }).select().single();
      if (err) throw err;
      isHostRef.current = true;
      setRoom(data);
      subscribeToRoom(data.id);
      setStage('waiting');
    } catch (e: any) {
      setError(e.message || 'Failed to create room');
    } finally {
      setLoadingAction(false);
    }
  };

  const joinRoom = async () => {
    if (!profile || !joinCode.trim()) { setError('Enter a room code'); return; }
    setLoadingAction(true);
    setError(null);
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .single();
      if (fetchErr || !existing) throw new Error('Room not found');
      if (existing.guest_id) throw new Error('Room is already full');
      if (existing.status !== 'waiting') throw new Error('Game already started');

      const { data, error: updateErr } = await supabase
        .from('battle_rooms')
        .update({ guest_id: profile.id })
        .eq('id', existing.id)
        .select()
        .single();
      if (updateErr) throw updateErr;
      isHostRef.current = false;
      setRoom(data);
      subscribeToRoom(data.id);
      setStage('waiting');
    } catch (e: any) {
      setError(e.message || 'Failed to join room');
    } finally {
      setLoadingAction(false);
    }
  };

  const startBattle = async () => {
    if (!room) return;
    await supabase.from('battle_rooms').update({ status: 'countdown' }).eq('id', room.id);
  };

  const handleAnswer = async (option: QuizOption) => {
    if (!room || selectedOption || !quiz) return;
    setSelectedOption(option.id);

    const isCorrect = option.is_correct;
    const points = quiz.questions[currentIdx]?.points || 10;
    const scoreInc = isCorrect ? points : 0;

    const updates: Record<string, any> = {};
    if (isHostRef.current) {
      updates.host_answered = true;
      updates.host_score = room.host_score + scoreInc;
    } else {
      updates.guest_answered = true;
      updates.guest_score = room.guest_score + scoreInc;
    }

    await supabase.from('battle_rooms').update(updates).eq('id', room.id);
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playAgain = () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    setRoom(null); setQuiz(null); setStage('lobby'); setSelectedOption(null);
    setHostScore(0); setGuestScore(0); setCurrentIdx(0); setError(null);
  };

  // ─── SHARED STYLES ───────────────────────────────────────────────────────────
  const cardClass = cn(
    'w-full max-w-2xl p-8 rounded-2xl backdrop-blur-xl border shadow-2xl',
    isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100'
  );
  const btnPrimary = cn(
    'px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all',
    isDark
      ? 'bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.3)]'
      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
  );
  const btnSecondary = cn(
    'px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all border',
    isDark
      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
  );
  const inputClass = cn(
    'w-full px-4 py-3 rounded-xl outline-none transition-all',
    isDark ? 'bg-white/5 border border-white/10 text-white focus:border-teal-400' : 'bg-white/50 border border-gray-200 text-gray-900 focus:border-blue-500'
  );
  const labelClass = cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700');

  const PlayerAvatar = ({ p, score, label }: { p: any; score: number; label: string }) => (
    <div className="flex flex-col items-center gap-2">
      <div className={cn(
        'w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-4',
        isDark ? 'bg-teal-500/20 text-teal-400 border-teal-500/40' : 'bg-blue-100 text-blue-700 border-blue-300'
      )}>
        {p?.avatar_url
          ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
          : p?.username?.[0]?.toUpperCase() || '?'
        }
      </div>
      <span className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{p?.username || label}</span>
      <span className={cn('text-2xl font-black', isDark ? 'text-teal-400' : 'text-blue-600')}>{score}</span>
    </div>
  );

  // ─── LOBBY ───────────────────────────────────────────────────────────────────
  if (stage === 'lobby') {
    return (
      <PageTransition className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className={cn('w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg', isDark ? 'bg-teal-500/20 shadow-teal-500/20' : 'bg-blue-100 shadow-blue-500/20')}>
            <Swords className={cn('w-8 h-8', isDark ? 'text-teal-400' : 'text-blue-600')} />
          </div>
          <h1 className={cn('text-4xl font-black tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>Quiz Battle</h1>
          <p className={cn('mt-2 text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>Challenge a friend to a real-time 1v1 quiz duel</p>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-sm text-center">
            {error}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Create Room */}
          <div className={cn('p-6 rounded-2xl border backdrop-blur-xl shadow-xl', isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100')}>
            <div className="flex items-center gap-3 mb-5">
              <div className={cn('p-2 rounded-lg', isDark ? 'bg-teal-500/10' : 'bg-blue-50')}>
                <Zap className={cn('w-5 h-5', isDark ? 'text-teal-400' : 'text-blue-600')} />
              </div>
              <h2 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>Create Room</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Pick Your Quiz</label>
                <select
                  value={selectedQuizId}
                  onChange={e => setSelectedQuizId(e.target.value)}
                  className={cn(inputClass, 'appearance-none cursor-pointer')}
                >
                  <option value="">-- Select a quiz --</option>
                  {ownQuizzes.map(q => (
                    <option key={q.id} value={q.id} className={isDark ? 'bg-gray-900' : ''}>{q.title}</option>
                  ))}
                </select>
                {ownQuizzes.length === 0 && (
                  <p className="mt-2 text-xs text-yellow-500">You have no quizzes. Create one first!</p>
                )}
              </div>
              <button onClick={createRoom} disabled={loadingAction || !selectedQuizId} className={cn(btnPrimary, 'w-full disabled:opacity-50 disabled:cursor-not-allowed')}>
                {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Swords className="w-5 h-5" /> Create Room</>}
              </button>
            </div>
          </div>

          {/* Join Room */}
          <div className={cn('p-6 rounded-2xl border backdrop-blur-xl shadow-xl', isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100')}>
            <div className="flex items-center gap-3 mb-5">
              <div className={cn('p-2 rounded-lg', isDark ? 'bg-teal-500/10' : 'bg-blue-50')}>
                <Users className={cn('w-5 h-5', isDark ? 'text-teal-400' : 'text-blue-600')} />
              </div>
              <h2 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>Join Room</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Room Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="e.g. AB12CD"
                  maxLength={6}
                  className={cn(inputClass, 'tracking-widest text-center text-xl font-bold uppercase')}
                />
              </div>
              <button onClick={joinRoom} disabled={loadingAction || joinCode.length < 6} className={cn(btnSecondary, 'w-full disabled:opacity-50 disabled:cursor-not-allowed')}>
                {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Users className="w-5 h-5" /> Join Room</>}
              </button>
            </div>
          </div>
        </motion.div>

        <button onClick={() => navigate('/dashboard')} className={cn('flex items-center gap-2 text-sm', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </PageTransition>
    );
  }

  // ─── WAITING ─────────────────────────────────────────────────────────────────
  if (stage === 'waiting') {
    const guestArrived = !!room?.guest_id;
    return (
      <PageTransition className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cardClass}>
          <h2 className={cn('text-2xl font-bold text-center mb-8', isDark ? 'text-white' : 'text-gray-900')}>
            {guestArrived ? '🎮 Opponent Joined!' : 'Waiting for Opponent...'}
          </h2>

          {/* Room Code Display */}
          <div className={cn('p-6 rounded-2xl mb-8 text-center border', isDark ? 'bg-teal-500/5 border-teal-500/20' : 'bg-blue-50 border-blue-200')}>
            <p className={cn('text-xs uppercase font-bold tracking-widest mb-2', isDark ? 'text-teal-400' : 'text-blue-600')}>Room Code</p>
            <div className="flex items-center justify-center gap-3">
              <span className={cn('text-5xl font-black tracking-widest', isDark ? 'text-white' : 'text-gray-900')}>{room?.code}</span>
              <button onClick={copyCode} className={cn('p-2 rounded-lg transition-all', isDark ? 'hover:bg-white/10' : 'hover:bg-blue-100')}>
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className={cn('w-5 h-5', isDark ? 'text-gray-400' : 'text-gray-500')} />}
              </button>
            </div>
            <p className={cn('text-xs mt-2', isDark ? 'text-gray-500' : 'text-gray-400')}>Share this code with your opponent</p>
          </div>

          {/* Players */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <PlayerAvatar p={hostProfile} score={0} label="Host" />
            <div className={cn('text-2xl font-black', isDark ? 'text-gray-600' : 'text-gray-300')}>VS</div>
            <div className="flex flex-col items-center gap-2">
              {guestArrived ? (
                <PlayerAvatar p={guestProfile} score={0} label="Guest" />
              ) : (
                <div className={cn('w-14 h-14 rounded-full border-4 border-dashed flex items-center justify-center', isDark ? 'border-gray-700' : 'border-gray-300')}>
                  <Loader2 className={cn('w-6 h-6 animate-spin', isDark ? 'text-gray-600' : 'text-gray-400')} />
                </div>
              )}
              {!guestArrived && <span className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-400')}>Waiting...</span>}
            </div>
          </div>

          {isHost && guestArrived && (
            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              onClick={startBattle}
              className={cn(btnPrimary, 'w-full text-lg py-4')}
            >
              <Swords className="w-6 h-6" /> Start Battle!
            </motion.button>
          )}
          {!isHost && (
            <p className={cn('text-center text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
              Waiting for host to start the battle...
            </p>
          )}
        </motion.div>
      </PageTransition>
    );
  }

  // ─── COUNTDOWN ───────────────────────────────────────────────────────────────
  if (stage === 'countdown') {
    return (
      <PageTransition className="min-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            {countdown > 0 ? (
              <>
                <div className={cn('text-[12rem] font-black leading-none', isDark ? 'text-teal-400' : 'text-blue-600')}
                  style={{ textShadow: isDark ? '0 0 60px rgba(0,255,255,0.5)' : '0 0 60px rgba(37,99,235,0.3)' }}>
                  {countdown}
                </div>
                <p className={cn('text-2xl font-bold', isDark ? 'text-gray-300' : 'text-gray-700')}>Get Ready!</p>
              </>
            ) : (
              <div className={cn('text-8xl font-black', isDark ? 'text-teal-400' : 'text-blue-600')}>GO!</div>
            )}
          </motion.div>
        </AnimatePresence>
      </PageTransition>
    );
  }

  // ─── BATTLE ──────────────────────────────────────────────────────────────────
  if (stage === 'battle' && quiz) {
    const q = quiz.questions[currentIdx];
    const totalQ = quiz.questions.length;
    const timerPct = (timer / QUESTION_TIME) * 100;
    const iAnswered = selectedOption !== null;
    const myScore = isHost ? hostScore : guestScore;
    const oppScore = isHost ? guestScore : hostScore;
    const oppProfile = isHost ? guestProfile : hostProfile;
    const meProfile = isHost ? hostProfile : guestProfile;

    return (
      <PageTransition className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
        {/* Header / Scoreboard */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={cn('w-full max-w-2xl p-4 rounded-2xl border backdrop-blur-xl flex items-center justify-between', isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100')}>
          <div className="flex items-center gap-3">
            {meProfile?.avatar_url
              ? <img src={meProfile.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-teal-500/50" alt="" />
              : <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-bold border-2', isDark ? 'bg-teal-500/20 text-teal-400 border-teal-500/40' : 'bg-blue-100 text-blue-700 border-blue-200')}>{meProfile?.username?.[0]?.toUpperCase() || 'Y'}</div>
            }
            <div>
              <p className={cn('text-xs font-bold', isDark ? 'text-gray-400' : 'text-gray-500')}>You</p>
              <p className={cn('text-2xl font-black', isDark ? 'text-teal-400' : 'text-blue-600')}>{myScore}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className={cn('flex items-center gap-2 text-sm font-bold', timer < 10 ? 'text-red-500 animate-pulse' : (isDark ? 'text-gray-300' : 'text-gray-700'))}>
              <Clock className="w-4 h-4" /> {timer}s
            </div>
            <div className={cn('w-24 h-2 rounded-full overflow-hidden', isDark ? 'bg-white/10' : 'bg-gray-200')}>
              <motion.div
                className={cn('h-full rounded-full', timer < 10 ? 'bg-red-500' : (isDark ? 'bg-teal-400' : 'bg-blue-500'))}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>Q {currentIdx + 1}/{totalQ}</p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className={cn('text-xs font-bold', isDark ? 'text-gray-400' : 'text-gray-500')}>Opponent</p>
              <p className={cn('text-2xl font-black', isDark ? 'text-purple-400' : 'text-purple-600')}>{oppScore}</p>
            </div>
            {oppProfile?.avatar_url
              ? <img src={oppProfile.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/50" alt="" />
              : <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 bg-purple-500/20 text-purple-400 border-purple-500/40">{oppProfile?.username?.[0]?.toUpperCase() || '?'}</div>
            }
          </div>
        </motion.div>

        {/* Question Card */}
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
          className={cn(cardClass, 'relative')}
        >
          {q.image_url && (
            <img src={q.image_url} alt="Question" className="w-full h-40 object-cover rounded-xl mb-6" />
          )}
          <h2 className={cn('text-xl font-semibold mb-6', isDark ? 'text-white' : 'text-gray-900')}>{q.question_text}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {q.options.map(opt => {
              const isChosen = selectedOption === opt.id;
              const show = iAnswered;
              let cls = '';
              let Icon = null;
              if (show) {
                if (isChosen && opt.is_correct) { cls = isDark ? 'border-green-500 bg-green-500/10' : 'border-green-600 bg-green-50'; Icon = <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />; }
                else if (isChosen && !opt.is_correct) { cls = isDark ? 'border-red-500 bg-red-500/10' : 'border-red-600 bg-red-50'; Icon = <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />; }
                else if (!isChosen && opt.is_correct) { cls = isDark ? 'border-green-500/40 bg-transparent opacity-60' : 'border-green-600/40 bg-transparent opacity-60'; Icon = <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />; }
                else { cls = isDark ? 'border-white/5 opacity-30' : 'border-gray-100 opacity-30'; }
              } else {
                cls = isDark ? 'border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50';
              }
              return (
                <motion.button
                  key={opt.id}
                  whileHover={!iAnswered ? { scale: 1.02 } : {}}
                  whileTap={!iAnswered ? { scale: 0.98 } : {}}
                  onClick={() => handleAnswer(opt)}
                  disabled={iAnswered}
                  className={cn('p-4 rounded-xl border-2 text-left flex items-center justify-between gap-3 transition-all', cls, isDark ? 'text-white' : 'text-gray-900')}
                >
                  <span className="font-medium">{opt.option_text}</span>
                  {Icon}
                </motion.button>
              );
            })}
          </div>

          {iAnswered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center">
              <p className={cn('text-sm font-semibold', isDark ? 'text-gray-400' : 'text-gray-500')}>
                Waiting for opponent...
              </p>
            </motion.div>
          )}
        </motion.div>
      </PageTransition>
    );
  }

  // ─── RESULTS ─────────────────────────────────────────────────────────────────
  if (stage === 'results') {
    const myScore = isHost ? hostScore : guestScore;
    const oppScore = isHost ? guestScore : hostScore;
    const iWon = myScore > oppScore;
    const isDraw = myScore === oppScore;

    return (
      <PageTransition className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={cn(cardClass, 'text-center')}>
          {/* Result Icon */}
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-6"
          >
            {iWon ? (
              <div className={cn('w-24 h-24 mx-auto rounded-3xl flex items-center justify-center shadow-2xl', isDark ? 'bg-teal-500/20 shadow-teal-500/30' : 'bg-yellow-100 shadow-yellow-500/30')}>
                <Crown className={cn('w-12 h-12', isDark ? 'text-teal-400' : 'text-yellow-500')} />
              </div>
            ) : isDraw ? (
              <div className="w-24 h-24 mx-auto rounded-3xl bg-purple-500/20 flex items-center justify-center shadow-2xl shadow-purple-500/20">
                <Shield className="w-12 h-12 text-purple-400" />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gray-500/20 flex items-center justify-center shadow-2xl">
                <Swords className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className={cn('text-4xl font-black mb-2', isDark ? 'text-white' : 'text-gray-900')}
          >
            {iWon ? '🎉 You Won!' : isDraw ? '🤝 Draw!' : '😤 You Lost!'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className={cn('text-sm mb-8', isDark ? 'text-gray-400' : 'text-gray-600')}
          >
            {quiz?.title}
          </motion.p>

          {/* Scores */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-8 mb-10"
          >
            <div className="text-center">
              <p className={cn('text-xs font-bold uppercase tracking-widest mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>You</p>
              <p className={cn('text-5xl font-black', isDark ? 'text-teal-400' : 'text-blue-600')}>{myScore}</p>
              <Trophy className={cn('w-5 h-5 mx-auto mt-1', isDark ? 'text-teal-500' : 'text-blue-500')} />
            </div>
            <div className={cn('text-3xl font-black', isDark ? 'text-gray-700' : 'text-gray-300')}>VS</div>
            <div className="text-center">
              <p className={cn('text-xs font-bold uppercase tracking-widest mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Opponent</p>
              <p className="text-5xl font-black text-purple-400">{oppScore}</p>
              <Trophy className="w-5 h-5 mx-auto mt-1 text-purple-500" />
            </div>
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <button onClick={playAgain} className={cn(btnPrimary, 'flex-1')}>
              <Swords className="w-5 h-5" /> Play Again
            </button>
            <button onClick={() => navigate('/dashboard')} className={cn(btnSecondary, 'flex-1')}>
              <ArrowLeft className="w-5 h-5" /> Dashboard
            </button>
          </motion.div>
        </motion.div>
      </PageTransition>
    );
  }

  // Fallback loading
  return (
    <PageTransition className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
    </PageTransition>
  );
}
