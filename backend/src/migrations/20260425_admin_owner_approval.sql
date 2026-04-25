BEGIN;

-- 1) Add admin role (Postgres enum update)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'admin') THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
END$$;

-- 2) Account management / approval flags
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS owner_approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone;

-- If there are existing owner rows, mark them approved by default
UPDATE users
SET owner_approved = true
WHERE role = 'owner' AND owner_approved IS DISTINCT FROM true;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_locked ON users(is_locked);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

COMMIT;

