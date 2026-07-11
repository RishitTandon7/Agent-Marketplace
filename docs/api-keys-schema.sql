-- ============================================================
-- API Keys system for AgentLab Developer API
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'My API Key',
  key_prefix      TEXT NOT NULL,          -- e.g. "ahub_lv_AbCd" (first 12 chars shown)
  key_hash        TEXT NOT NULL UNIQUE,   -- SHA-256 of full key, never store plain
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_used_at    TIMESTAMPTZ,
  request_count   BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Usage logs already exist — add api_key_id column if missing
ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL;

-- 3. Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own keys
CREATE POLICY "Users can view own api_keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own keys
CREATE POLICY "Users can create api_keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own keys (e.g., rename, deactivate)
CREATE POLICY "Users can update own api_keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own keys
CREATE POLICY "Users can delete own api_keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can read all keys (needed for API auth validation)
CREATE POLICY "Service role can read all api_keys"
  ON api_keys FOR SELECT
  USING (auth.role() = 'service_role');

-- Service role can update (for last_used_at, request_count)
CREATE POLICY "Service role can update api_keys"
  ON api_keys FOR UPDATE
  USING (auth.role() = 'service_role');

-- 4. Index for fast key lookup during API auth
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys (user_id);

-- 5. Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'api_keys' ORDER BY ordinal_position;
