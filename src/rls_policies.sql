-- Quike Admin Panel - Row Level Security (RLS) Policies
-- This file contains all the necessary RLS policies for the admin panel functionality

-- Ensure the role column exists in the public.user table
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS role VARCHAR(50);

-- Create a role field in the auth.users raw_user_meta_data to store user roles
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS role VARCHAR(50);

-- First, we need to create a function to check if the user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (raw_user_meta_data->>'role')::TEXT = 'admin' 
    FROM auth.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing admin policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Admins can view all user data" ON "public"."user";
DROP POLICY IF EXISTS "Admins can update user data" ON "public"."user";
DROP POLICY IF EXISTS "Admins can view all worker data" ON "public"."worker";
DROP POLICY IF EXISTS "Admins can update worker data" ON "public"."worker";
DROP POLICY IF EXISTS "Admins can view all booking data" ON "public"."bookings";
DROP POLICY IF EXISTS "Admins can update booking data" ON "public"."bookings";
DROP POLICY IF EXISTS "Admins can view all booking requests" ON "public"."booking_requests";
DROP POLICY IF EXISTS "Admins can update booking requests" ON "public"."booking_requests";
DROP POLICY IF EXISTS "Admins can view all notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Admins can create notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Admins can update notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Admins can view all worker notifications" ON "public"."worker_notifications";
DROP POLICY IF EXISTS "Admins can create worker notifications" ON "public"."worker_notifications";
DROP POLICY IF EXISTS "Admins can update worker notifications" ON "public"."worker_notifications";
DROP POLICY IF EXISTS "Admins can view all booking completion OTPs" ON "public"."booking_completion_otps";
DROP POLICY IF EXISTS "Admins can update booking completion OTPs" ON "public"."booking_completion_otps";

-- Allow admins to view all user data
CREATE POLICY "Admins can view all user data" ON "public"."user"
FOR SELECT USING (is_admin());

-- Allow admins to update user data
CREATE POLICY "Admins can update user data" ON "public"."user"
FOR UPDATE USING (is_admin());

-- Allow admins to view all worker data
CREATE POLICY "Admins can view all worker data" ON "public"."worker"
FOR SELECT USING (is_admin());

-- Allow admins to update worker data (including verification)
CREATE POLICY "Admins can update worker data" ON "public"."worker"
FOR UPDATE USING (is_admin());

-- Allow admins to view all booking data
CREATE POLICY "Admins can view all booking data" ON "public"."bookings"
FOR SELECT USING (is_admin());

-- Allow admins to update booking data
CREATE POLICY "Admins can update booking data" ON "public"."bookings"
FOR UPDATE USING (is_admin());

-- Allow admins to view all booking requests
CREATE POLICY "Admins can view all booking requests" ON "public"."booking_requests"
FOR SELECT USING (is_admin());

-- Allow admins to update booking requests
CREATE POLICY "Admins can update booking requests" ON "public"."booking_requests"
FOR UPDATE USING (is_admin());

-- Allow admins to view all notifications
CREATE POLICY "Admins can view all notifications" ON "public"."notifications"
FOR SELECT USING (is_admin());

-- Allow admins to create notifications
CREATE POLICY "Admins can create notifications" ON "public"."notifications"
FOR INSERT WITH CHECK (is_admin());

-- Allow admins to update notifications
CREATE POLICY "Admins can update notifications" ON "public"."notifications"
FOR UPDATE USING (is_admin());

-- Allow admins to view all worker notifications
CREATE POLICY "Admins can view all worker notifications" ON "public"."worker_notifications"
FOR SELECT USING (is_admin());

-- Allow admins to create worker notifications (for verification messages)
CREATE POLICY "Admins can create worker notifications" ON "public"."worker_notifications"
FOR INSERT WITH CHECK (is_admin());

-- Allow admins to update worker notifications
CREATE POLICY "Admins can update worker notifications" ON "public"."worker_notifications"
FOR UPDATE USING (is_admin());

-- Allow admins to view all booking completion OTPs
CREATE POLICY "Admins can view all booking completion OTPs" ON "public"."booking_completion_otps"
FOR SELECT USING (is_admin());

-- Allow admins to update booking completion OTPs
CREATE POLICY "Admins can update booking completion OTPs" ON "public"."booking_completion_otps"
FOR UPDATE USING (is_admin());

-- Create a view for dashboard statistics with security barrier and check
-- Note: We use SECURITY INVOKER to inherit the RLS policies of the underlying tables
DROP VIEW IF EXISTS public.admin_dashboard_stats;
CREATE OR REPLACE VIEW public.admin_dashboard_stats WITH (security_barrier=true) AS
SELECT
    (SELECT COUNT(*) FROM public.user WHERE is_admin()) AS total_users,
    (SELECT COUNT(*) FROM public.worker WHERE is_admin()) AS total_workers,
    (SELECT COUNT(*) FROM public.worker WHERE is_verified = false AND is_admin()) AS pending_verifications,
    (SELECT COUNT(*) FROM public.bookings WHERE is_admin()) AS total_bookings,
    (SELECT COUNT(*) FROM public.bookings WHERE status = 'completed' AND is_admin()) AS completed_bookings,
    (SELECT COUNT(*) FROM public.bookings WHERE status = 'pending' AND is_admin()) AS pending_bookings,
    (SELECT COUNT(*) FROM public.bookings WHERE status = 'cancelled' AND is_admin()) AS cancelled_bookings;

