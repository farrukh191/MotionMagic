-- Run ONCE in the Supabase SQL editor after `npx prisma db push`.
-- Supabase exposes every table in the public schema through its REST API to the public "anon" key.
-- MotionMagic never uses that API: the server talks to Postgres directly (Prisma, as the postgres role, which bypasses RLS).
-- Enabling Row Level Security with NO policies means the anon/authenticated keys can read and write NOTHING.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- Private bucket for GIFs (no public access; files are only released through signed links from the app).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('motionmagic', 'motionmagic', false, 10485760)
ON CONFLICT (id) DO UPDATE SET public = false;
