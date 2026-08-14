-- Enable public and anon access policies for Revora tables
GRANT ALL ON public.quest_sessions TO anon, authenticated;
GRANT ALL ON public.quest_attempts TO anon, authenticated;
GRANT ALL ON public.user_memory TO anon, authenticated;
GRANT ALL ON public.escalations TO anon, authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.quest_attempts_id_seq TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quest_sessions' AND policyname = 'Allow all on quest_sessions') THEN
    CREATE POLICY "Allow all on quest_sessions" ON public.quest_sessions FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quest_attempts' AND policyname = 'Allow all on quest_attempts') THEN
    CREATE POLICY "Allow all on quest_attempts" ON public.quest_attempts FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_memory' AND policyname = 'Allow all on user_memory') THEN
    CREATE POLICY "Allow all on user_memory" ON public.user_memory FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalations' AND policyname = 'Allow all on escalations') THEN
    CREATE POLICY "Allow all on escalations" ON public.escalations FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;
