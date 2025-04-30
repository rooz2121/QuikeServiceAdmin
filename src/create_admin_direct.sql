-- Direct Admin User Creation Script
-- This script directly creates an admin user in both auth.users and public.user tables
-- Run this in the Supabase SQL Editor if the web interface is having issues
-- You'll need to manually update the password and login after running this script

-- Configuration (modify these values)
DO $$
DECLARE
  admin_email VARCHAR := 'admin@gmail.com';
  admin_name VARCHAR := 'Admin User';
  admin_password VARCHAR := 'admin123'; -- This should be a secure password
  admin_id UUID;
BEGIN
  -- Generate a UUID for the user
  admin_id := gen_random_uuid();

  -- 1. Insert into auth.users table
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    raw_user_meta_data,
    role,
    aud,
    created_at
  ) VALUES (
    admin_id,
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    NOW(),
    '',
    '',
    jsonb_build_object('role', 'admin', 'name', admin_name),
    'admin',
    'authenticated',
    NOW()
  );

  -- 2. Insert into public.user table
  INSERT INTO public.user (
    id,
    name,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    admin_id,
    admin_name,
    admin_email,
    'admin',
    NOW(),
    NOW()
  );

  -- 3. Output result
  RAISE NOTICE 'Admin user created with ID: %', admin_id;
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Name: %', admin_name;
  RAISE NOTICE 'Password: %', admin_password;
  RAISE NOTICE 'Please log in with these credentials.';
END $$; 