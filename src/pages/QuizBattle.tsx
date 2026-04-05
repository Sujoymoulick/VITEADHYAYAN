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
  Clock, Users, Zap, CheckCircle, XCircle, Crown, Shield, Star
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = 'lobby' | 'waiting' | 'countdown' | 'battle' | 'results';

interface Room {
  id: string;
  code: string;
  quiz_id: string;
  player1_id: string;
  player2_id: string | null;
  player1_score: number;
  player2_score: number;
  player1_finished: boolean;
  player2_finished: boolean;
  current_question: number;
  status: 'waiting' | 'active' | 'finished';
}

interface QuizOption { id: string; option_text: string; is_correct: boolean; }
interface QuizQuestion { id: string; question_text: string; image_url?: string; points: number; options: QuizOption[]; }
interface QuizData { id: string; title: string; questions: QuizQuestion[]; }
interface OwnQuiz { id: string; title: string; }

const QUESTION_TIME = 30;
const STAGE_ORDER: Record<string, number> = { lobby: 0, waiting: 1, countdown: 2, battle: 3, results: 4 };

// ─── Score count-up hook ──────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 30));
    const t = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function QuizBattle() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // ── UI State ──
  const [stage, _setStage] = useState<Stage>('lobby');
  const [ownQuizzes, setOwnQuizzes] = useState<OwnQuiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timer, setTimer] = useState(QUESTION_TIME);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [p1Profile, setP1Profile] = useState<any>(null);
  const [p2Profile, setP2Profile] = useState<any>(null);

  // ── Refs (always current, no stale closure issues) ──
  const stageRef = useRef<Stage>('lobby');
  const roomRef = useRef<Room | null>(null);
  const quizRef = useRef<QuizData | null>(null);
  const isP1Ref = useRef(false);           // am I player1?
  const channelRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advancedFromRef = useRef(-1);      // prevent duplicate advances
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStage = (s: Stage) => { stageRef.current = s; _setStage(s); };

  // ─── Fetch own quizzes ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    supabase.from('quizzes').select('id, title').eq('creator_id', profile.id)
      .then(({ data }) => { if (data) setOwnQuizzes(data); });
  }, [profile]);

  // ─── Load player profiles ──────────────────────────────────────────────────
  useEffect(() => {
    if (!room?.player1_id) return;
    supabase.from('profiles').select('id,username,avatar_url').eq('id', room.player1_id)
      .maybeSingle().then(({ data }) => { if (data) setP1Profile(data); });
    if (room.player2_id) {
      supabase.from('profiles').select('id,username,avatar_url').eq('id', room.player2_id)
        .maybeSingle().then(({ data }) => { if (data) setP2Profile(data); });
    }
  }, [room?.player1_id, room?.player2_id]);

  // ─── Load quiz ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room?.quiz_id) return;
    supabase
      .from('quizzes')
      .select('id,title,questions(id,question_text,image_url,points,options(id,option_text,is_correct))')
      .eq('id', room.quiz_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { const q = data as QuizData; setQuiz(q); quizRef.current = q; }
      });
  }, [room?.quiz_id]);

  // ─── CORE: applyRoom — applies any room snapshot ───────────────────────────
  const applyRoom = useCallback((r: Room) => {
    const prev = roomRef.current;
    roomRef.current = r;
    setRoom(r);

    // Clear selection when question advances
    if (prev && r.current_question !== prev.current_question) {
      setSelectedOption(null);
    }

    // Update scores & question index
    setCurrentIdx(r.current_question);

    // ── Stage transitions (one-directional only) ──
    const cur = stageRef.current;

    if (r.status === 'active' && STAGE_ORDER['countdown'] > STAGE_ORDER[cur]) {
      setStage('countdown');
    }

    if (r.status === 'finished' && STAGE_ORDER['results'] > STAGE_ORDER[cur]) {
      if (timerRef.current) clearInterval(timerRef.current);
      setStage('results');
      return;
    }

    // ── Detect both finished → go to results ──
    if (r.status === 'active' && r.player1_finished && r.player2_finished) {
      if (timerRef.current) clearInterval(timerRef.current);
      // Update DB to finished
      supabase.from('battle_rooms').update({ status: 'finished' }).eq('id', r.id);
      setStage('results');
      return;
    }

    // ── Advance question when both answered ──
    if (
      r.status === 'active' &&
      r.player1_finished === false &&
      r.player2_finished === false &&
      advancedFromRef.current !== r.current_question
    ) {
      // This path is hit after question resets (host_answered/guest_answered → false)
    }

    // ── Handle per-question advance ──
    // We use separate boolean fields for per-question answered tracking
    // stored as player1_q_answered and player2_q_answered — but since
    // the schema uses player1_finished/player2_finished as "done with quiz",
    // per-question answered state is managed locally + via current_question field.
  }, []);

  // ─── CORE: syncRoom — fetch fresh state from DB ────────────────────────────
  const syncRoom = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('battle_rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();
    if (data) applyRoom(data as Room);
  }, [applyRoom]);

  // ─── Realtime subscription ─────────────────────────────────────────────────
  const subscribe = useCallback((roomId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`room_${roomId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${roomId}` },
        (payload) => applyRoom(payload.new as Room)
      )
      .subscribe();
    channelRef.current = ch;
  }, [applyRoom]);

  // ─── Polling fallback every 1.5s ──────────────────────────────────────────
  useEffect(() => {
    if (!room?.id || stage === 'lobby' || stage === 'results') return;
    const id = room.id;
    const t = setInterval(() => syncRoom(id), 1500);
    return () => clearInterval(t);
  }, [room?.id, stage, syncRoom]);

  // ─── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'countdown') return;
    setCountdown(3);
    let count = 3;
    const t = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(t);
        // Directly transition to battle
        setTimeout(() => { setSelectedOption(null); setStage('battle'); }, 800);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [stage]);

  // ─── Per-question countdown timer ─────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'battle') return;
    setTimer(QUESTION_TIME);
    if (timerRef.current) clearInterval(timerRef.current);

    let t = QUESTION_TIME;
    timerRef.current = setInterval(async () => {
      t -= 1;
      setTimer(t);
      if (t <= 0) {
        clearInterval(timerRef.current!);
        // Time's up — auto-submit this question as no answer
        await submitAnswer(null);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage, currentIdx]); // eslint-disable-line

  // ─── Safety net: if stuck in battle, force finish after QUESTION_TIME+10s ─
  useEffect(() => {
    if (stage !== 'battle') return;
    if (safetyRef.current) clearTimeout(safetyRef.current);
    safetyRef.current = setTimeout(async () => {
      if (stageRef.current !== 'battle' || !roomRef.current) return;
      // Force finish
      const r = roomRef.current;
      const isP1 = isP1Ref.current;
      await supabase.from('battle_rooms').update({
        [isP1 ? 'player1_finished' : 'player2_finished']: true,
      }).eq('id', r.id);
      await syncRoom(r.id);
    }, (QUESTION_TIME + 10) * 1000);
    return () => { if (safetyRef.current) clearTimeout(safetyRef.current); };
  }, [stage, currentIdx, syncRoom]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const createRoom = async () => {
    if (!profile || !selectedQuizId) { setError('Please select a quiz first'); return; }
    setLoading(true); setError(null);
    try {
      const code = generateRoomCode();
      const { data, error: err } = await supabase
        .from('battle_rooms')
        .insert({ code, quiz_id: selectedQuizId, player1_id: profile.id, status: 'waiting' })
        .select().single();
      if (err) throw err;
      isP1Ref.current = true;
      roomRef.current = data;
      setRoom(data);
      subscribe(data.id);
      setStage('waiting');
    } catch (e: any) {
      setError(e.message || 'Failed to create room');
    } finally { setLoading(false); }
  };

  const joinRoom = async () => {
    if (!profile || joinCode.trim().length < 6) { setError('Enter the 6-character room code'); return; }
    setLoading(true); setError(null);
    try {
      // Find room by code (waiting only)
      const { data: existing, error: fe } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .eq('status', 'waiting')
        .maybeSingle();
      if (fe) throw new Error('Failed to look up room');
      if (!existing) throw new Error('Room not found or already started');
      if (existing.player2_id) throw new Error('Room is full');
      if (existing.player1_id === profile.id) throw new Error('You cannot join your own room');

      // Join: set player2 + active
      const { data, error: ue } = await supabase
        .from('battle_rooms')
        .update({ player2_id: profile.id, status: 'active' })
        .eq('id', existing.id)
        .select().single();
      if (ue) throw ue;

      isP1Ref.current = false;
      roomRef.current = data;
      setRoom(data);
      subscribe(data.id);
      setStage('waiting');
    } catch (e: any) {
      setError(e.message || 'Failed to join room');
    } finally { setLoading(false); }
  };

  // Called when player1 (host) manually starts — or auto when player2 joins
  const startBattle = async () => {
    if (!room) return;
    await supabase.from('battle_rooms').update({ status: 'active' }).eq('id', room.id);
    await syncRoom(room.id);
  };

  // Submit answer for current question
  const submitAnswer = useCallback(async (option: QuizOption | null) => {
    const r = roomRef.current;
    const q = quizRef.current;
    if (!r || !q) return;

    const isP1 = isP1Ref.current;
    const curIdx = r.current_question;
    const question = q.questions[curIdx];
    if (!question) return;

    const isCorrect = option ? option.is_correct : false;
    const pts = isCorrect ? (question.points || 10) : 0;

    const scoreField = isP1 ? 'player1_score' : 'player2_score';
    const curScore = isP1 ? r.player1_score : r.player2_score;
    const nextIdx = curIdx + 1;
    const isLastQ = nextIdx >= q.questions.length;

    const updates: Record<string, any> = {
      [scoreField]: curScore + pts,
    };

    if (isLastQ) {
      // Last question — mark this player as finished
      updates[isP1 ? 'player1_finished' : 'player2_finished'] = true;
    } else {
      // More questions — only advance current_question if both have answered
      // We track per-question progress using current_question + advancedFromRef
      if (advancedFromRef.current !== curIdx) {
        advancedFromRef.current = curIdx;
        // Both players advance independently — host controls current_question
        if (isP1) {
          updates.current_question = nextIdx;
        }
      }
    }

    await supabase.from('battle_rooms').update(updates).eq('id', r.id);

    // Immediately sync to get fresh state
    setTimeout(() => syncRoom(r.id), 400);
  }, [syncRoom]);

  const handleAnswer = async (option: QuizOption) => {
    if (selectedOption || !room || !quiz) return;
    setSelectedOption(option.id);
    if (timerRef.current) clearInterval(timerRef.current);
    await submitAnswer(option);
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playAgain = () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setRoom(null); setQuiz(null); setStage('lobby');
    setSelectedOption(null); setCurrentIdx(0); setError(null);
    advancedFromRef.current = -1;
    roomRef.current = null; quizRef.current = null;
    setP1Profile(null); setP2Profile(null);
  };

  // ─── Computed ─────────────────────────────────────────────────────────────
  const isP1 = isP1Ref.current;
  const myScore = room ? (isP1 ? room.player1_score : room.player2_score) : 0;
  const oppScore = room ? (isP1 ? room.player2_score : room.player1_score) : 0;
  const myProfile = isP1 ? p1Profile : p2Profile;
  const oppProfile = isP1 ? p2Profile : p1Profile;
  const iAmFinished = room ? (isP1 ? room.player1_finished : room.player2_finished) : false;

  // ─── Styles ───────────────────────────────────────────────────────────────
  const card = cn('w-full max-w-2xl p-8 rounded-2xl backdrop-blur-xl border shadow-2xl',
    isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100');
  const btnPrimary = cn('px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all',
    isDark ? 'bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.3)]'
           : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30');
  const btnSecondary = cn('px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all border',
    isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
           : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50');
  const inputCls = cn('w-full px-4 py-3 rounded-xl outline-none transition-all border',
    isDark ? 'bg-white/5 border-white/10 text-white focus:border-teal-400'
           : 'bg-white/50 border-gray-200 text-gray-900 focus:border-blue-500');
  const labelCls = cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700');

  const Avatar = ({ p, label }: { p: any; label: string }) => (
    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 text-sm',
      isDark ? 'bg-teal-500/20 text-teal-400 border-teal-500/40' : 'bg-blue-100 text-blue-700 border-blue-300')}>
      {p?.avatar_url ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                     : p?.username?.[0]?.toUpperCase() || label[0]}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // LOBBY
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 'lobby') return (
    <PageTransition className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className={cn('w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg',
          isDark ? 'bg-teal-500/20 shadow-teal-500/30' : 'bg-blue-100 shadow-blue-500/20')}>
          <Swords className={cn('w-8 h-8', isDark ? 'text-teal-400' : 'text-blue-600')} />
        </div>
        <h1 className={cn('text-4xl font-black tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>Quiz Battle</h1>
        <p className={cn('mt-2 text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>Challenge a friend to a real-time 1v1 quiz duel</p>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full max-w-2xl p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-sm text-center">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">

        {/* Create Room */}
        <div className={cn('p-6 rounded-2xl border backdrop-blur-xl shadow-xl',
          isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100')}>
          <div className="flex items-center gap-3 mb-5">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-teal-500/10' : 'bg-blue-50')}>
              <Zap className={cn('w-5 h-5', isDark ? 'text-teal-400' : 'text-blue-600')} />
            </div>
            <h2 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>Create Room</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Pick Your Quiz</label>
              <select value={selectedQuizId} onChange={e => setSelectedQuizId(e.target.value)}
                className={cn(inputCls, 'appearance-none cursor-pointer')}>
                <option value="">-- Select a quiz --</option>
                {ownQuizzes.map(q => (
                  <option key={q.id} value={q.id} className={isDark ? 'bg-gray-900' : ''}>{q.title}</option>
                ))}
              </select>
              {ownQuizzes.length === 0 && (
                <p className="mt-2 text-xs text-yellow-500">You have no quizzes. Create one first!</p>
              )}
            </div>
            <button onClick={createRoom} disabled={loading || !selectedQuizId}
              className={cn(btnPrimary, 'w-full disabled:opacity-50 disabled:cursor-not-allowed')}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Swords className="w-5 h-5" /> Create Room</>}
            </button>
          </div>
        </div>

        {/* Join Room */}
        <div className={cn('p-6 rounded-2xl border backdrop-blur-xl shadow-xl',
          isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100')}>
          <div className="flex items-center gap-3 mb-5">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-teal-500/10' : 'bg-blue-50')}>
              <Users className={cn('w-5 h-5', isDark ? 'text-teal-400' : 'text-blue-600')} />
            </div>
            <h2 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>Join Room</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Room Code</label>
              <input type="text" value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. AB12CD" maxLength={6}
                className={cn(inputCls, 'tracking-widest text-center text-xl font-bold uppercase')} />
            </div>
            <button onClick={joinRoom} disabled={loading || joinCode.length < 6}
              className={cn(btnSecondary, 'w-full disabled:opacity-50 disabled:cursor-not-allowed')}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Users className="w-5 h-5" /> Join Room</>}
            </button>
          </div>
        </div>
      </motion.div>

      <button onClick={() => navigate('/dashboard')}
        className={cn('flex items-center gap-2 text-sm', isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')}>
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>
    </PageTransition>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // WAITING
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 'waiting') {
    const opponentJoined = !!room?.player2_id;
    return (
      <PageTransition className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={card}>
          <h2 className={cn('text-2xl font-bold text-center mb-8', isDark ? 'text-white' : 'text-gray-900')}>
            {opponentJoined ? '🎮 Opponent Joined!' : 'Waiting for Opponent...'}
          </h2>

          {/* Room Code */}
          <div className={cn('p-6 rounded-2xl mb-8 text-center border',
            isDark ? 'bg-teal-500/5 border-teal-500/20' : 'bg-blue-50 border-blue-200')}>
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
            <div className="flex flex-col items-center gap-2">
              <Avatar p={p1Profile} label="P1" />
              <span className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{p1Profile?.username || 'You'}</span>
            </div>
            <div className={cn('text-2xl font-black', isDark ? 'text-gray-600' : 'text-gray-300')}>VS</div>
            <div className="flex flex-col items-center gap-2">
              {opponentJoined ? (
                <>
                  <Avatar p={p2Profile} label="P2" />
                  <span className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{p2Profile?.username || 'Opponent'}</span>
                </>
              ) : (
                <>
                  <div className={cn('w-12 h-12 rounded-full border-4 border-dashed flex items-center justify-center',
                    isDark ? 'border-gray-700' : 'border-gray-300')}>
                    <Loader2 className={cn('w-5 h-5 animate-spin', isDark ? 'text-gray-600' : 'text-gray-400')} />
                  </div>
                  <span className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-400')}>Waiting...</span>
                </>
              )}
            </div>
          </div>

          {/* Host: start button / Guest: wait for host */}
          {isP1 && opponentJoined && (
            <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              onClick={startBattle} className={cn(btnPrimary, 'w-full text-lg py-4')}>
              <Swords className="w-6 h-6" /> Start Battle!
            </motion.button>
          )}
          {!isP1 && (
            <p className={cn('text-center text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
              Waiting for host to start the battle...
            </p>
          )}
        </motion.div>
      </PageTransition>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COUNTDOWN
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 'countdown') return (
    <PageTransition className="min-h-screen flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div key={countdown}
          initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.4 }}
          className="text-center">
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

  // ═══════════════════════════════════════════════════════════════════════════
  // BATTLE
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 'battle' && quiz) {
    const q = quiz.questions[currentIdx];
    if (!q) return <PageTransition className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-teal-500" /></PageTransition>;

    const timerPct = (timer / QUESTION_TIME) * 100;
    const answered = selectedOption !== null;

    return (
      <PageTransition className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
        {/* Scoreboard */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className={cn('w-full max-w-2xl p-4 rounded-2xl border backdrop-blur-xl flex items-center justify-between',
            isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-blue-100')}>
          <div className="flex items-center gap-3">
            <Avatar p={myProfile} label="Me" />
            <div>
              <p className={cn('text-xs font-bold', isDark ? 'text-gray-400' : 'text-gray-500')}>You</p>
              <p className={cn('text-2xl font-black', isDark ? 'text-teal-400' : 'text-blue-600')}>{myScore}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className={cn('flex items-center gap-2 text-sm font-bold',
              timer < 10 ? 'text-red-500 animate-pulse' : (isDark ? 'text-gray-300' : 'text-gray-700'))}>
              <Clock className="w-4 h-4" /> {timer}s
            </div>
            <div className={cn('w-24 h-2 rounded-full overflow-hidden', isDark ? 'bg-white/10' : 'bg-gray-200')}>
              <motion.div className={cn('h-full rounded-full', timer < 10 ? 'bg-red-500' : (isDark ? 'bg-teal-400' : 'bg-blue-500'))}
                animate={{ width: `${timerPct}%` }} transition={{ duration: 0.5 }} />
            </div>
            <p className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>Q {currentIdx + 1}/{quiz.questions.length}</p>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div>
              <p className={cn('text-xs font-bold', isDark ? 'text-gray-400' : 'text-gray-500')}>Opponent</p>
              <p className={cn('text-2xl font-black', isDark ? 'text-purple-400' : 'text-purple-600')}>{oppScore}</p>
            </div>
            <Avatar p={oppProfile} label="Opp" />
          </div>
        </motion.div>

        {/* Question */}
        <motion.div key={currentIdx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
          className={cn(card, 'relative')}>
          {q.image_url && <img src={q.image_url} alt="Q" className="w-full h-40 object-cover rounded-xl mb-6" />}
          <h2 className={cn('text-xl font-semibold mb-6', isDark ? 'text-white' : 'text-gray-900')}>{q.question_text}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {q.options.map(opt => {
              const chosen = selectedOption === opt.id;
              let cls = '';
              let Icon: any = null;
              if (answered) {
                if (chosen && opt.is_correct) { cls = isDark ? 'border-green-500 bg-green-500/10' : 'border-green-600 bg-green-50'; Icon = <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />; }
                else if (chosen && !opt.is_correct) { cls = isDark ? 'border-red-500 bg-red-500/10' : 'border-red-600 bg-red-50'; Icon = <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />; }
                else if (!chosen && opt.is_correct) { cls = isDark ? 'border-green-500/40 opacity-60' : 'border-green-600/40 opacity-60'; Icon = <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />; }
                else { cls = isDark ? 'border-white/5 opacity-30' : 'border-gray-100 opacity-30'; }
              } else {
                cls = isDark ? 'border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50';
              }
              return (
                <motion.button key={opt.id} whileHover={!answered ? { scale: 1.02 } : {}} whileTap={!answered ? { scale: 0.98 } : {}}
                  onClick={() => handleAnswer(opt)} disabled={answered}
                  className={cn('p-4 rounded-xl border-2 text-left flex items-center justify-between gap-3 transition-all', cls, isDark ? 'text-white' : 'text-gray-900')}>
                  <span className="font-medium">{opt.option_text}</span>
                  {Icon}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {answered && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-6 text-center">
                {iAmFinished ? (
                  <p className={cn('text-sm font-semibold', isDark ? 'text-teal-400' : 'text-blue-600')}>
                    ✅ Quiz complete! Waiting for opponent to finish...
                  </p>
                ) : (
                  <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    Next question loading...
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </PageTransition>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 'results') {
    const iWon = myScore > oppScore;
    const isDraw = myScore === oppScore;
    return <ResultScreen
      myScore={myScore} oppScore={oppScore}
      iWon={iWon} isDraw={isDraw}
      myProfile={myProfile} oppProfile={oppProfile}
      quizTitle={quiz?.title}
      isDark={isDark}
      cardCls={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary}
      onPlayAgain={playAgain}
      onDashboard={() => navigate('/dashboard')}
    />;
  }

  // Fallback loading
  return (
    <PageTransition className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
    </PageTransition>
  );
}

// ─── Result Screen (separate component for clean animations) ──────────────────
function ResultScreen({ myScore, oppScore, iWon, isDraw, myProfile, oppProfile, quizTitle,
  isDark, cardCls, btnPrimary, btnSecondary, onPlayAgain, onDashboard }: any) {

  const myDisplayScore = useCountUp(myScore);
  const oppDisplayScore = useCountUp(oppScore);

  const resultColor = iWon
    ? (isDark ? 'text-teal-400' : 'text-yellow-500')
    : isDraw ? 'text-purple-400' : 'text-gray-400';

  const glowStyle = iWon
    ? { boxShadow: isDark ? '0 0 60px rgba(0,255,200,0.3)' : '0 0 60px rgba(234,179,8,0.3)' }
    : isDraw ? { boxShadow: '0 0 60px rgba(168,85,247,0.3)' }
    : {};

  return (
    <PageTransition className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 180 }}
        className={cn(cardCls, 'text-center')} style={glowStyle}>

        {/* Result Icon */}
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="mb-6">
          {iWon ? (
            <div className={cn('w-28 h-28 mx-auto rounded-3xl flex items-center justify-center shadow-2xl',
              isDark ? 'bg-teal-500/20 shadow-teal-500/40' : 'bg-yellow-100 shadow-yellow-500/40')}>
              <Crown className={cn('w-14 h-14', resultColor)} />
            </div>
          ) : isDraw ? (
            <div className="w-28 h-28 mx-auto rounded-3xl bg-purple-500/20 flex items-center justify-center shadow-2xl shadow-purple-500/30">
              <Shield className="w-14 h-14 text-purple-400" />
            </div>
          ) : (
            <div className="w-28 h-28 mx-auto rounded-3xl bg-gray-500/10 flex items-center justify-center shadow-xl">
              <Swords className="w-14 h-14 text-gray-400" />
            </div>
          )}
        </motion.div>

        {/* Title */}
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={cn('text-5xl font-black mb-2', isDark ? 'text-white' : 'text-gray-900')}>
          {iWon ? '🎉 You Won!' : isDraw ? '🤝 Draw!' : '😤 You Lost!'}
        </motion.h2>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className={cn('text-sm mb-10', isDark ? 'text-gray-400' : 'text-gray-600')}>
          {quizTitle}
        </motion.p>

        {/* Score Comparison */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-10 mb-10">

          {/* My score */}
          <div className="text-center">
            <div className={cn('w-16 h-16 mx-auto rounded-full flex items-center justify-center font-bold text-lg mb-2',
              isDark ? 'bg-teal-500/20 text-teal-400 border-2 border-teal-500/40' : 'bg-blue-100 text-blue-700 border-2 border-blue-300')}>
              {myProfile?.avatar_url
                ? <img src={myProfile.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                : myProfile?.username?.[0]?.toUpperCase() || 'Y'}
            </div>
            <p className={cn('text-xs font-bold uppercase tracking-widest mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>You</p>
            <motion.p className={cn('text-5xl font-black tabular-nums', iWon ? resultColor : (isDark ? 'text-white' : 'text-gray-900'))}>
              {myDisplayScore}
            </motion.p>
            {iWon && <Star className="w-5 h-5 mx-auto mt-1 text-yellow-400 fill-yellow-400" />}
          </div>

          <div className={cn('text-3xl font-black', isDark ? 'text-gray-700' : 'text-gray-300')}>VS</div>

          {/* Opponent score */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center font-bold text-lg mb-2 bg-purple-500/20 text-purple-400 border-2 border-purple-500/40">
              {oppProfile?.avatar_url
                ? <img src={oppProfile.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                : oppProfile?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <p className={cn('text-xs font-bold uppercase tracking-widest mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Opponent</p>
            <motion.p className={cn('text-5xl font-black tabular-nums', !iWon && !isDraw ? 'text-purple-400' : (isDark ? 'text-white' : 'text-gray-900'))}>
              {oppDisplayScore}
            </motion.p>
            {!iWon && !isDraw && <Star className="w-5 h-5 mx-auto mt-1 text-yellow-400 fill-yellow-400" />}
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }} className="flex flex-col sm:flex-row gap-3">
          <button onClick={onPlayAgain} className={cn(btnPrimary, 'flex-1')}>
            <Swords className="w-5 h-5" /> Play Again
          </button>
          <button onClick={onDashboard} className={cn(btnSecondary, 'flex-1')}>
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </button>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
}
