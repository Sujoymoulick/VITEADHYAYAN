-- Supabase SQL Schema for Adhyayan

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
  time_limit INTEGER DEFAULT 600, -- Time limit in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quizzes are viewable by everyone." ON quizzes FOR SELECT USING (true);
CREATE POLICY "Users can create quizzes." ON quizzes FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their quizzes." ON quizzes FOR UPDATE USING (auth.uid() = creator_id);

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
