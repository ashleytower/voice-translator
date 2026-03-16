-- VAPI Call Persistence
CREATE TABLE IF NOT EXISTS vapi_calls (
  id uuid PRIMARY KEY, -- This will be the VAPI call ID
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript jsonb DEFAULT '[]',
  pending_decision jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE vapi_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own vapi_calls"
  ON vapi_calls FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update as it's from webhook
