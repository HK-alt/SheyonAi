-- Ensure SherigAi dev test accounts exist and are confirmed so password sign-in works.
-- Safe to re-run. Prefer this over repeated client signUp (avoids email rate limits).
--
-- Run in Supabase SQL Editor if Test sign-in fails, or apply via MCP/CLI.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  pw text := crypt('RigAi-Test-2026!', gen_salt('bf'));
  emails text[] := ARRAY['test-google@rigai.app', 'test-apple@rigai.app'];
  names text[] := ARRAY['Test Google User', 'Test Apple User'];
  providers text[] := ARRAY['google', 'apple'];
  i int;
  uid uuid;
  em text;
BEGIN
  FOR i IN 1..2 LOOP
    em := emails[i];
    SELECT id INTO uid FROM auth.users WHERE email = em;

    IF uid IS NULL THEN
      uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', uid,
        'authenticated', 'authenticated', em, pw,
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', names[i], 'provider', providers[i]),
        now(), now(), '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), uid,
        jsonb_build_object(
          'sub', uid::text,
          'email', em,
          'email_verified', true,
          'phone_verified', false
        ),
        'email', uid::text,
        now(), now(), now()
      );
    ELSE
      UPDATE auth.users
      SET
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        encrypted_password = pw,
        updated_at = now()
      WHERE id = uid;

      IF NOT EXISTS (
        SELECT 1 FROM auth.identities WHERE user_id = uid AND provider = 'email'
      ) THEN
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id,
          last_sign_in_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), uid,
          jsonb_build_object(
            'sub', uid::text,
            'email', em,
            'email_verified', true,
            'phone_verified', false
          ),
          'email', uid::text,
          now(), now(), now()
        );
      END IF;
    END IF;
  END LOOP;
END $$;
