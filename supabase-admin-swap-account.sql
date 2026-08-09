-- ═══════════════════════════════════════════════════════════════
-- Swap the admin account to janati.shima@gmail.com
-- Run in Supabase SQL Editor
--
-- IMPORTANT: sign up for a real account at janati.shima@gmail.com
-- through the normal /signup page FIRST (any role — "User" is fine,
-- this account's only real purpose is admin access). This UPDATE is
-- a no-op if that profile row doesn't exist yet.
-- ═══════════════════════════════════════════════════════════════

UPDATE profiles SET is_admin = true  WHERE email = 'janati.shima@gmail.com';
UPDATE profiles SET is_admin = false WHERE email = 'shima.1110@gmail.com';

-- Sanity check — janati.shima@gmail.com should show true, shima.1110@gmail.com should show false.
SELECT id, email, is_admin FROM profiles WHERE email IN ('janati.shima@gmail.com', 'shima.1110@gmail.com');
