-- Identity & Memory Layer for Found in Translation
-- Phase 2: traveler_profiles + memory_nodes with RLS

-- Traveler profile
CREATE TABLE IF NOT EXISTS traveler_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  languages text[] DEFAULT ARRAY['en'],
  travel_style text DEFAULT 'balanced'
    CHECK (travel_style IN ('budget', 'balanced', 'luxury')),
  dietary text[] DEFAULT ARRAY[]::text[],
  home_currency text DEFAULT 'CAD',
  onboarded_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Memory nodes
CREATE TABLE IF NOT EXISTS memory_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('place', 'preference', 'expense', 'dish', 'phrase', 'event')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_nodes_user ON memory_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_type ON memory_nodes(user_id, type);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_created ON memory_nodes(user_id, created_at DESC);

-- RLS: traveler_profiles
ALTER TABLE traveler_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON traveler_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile"
  ON traveler_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON traveler_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS: memory_nodes
ALTER TABLE memory_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own memories"
  ON memory_nodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own memories"
  ON memory_nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own memories"
  ON memory_nodes FOR DELETE
  USING (auth.uid() = user_id);
