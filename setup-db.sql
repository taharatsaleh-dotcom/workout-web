-- Run this in Supabase SQL Editor after creating your project

CREATE TABLE IF NOT EXISTS sync_data (
  username text NOT NULL,
  key      text NOT NULL,
  value    text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (username, key)
);

-- Allow the anon key to read/write (no auth needed, username acts as the gate)
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON sync_data FOR ALL USING (true) WITH CHECK (true);
