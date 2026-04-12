-- =============================================================================
-- Supabase SQL Schema for Adhyayan
-- Complete schema including Quiz Battle support
-- =============================================================================

-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  preferred_theme TEXT DEFAULT 'dark',
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Quizzes Table
CREATE TABLE quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT TRUE,          -- Visibility: public or private
  time_limit INTEGER DEFAULT 600,          -- Time limit in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quizzes are viewable by everyone." ON quizzes FOR SELECT USING (true);
CREATE POLICY "Users can create quizzes." ON quizzes FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their quizzes." ON quizzes FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their quizzes." ON quizzes FOR DELETE USING (auth.uid() = creator_id);

-- 3. Questions Table
CREATE TABLE questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  image_url TEXT,
  points INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions are viewable by everyone." ON questions FOR SELECT USING (true);
CREATE POLICY "Creators can insert questions." ON questions FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT creator_id FROM quizzes WHERE id = quiz_id)
);
CREATE POLICY "Creators can update questions." ON questions FOR UPDATE USING (
  auth.uid() IN (SELECT creator_id FROM quizzes WHERE id = quiz_id)
);
CREATE POLICY "Creators can delete questions." ON questions FOR DELETE USING (
  auth.uid() IN (SELECT creator_id FROM quizzes WHERE id = quiz_id)
);

-- 4. Options Table
CREATE TABLE options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  option_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Options are viewable by everyone." ON options FOR SELECT USING (true);
CREATE POLICY "Creators can insert options." ON options FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT qz.creator_id FROM quizzes qz
    JOIN questions q ON q.quiz_id = qz.id
    WHERE q.id = question_id
  )
);
CREATE POLICY "Creators can update options." ON options FOR UPDATE USING (
  auth.uid() IN (
    SELECT qz.creator_id FROM quizzes qz
    JOIN questions q ON q.quiz_id = qz.id
    WHERE q.id = question_id
  )
);
CREATE POLICY "Creators can delete options." ON options FOR DELETE USING (
  auth.uid() IN (
    SELECT qz.creator_id FROM quizzes qz
    JOIN questions q ON q.quiz_id = qz.id
    WHERE q.id = question_id
  )
);

-- 5. Quiz Attempts (for tracking scores)
CREATE TABLE quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  quiz_id UUID REFERENCES quizzes(id) NOT NULL,
  score INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own attempts." ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own attempts." ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Leaderboard View
DROP VIEW IF EXISTS leaderboard;
CREATE OR REPLACE VIEW leaderboard AS
WITH user_scores AS (
  SELECT 
    user_id, 
    SUM(score) as calculated_score,
    COUNT(DISTINCT quiz_id) as quizzes_attempted
  FROM quiz_attempts
  GROUP BY user_id
)
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  COALESCE(us.calculated_score, 0) as total_score,
  COALESCE(us.quizzes_attempted, 0) as quizzes_attempted,
  RANK() OVER (ORDER BY COALESCE(us.calculated_score, 0) DESC) as rank
FROM profiles p
LEFT JOIN user_scores us ON p.id = us.user_id
WHERE p.onboarding_completed = TRUE;

-- 7. Quiz Drafts Table
CREATE TABLE quiz_drafts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  category TEXT,
  time_limit INTEGER,
  questions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE quiz_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own drafts." ON quiz_drafts FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Users can insert their own drafts." ON quiz_drafts FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update their own drafts." ON quiz_drafts FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete their own drafts." ON quiz_drafts FOR DELETE USING (auth.uid() = creator_id);

-- =============================================================================
-- 8. Battle Rooms Table — Quiz Battle 1v1
-- ONE row per battle. player1 creates, player2 joins.
-- =============================================================================

-- Drop old table if migrating (careful — this deletes existing battles)
-- DROP TABLE IF EXISTS battle_rooms;

CREATE TABLE IF NOT EXISTS battle_rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT UNIQUE NOT NULL,                 -- 6-char room code, always uppercase
  quiz_id          UUID REFERENCES quizzes(id) NOT NULL,
  player1_id       UUID REFERENCES profiles(id) NOT NULL,
  player2_id       UUID REFERENCES profiles(id),         -- NULL until opponent joins
  player1_score    INTEGER DEFAULT 0,
  player2_score    INTEGER DEFAULT 0,
  player1_finished BOOLEAN DEFAULT FALSE,                -- true when player1 submits last answer
  player2_finished BOOLEAN DEFAULT FALSE,                -- true when player2 submits last answer
  current_question INTEGER DEFAULT 0,                    -- shared question index
  status           TEXT DEFAULT 'waiting'
                     CHECK (status IN ('waiting', 'active', 'finished')),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_battle_rooms_code   ON battle_rooms(code);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_status ON battle_rooms(status);

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE battle_rooms ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed to join by code)
CREATE POLICY "battle_rooms: anyone can read"
  ON battle_rooms FOR SELECT USING (true);

-- Only player1 can insert (creates the room)
CREATE POLICY "battle_rooms: player1 can insert"
  ON battle_rooms FOR INSERT
  WITH CHECK (auth.uid() = player1_id);

-- Any authenticated user can update
-- (player2 sets player2_id, both update scores/finished)
CREATE POLICY "battle_rooms: authenticated can update"
  ON battle_rooms FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Required so postgres_changes events fire for both players
ALTER TABLE battle_rooms REPLICA IDENTITY FULL;

-- =============================================================================
-- 9. Enable Supabase Realtime
-- =============================================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE battle_rooms;
COMMIT;

-- =============================================================================
-- 10. MIGRATION — run this if you already have the old schema
--     Execute in Supabase SQL Editor to update existing table:
-- =============================================================================
*/

-- =============================================================================
-- 11. Quiz Feedback Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS quiz_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE quiz_feedback ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 12. Quizzes with Stats View
-- =============================================================================
DROP VIEW IF EXISTS quizzes_with_stats;
CREATE OR REPLACE VIEW quizzes_with_stats AS
SELECT 
    q.id,
    q.creator_id,
    q.title,
    q.description,
    q.image_url,
    q.category,
    q.is_public,
    q.time_limit,
    q.created_at,
    p.username as creator_name,
    p.avatar_url as creator_avatar,
    COALESCE(AVG(f.rating), 0) as avg_rating,
    COUNT(f.id) as total_ratings
FROM quizzes q
LEFT JOIN profiles p ON q.creator_id = p.id
LEFT JOIN quiz_feedback f ON q.id = f.quiz_id
GROUP BY q.id, p.id, p.username, p.avatar_url;

-- Grant access to the view
GRANT SELECT ON quizzes_with_stats TO anon, authenticated;

