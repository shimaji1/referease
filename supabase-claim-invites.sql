-- ═══════════════════════════════════════════════════════════════
-- Claim invites — let admin directly hand someone ownership of a
-- listing without the fax/email verification flow, for people
-- personally known/vouched for.
-- Run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS claim_invites (
  id BIGSERIAL PRIMARY KEY,
  provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invite_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  invited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- 100% service-role access (/api/claim/invite, /api/claim/accept) — invite_token is a
-- bearer secret checked before the invitee has any session, same reasoning as
-- provider_staff invites. No anon policies at all, matching verification_codes.
ALTER TABLE claim_invites ENABLE ROW LEVEL SECURITY;