-- Alternative: Use a function instead of view for dashboard stats
DROP FUNCTION IF EXISTS get_admin_dashboard_stats();
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE(
    total_users BIGINT,
    total_workers BIGINT,
    pending_verifications BIGINT,
    total_bookings BIGINT,
    completed_bookings BIGINT,
    pending_bookings BIGINT,
    cancelled_bookings BIGINT
) AS $$
DECLARE
    is_admin_user BOOLEAN;
BEGIN
    -- Check if the user is an admin
    SELECT (
        SELECT (raw_user_meta_data->>'role')::TEXT = 'admin' 
        FROM auth.users 
        WHERE id = auth.uid()
    ) INTO is_admin_user;
    
    -- Only continue if user is admin
    IF NOT is_admin_user THEN
        RAISE EXCEPTION 'Access denied: requires admin privileges';
    END IF;
    
    -- Use security definer to bypass RLS
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::BIGINT FROM public.user) AS total_users,
        (SELECT COUNT(*)::BIGINT FROM public.worker) AS total_workers,
        (SELECT COUNT(*)::BIGINT FROM public.worker WHERE is_verified = false) AS pending_verifications,
        (SELECT COUNT(*)::BIGINT FROM public.bookings) AS total_bookings,
        (SELECT COUNT(*)::BIGINT FROM public.bookings WHERE status = 'completed') AS completed_bookings,
        (SELECT COUNT(*)::BIGINT FROM public.bookings WHERE status = 'pending') AS pending_bookings,
        (SELECT COUNT(*)::BIGINT FROM public.bookings WHERE status = 'cancelled') AS cancelled_bookings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Worker verification procedure (for audit purposes)
DROP FUNCTION IF EXISTS verify_worker(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION verify_worker(worker_id UUID, admin_id UUID, verification_note TEXT)
RETURNS VOID AS $$
BEGIN
    -- Update the worker record
    UPDATE public.worker
    SET 
        is_verified = true,
        verification_date = NOW()
    WHERE id = worker_id;
    
    -- Insert a record into worker notifications
    INSERT INTO public.worker_notifications (
        worker_id,
        type,
        message,
        is_read
    ) VALUES (
        worker_id,
        'verification_approved',
        'Your account has been verified. You can now receive booking requests.',
        false
    );
    
    -- Optionally log this action to an audit table if you create one
    -- INSERT INTO admin_audit_log (admin_id, action, table_name, record_id, note)
    -- VALUES (admin_id, 'worker_verification', 'worker', worker_id, verification_note);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Worker rejection procedure
DROP FUNCTION IF EXISTS reject_worker(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION reject_worker(worker_id UUID, admin_id UUID, rejection_note TEXT)
RETURNS VOID AS $$
BEGIN
    -- Insert a record into worker notifications
    INSERT INTO public.worker_notifications (
        worker_id,
        type,
        message,
        is_read
    ) VALUES (
        worker_id,
        'verification_rejected',
        'Your account verification was rejected. Reason: ' || rejection_note,
        false
    );
    
    -- Optionally log this action to an audit table if you create one
    -- INSERT INTO admin_audit_log (admin_id, action, table_name, record_id, note)
    -- VALUES (admin_id, 'worker_rejection', 'worker', worker_id, rejection_note);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create an admin user (to be executed by superuser)
DROP FUNCTION IF EXISTS create_admin_user(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION create_admin_user(email TEXT, password TEXT, name TEXT)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Generate a UUID for the user
  user_id := gen_random_uuid();
  
  -- Create the user in auth.users with admin role
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    instance_id,
    aud,
    confirmation_token,
    recovery_token,
    is_super_admin,
    is_sso_user
  ) VALUES (
    user_id,
    email,
    crypt(password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('role', 'admin', 'name', name),
    'admin',
    '00000000-0000-0000-0000-000000000000', -- default instance_id
    'authenticated',                        -- authenticated audience
    '',                                     -- empty confirmation token
    '',                                     -- empty recovery token
    FALSE,                                 -- not a super admin
    FALSE                                  -- not an SSO user
  );
  
  -- Create user profile in public.user table
  INSERT INTO public.user (
    id,
    name,
    email,
    role
  ) VALUES (
    user_id,
    name,
    email,
    'admin'
  );
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instructions for setting up an admin user:
-- SELECT create_admin_user('admin@quike.com', 'secure-password', 'Admin User'); 