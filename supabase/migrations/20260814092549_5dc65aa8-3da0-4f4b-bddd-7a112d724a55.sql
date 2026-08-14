CREATE TABLE public.quest_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  channel TEXT DEFAULT 'browser',
  outcome TEXT DEFAULT 'incomplete',
  xp_earned INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX idx_quest_sessions_user_started ON public.quest_sessions (user_id, started_at DESC);
CREATE INDEX idx_quest_sessions_open ON public.quest_sessions (user_id, ended_at);
GRANT ALL ON public.quest_sessions TO service_role;
ALTER TABLE public.quest_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quest_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT REFERENCES public.quest_sessions(session_id) ON DELETE SET NULL,
  subject TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  concept TEXT DEFAULT '',
  difficulty TEXT DEFAULT 'medium',
  correct BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 1,
  kind TEXT NOT NULL DEFAULT 'question',
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quest_attempts_user_created ON public.quest_attempts (user_id, created_at ASC);
CREATE INDEX idx_quest_attempts_session ON public.quest_attempts (session_id);
GRANT ALL ON public.quest_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.quest_attempts_id_seq TO service_role;
ALTER TABLE public.quest_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_memory (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  language_preference TEXT,
  current_level TEXT,
  topics_covered TEXT,
  common_mistakes TEXT,
  last_interaction TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_memory TO service_role;
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.escalations (
  reference_id TEXT PRIMARY KEY,
  student TEXT,
  reason TEXT,
  topic TEXT,
  tried TEXT,
  urgency TEXT NOT NULL DEFAULT 'medium',
  language_preference TEXT DEFAULT 'English',
  follow_up_method TEXT DEFAULT 'in-app message',
  phone_number TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_escalations_status_created ON public.escalations (status, created_at DESC);
GRANT ALL ON public.escalations TO service_role;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;