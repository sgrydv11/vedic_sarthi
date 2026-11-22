CREATE TABLE IF NOT EXISTS ritual_events(id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('pooja','chadhava')), service TEXT NOT NULL, temple TEXT NOT NULL, day TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)));
CREATE INDEX IF NOT EXISTS ritual_event_day ON ritual_events(active,day);
