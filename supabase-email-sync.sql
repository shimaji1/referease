-- ═══════════════════════════════════════════════════════════════
-- Keep profiles.email in sync with auth.users.email
-- Run in Supabase SQL Editor
--
-- profiles.email is a denormalized copy (used for display, billing
-- emails, etc.) set once at signup. Once self-service email change is
-- enabled in Settings, auth.users.email can change independently —
-- this trigger keeps profiles.email matching it automatically,
-- regardless of what path actually changed it.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_profile_email();
