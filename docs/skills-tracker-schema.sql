-- DESIGN ONLY: not executed by the application and not a migration.
-- PostgreSQL draft. Auth provider integration and access policies are future work.
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  display_name text,
  time_zone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE skills (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(60) NOT NULL CHECK (length(trim(name)) > 0),
  slot smallint NOT NULL CHECK (slot BETWEEN 0 AND 5),
  color varchar(7) NOT NULL CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, id),
  UNIQUE (user_id, slot)
);
CREATE UNIQUE INDEX skills_unique_name ON skills (user_id, lower(trim(name)));

-- Serialize inserts for the same owner before enforcing the six-skill cap.
CREATE FUNCTION limit_skills() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM users WHERE id = NEW.user_id FOR UPDATE;
  IF (SELECT count(*) FROM skills WHERE user_id = NEW.user_id AND id <> NEW.id) >= 6 THEN
    RAISE EXCEPTION 'A learner can have at most six skills';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER enforce_skill_limit BEFORE INSERT OR UPDATE OF user_id ON skills
  FOR EACH ROW EXECUTE FUNCTION limit_skills();

-- Optional learning links: zero or many resources per skill.
CREATE TABLE skill_resources (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL,
  name varchar(100) NOT NULL CHECK (length(trim(name)) > 0),
  url varchar(2048) NOT NULL CHECK (url ~ '^https?://'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, skill_id) REFERENCES skills(user_id, id) ON DELETE CASCADE,
  UNIQUE (user_id, skill_id, url)
);
-- The future server must also parse/validate URLs before saving.

CREATE TABLE timer_runs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL,
  planned_minutes integer NOT NULL CHECK (planned_minutes BETWEEN 1 AND 1440),
  started_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  time_zone text NOT NULL,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  status text NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  FOREIGN KEY (user_id, skill_id) REFERENCES skills(user_id, id),
  CHECK (ends_at = started_at + planned_minutes * interval '1 minute'),
  UNIQUE (user_id, skill_id, id)
);
CREATE UNIQUE INDEX one_active_timer_per_user ON timer_runs (user_id) WHERE status = 'active';

CREATE TABLE learning_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 60 AND 86400),
  activity_date date NOT NULL,
  time_zone text NOT NULL,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  source text NOT NULL CHECK (source IN ('recorded', 'timer')),
  timer_run_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, skill_id) REFERENCES skills(user_id, id),
  FOREIGN KEY (user_id, skill_id, timer_run_id) REFERENCES timer_runs(user_id, skill_id, id),
  CHECK ((source = 'timer' AND timer_run_id IS NOT NULL) OR
         (source = 'recorded' AND timer_run_id IS NULL))
);
CREATE INDEX sessions_by_user_date ON learning_sessions(user_id, activity_date DESC);
CREATE INDEX sessions_by_skill ON learning_sessions(user_id, skill_id);

CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sync_reminder_dismissed_at timestamptz
);

-- Example derived total: no cached progress/streak columns to get out of sync.
-- SELECT skill_id, sum(duration_seconds) FROM learning_sessions
-- WHERE user_id = :authenticated_user_id GROUP BY skill_id;
