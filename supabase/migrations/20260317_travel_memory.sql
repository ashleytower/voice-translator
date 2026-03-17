-- Travel Memory Phase 1: geo columns, subscriptions, preferences
-- 2026-03-17

-- Add columns to memory_nodes for cross-city queries
ALTER TABLE memory_nodes
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS photo_path text;

CREATE INDEX IF NOT EXISTS idx_memory_nodes_city ON memory_nodes(user_id, city);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_geo ON memory_nodes(user_id, lat, lng) WHERE lat IS NOT NULL;

-- user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
  started_at timestamptz,
  expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE intentionally omitted: subscription rows are managed
-- exclusively by the server-side Stripe webhook handler.

-- user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  sample_count int NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_score ON user_preferences(user_id, score DESC);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
