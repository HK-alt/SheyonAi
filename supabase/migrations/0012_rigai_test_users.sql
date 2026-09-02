-- Rename dev test accounts from sherigai.app → rigai.app and update password to RigAi-Test-2026!
-- Safe to re-run. Applies the project rebrand to the Supabase Auth test users.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  pw text := crypt('RigAi-Test-2026!', gen_salt('bf'));
  old_emails text[] := ARRAY['test-google@sherigai.app', 'test-apple@sherigai.app'];
  new_emails text[] := ARRAY['test-google@rigai.app', 'test-apple@rigai.app'];
  names text[] := ARRAY['Test Google User', 'Test Apple User'];
  providers text[] := ARRAY['google', 'apple'];
  i int;
  uid uuid;
  old_em text;
  new_em text;
BEGIN
  FOR i IN 1..2 LOOP
    old_em := old_emails[i];
    new_em := new_emails[i];

    -- Update existing sherigai.app account if present.
    SELECT id INTO uid FROM auth.users WHERE email = old_em;
    IF uid IS NOT NULL THEN
      UPDATE auth.users
      SET email = new_em, encrypted_password = pw, updated_at = now()
      WHERE id = uid;

      UPDATE auth.identities
      SET
        identity_data = identity_data || jsonb_build_object('email', new_em),
        updated_at = now()
      WHERE user_id = uid AND provider = 'email';
    END IF;

    -- Upsert rigai.app account (create if missing, or just update password).
    SELECT id INTO uid FROM auth.users WHERE email = new_em;
    IF uid IS NULL THEN
      uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', uid,
        'authenticated', 'authenticated', new_em, pw,
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
          'email', new_em,
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

      UPDATE auth.identities
      SET
        identity_data = identity_data || jsonb_build_object('email', new_em),
        updated_at = now()
      WHERE user_id = uid AND provider = 'email';
    END IF;
  END LOOP;
END $$;
