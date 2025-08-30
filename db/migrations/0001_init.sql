-- Schema: initial boards/threads/posts + deleted_posts

CREATE TABLE IF NOT EXISTS schema_migrations (
  id bigserial PRIMARY KEY,
  filename text NOT NULL UNIQUE,
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS boards (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS threads (
  id bigserial PRIMARY KEY,
  board_id int NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  is_sticky boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_posted_at timestamptz
);

CREATE INDEX IF NOT EXISTS threads_board_sort_idx
  ON threads (board_id, is_sticky DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS posts (
  id bigserial PRIMARY KEY,
  thread_id bigint NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_name text,
  author_hash char(16) NOT NULL,
  tripcode text,
  content text NOT NULL,
  reply_to bigint REFERENCES posts(id) ON DELETE SET NULL,
  ip_hash char(64) NOT NULL,
  delete_key_hash char(64),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_thread_created_idx
  ON posts (thread_id, created_at ASC);

-- Archive table for self-delete
CREATE TABLE IF NOT EXISTS deleted_posts (
  id bigint PRIMARY KEY,
  thread_id bigint NOT NULL,
  author_name text,
  author_hash char(16) NOT NULL,
  tripcode text,
  content text NOT NULL,
  reply_to bigint,
  ip_hash char(64) NOT NULL,
  delete_key_hash char(64),
  created_at timestamptz NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to keep updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_threads_set_updated ON threads;
CREATE TRIGGER trg_threads_set_updated
BEFORE UPDATE ON threads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- When inserting a post, update thread timestamps
CREATE OR REPLACE FUNCTION touch_thread_on_post()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads SET updated_at = now(), last_posted_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_touch_thread ON posts;
CREATE TRIGGER trg_posts_touch_thread
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION touch_thread_on_post();

