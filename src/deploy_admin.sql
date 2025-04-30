-- Quike Admin Panel - Admin User Creation Script
-- Run this script in the Supabase SQL Editor after applying the RLS policies

-- IMPORTANT: If you encounter any errors, make sure:
-- 1. You have first run the rls_policies.sql script which creates the create_admin_user function
-- 2. Your user table has the necessary columns (id, name, email, role)
-- 3. You have proper permissions to create users in auth.users

-- Create an admin user
SELECT create_admin_user(
  'admin@quike.com',          -- Email (change as needed)
  'admin123',                 -- Password (change this to a secure password)
  'Admin User'                -- Name
);

-- Verify the admin user was created
SELECT id, email, name 
FROM public.user 
WHERE email = 'admin@quike.com';

-- Optionally, you can check if the admin role was assigned in auth.users
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email = 'admin@quike.com'; 