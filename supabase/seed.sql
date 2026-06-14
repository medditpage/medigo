-- ============================================================
-- MediGo Seed Data
-- ============================================================

-- ============================================================
-- 1. DEFAULT DELIVERY CHARGE RULES (slabs)
-- ============================================================

INSERT INTO delivery_charge_rules (min_distance_km, max_distance_km, charge, is_active)
VALUES
  (0,   2,   20.00, TRUE),
  (2,   5,   35.00, TRUE),
  (5,   8,   50.00, TRUE),
  (8,   12,  70.00, TRUE),
  (12,  999, 90.00, TRUE);

-- ============================================================
-- 2. DEFAULT APP SETTINGS
-- ============================================================

INSERT INTO app_settings (key, value, description)
VALUES
  ('base_charge', '10', 'Flat base delivery charge applied to every order (INR)'),
  ('platform_charge', '2', 'Flat platform/service charge applied to every order (INR)'),
  ('urgent_charge', '25', 'Additional charge for urgent orders (INR)'),
  ('tax_percent', '0', 'Tax percentage applied to medicine cost (set to 0 if not applicable)'),
  ('assignment_timeout_seconds', '90', 'Seconds an agent has to accept a broadcasted order before it expires'),
  ('max_broadcast_agents', '5', 'Number of nearest agents an order is broadcast to simultaneously'),
  ('support_phone', '+91-9000000000', 'Support contact number shown to patients'),
  ('support_email', 'support@medigo.in', 'Support contact email shown to patients'),
  ('app_name', 'MediGo', 'Application display name');

-- ============================================================
-- 3. ADMIN USER
-- Note: This inserts directly into auth.users + public.users.
-- In production, create the admin via Supabase Dashboard
-- (Authentication > Add User) and then update the role below,
-- OR run this script which creates a fully working admin login.
--
-- Email:    admin@medigo.in
-- Password: Admin@12345
-- ============================================================

DO $$
DECLARE
  v_admin_id UUID := uuid_generate_v4();
BEGIN
  -- Insert into Supabase auth.users with a pre-hashed password
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@medigo.in',
    crypt('Admin@12345', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin","full_name":"MediGo Admin","mobile":"9000000001"}',
    now(),
    now(),
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING;

  -- Ensure public.users row exists with admin role
  -- (the on_auth_user_created trigger should have inserted it,
  -- but we explicitly set role = admin in case of conflicts)
  UPDATE public.users
  SET role = 'admin', full_name = 'MediGo Admin', mobile = '9000000001'
  WHERE email = 'admin@medigo.in';

  -- If for some reason the trigger did not fire, insert manually
  INSERT INTO public.users (id, role, full_name, mobile, email, language)
  SELECT v_admin_id, 'admin', 'MediGo Admin', '9000000001', 'admin@medigo.in', 'en'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'admin@medigo.in'
  );
END $$;

-- ============================================================
-- 4. DEMO MEDICAL STORES (Prayagraj, UP - real coordinates)
-- ============================================================

INSERT INTO medical_stores (
  name, owner_name, phone, address_line, city, state, pincode,
  latitude, longitude, license_number, is_active, opens_at, closes_at
) VALUES
(
  'Sangam Medical Store',
  'Ramesh Kumar Gupta',
  '9415012345',
  'Civil Lines, near Lal Bahadur Shastri Marg',
  'Prayagraj',
  'Uttar Pradesh',
  '211001',
  25.4530,
  81.8460,
  'UP-DL-2019-001234',
  TRUE,
  '08:00',
  '22:00'
),
(
  'Apna Pharmacy',
  'Sunita Devi Sharma',
  '9415023456',
  'Katra Bazar, near Allahabad University',
  'Prayagraj',
  'Uttar Pradesh',
  '211002',
  25.4710,
  81.8460,
  'UP-DL-2018-005678',
  TRUE,
  '07:30',
  '23:00'
),
(
  'Triveni Health Care Pharmacy',
  'Anil Kumar Tiwari',
  '9415034567',
  'Johnstonganj, near Rambagh Railway Crossing',
  'Prayagraj',
  'Uttar Pradesh',
  '211003',
  25.4380,
  81.8290,
  'UP-DL-2020-009876',
  TRUE,
  '08:00',
  '21:30'
);