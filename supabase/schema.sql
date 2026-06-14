-- ============================================================
-- MediGo Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('patient', 'agent', 'admin');

CREATE TYPE agent_status AS ENUM ('pending', 'approved', 'rejected', 'banned');

CREATE TYPE order_status AS ENUM (
  'pending',
  'assigned',
  'accepted',
  'purchasing',
  'bill_uploaded',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'expired'
);

CREATE TYPE payment_status AS ENUM ('pending', 'paid');

CREATE TYPE complaint_category AS ENUM (
  'wrong_medicine',
  'missing_medicine',
  'damaged_product',
  'late_delivery',
  'overcharging',
  'other'
);

CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved');

CREATE TYPE payout_status AS ENUM ('pending', 'paid');

CREATE TYPE notification_type AS ENUM (
  'registration',
  'order_placed',
  'order_accepted',
  'bill_generated',
  'out_for_delivery',
  'delivered',
  'complaint',
  'general'
);

CREATE TYPE order_method AS ENUM ('prescription', 'manual');

CREATE TYPE assignment_status AS ENUM ('broadcast', 'accepted', 'expired', 'rejected');

-- ============================================================
-- TABLE: users
-- Mirrors Supabase auth.users (1:1 via trigger)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- matches auth.users.id
  role user_role NOT NULL DEFAULT 'patient',
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi')),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_mobile ON users(mobile);

-- ============================================================
-- TABLE: addresses
-- ============================================================

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'home',
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOGRAPHY(Point, 4326),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_location ON addresses USING GIST(location);

-- ============================================================
-- TABLE: family_members
-- ============================================================

CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('father', 'mother', 'child', 'grandparent', 'spouse', 'sibling', 'other')),
  age INTEGER,
  mobile TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_members_user_id ON family_members(user_id);

-- ============================================================
-- TABLE: delivery_agents
-- ============================================================

CREATE TABLE delivery_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  aadhaar_number TEXT NOT NULL UNIQUE,
  aadhaar_image_url TEXT NOT NULL,
  profile_photo_url TEXT,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('bicycle', 'motorcycle', 'scooter', 'car', 'van')),
  vehicle_number TEXT NOT NULL,
  status agent_status NOT NULL DEFAULT 'pending',
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  current_location GEOGRAPHY(Point, 4326),
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_agents_status ON delivery_agents(status);
CREATE INDEX idx_delivery_agents_online ON delivery_agents(is_online);
CREATE INDEX idx_delivery_agents_location ON delivery_agents USING GIST(current_location);

-- ============================================================
-- TABLE: medical_stores
-- ============================================================

CREATE TABLE medical_stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  license_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  opens_at TIME,
  closes_at TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_stores_active ON medical_stores(is_active);
CREATE INDEX idx_medical_stores_location ON medical_stores USING GIST(location);

-- ============================================================
-- TABLE: delivery_charge_rules
-- ============================================================

CREATE TABLE delivery_charge_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  min_distance_km NUMERIC(6,2) NOT NULL,
  max_distance_km NUMERIC(6,2) NOT NULL,
  charge NUMERIC(8,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_charge_rules_active ON delivery_charge_rules(is_active);

-- ============================================================
-- TABLE: app_settings
-- ============================================================

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: orders
-- ============================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  store_id UUID REFERENCES medical_stores(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES delivery_agents(id) ON DELETE SET NULL,
  address_id UUID NOT NULL REFERENCES addresses(id),

  order_method order_method NOT NULL,
  prescription_image_urls TEXT[],
  notes TEXT,

  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,

  delivery_latitude DOUBLE PRECISION NOT NULL,
  delivery_longitude DOUBLE PRECISION NOT NULL,
  delivery_location GEOGRAPHY(Point, 4326) NOT NULL,

  distance_km NUMERIC(8,2),

  status order_status NOT NULL DEFAULT 'pending',
  payment_status payment_status NOT NULL DEFAULT 'pending',

  medicine_cost NUMERIC(10,2),
  delivery_charge NUMERIC(10,2),
  base_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  urgent_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2),

  bill_image_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_patient_id ON orders(patient_id);
CREATE INDEX idx_orders_agent_id ON orders(agent_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_delivery_location ON orders USING GIST(delivery_location);

-- ============================================================
-- TABLE: order_items
-- ============================================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2),
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- TABLE: order_assignments
-- Broadcast to nearest 5 agents, first-accept wins
-- ============================================================

CREATE TABLE order_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES delivery_agents(id) ON DELETE CASCADE,
  status assignment_status NOT NULL DEFAULT 'broadcast',
  distance_km NUMERIC(8,2),
  broadcast_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 seconds'),
  UNIQUE(order_id, agent_id)
);

CREATE INDEX idx_order_assignments_order_id ON order_assignments(order_id);
CREATE INDEX idx_order_assignments_agent_id ON order_assignments(agent_id);
CREATE INDEX idx_order_assignments_status ON order_assignments(status);

-- ============================================================
-- TABLE: order_status_history
-- ============================================================

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  actor_id UUID REFERENCES users(id),
  actor_role user_role,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

-- ============================================================
-- TABLE: invoices
-- ============================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  medicine_cost NUMERIC(10,2) NOT NULL,
  delivery_charge NUMERIC(10,2) NOT NULL,
  base_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  urgent_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  pdf_url TEXT,
  html_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_order_id ON invoices(order_id);

-- ============================================================
-- TABLE: order_ratings
-- ============================================================

CREATE TABLE order_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES delivery_agents(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_ratings_agent_id ON order_ratings(agent_id);

-- ============================================================
-- TABLE: complaints
-- ============================================================

CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category complaint_category NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status complaint_status NOT NULL DEFAULT 'open',
  admin_response TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaints_user_id ON complaints(user_id);
CREATE INDEX idx_complaints_status ON complaints(status);

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================
-- TABLE: email_logs
-- ============================================================

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  notification_type notification_type,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);

-- ============================================================
-- TABLE: agent_earnings
-- ============================================================

CREATE TABLE agent_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES delivery_agents(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payout_status payout_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_earnings_agent_id ON agent_earnings(agent_id);
CREATE INDEX idx_agent_earnings_payout_status ON agent_earnings(payout_status);

-- ============================================================
-- TABLE: daily_metrics
-- ============================================================

CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL UNIQUE,
  total_orders INTEGER NOT NULL DEFAULT 0,
  delivered_orders INTEGER NOT NULL DEFAULT 0,
  cancelled_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_charges_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_charges_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
  new_patients INTEGER NOT NULL DEFAULT 0,
  new_agents INTEGER NOT NULL DEFAULT 0,
  active_agents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_daily_metrics_date ON daily_metrics(metric_date);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role user_role,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_delivery_agents_updated_at BEFORE UPDATE ON delivery_agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_medical_stores_updated_at BEFORE UPDATE ON medical_stores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_complaints_updated_at BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_delivery_charge_rules_updated_at BEFORE UPDATE ON delivery_charge_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_daily_metrics_updated_at BEFORE UPDATE ON daily_metrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: location sync (lat/lng -> geography)
-- ============================================================

CREATE OR REPLACE FUNCTION sync_address_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_addresses_location BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION sync_address_location();

CREATE OR REPLACE FUNCTION sync_store_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_medical_stores_location BEFORE INSERT OR UPDATE ON medical_stores
  FOR EACH ROW EXECUTE FUNCTION sync_store_location();

CREATE OR REPLACE FUNCTION sync_agent_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_latitude IS NOT NULL AND NEW.current_longitude IS NOT NULL THEN
    NEW.current_location = ST_SetSRID(ST_MakePoint(NEW.current_longitude, NEW.current_latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_delivery_agents_location BEFORE INSERT OR UPDATE ON delivery_agents
  FOR EACH ROW EXECUTE FUNCTION sync_agent_location();

CREATE OR REPLACE FUNCTION sync_order_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.delivery_location = ST_SetSRID(ST_MakePoint(NEW.delivery_longitude, NEW.delivery_latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_location BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_order_location();

-- ============================================================
-- TRIGGER: auto-insert into users on new Supabase Auth user
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, full_name, mobile, email, language)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================
-- TRIGGER: log order status changes
-- ============================================================

CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO order_status_history (order_id, status, note)
    VALUES (NEW.id, NEW.status, 'Status changed to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_status_history
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- ============================================================
-- FUNCTION: get_nearest_stores(lat, lng, radius_km)
-- ============================================================

CREATE OR REPLACE FUNCTION get_nearest_stores(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  address_line TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km NUMERIC,
  opens_at TIME,
  closes_at TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id,
    ms.name,
    ms.phone,
    ms.address_line,
    ms.city,
    ms.state,
    ms.pincode,
    ms.latitude,
    ms.longitude,
    ROUND((ST_Distance(
      ms.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000)::numeric, 2) AS distance_km,
    ms.opens_at,
    ms.closes_at
  FROM medical_stores ms
  WHERE ms.is_active = TRUE
    AND ST_DWithin(
      ms.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY ms.location <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCTION: get_nearest_agents(lat, lng, radius_km)
-- Returns online + approved + not-banned agents sorted by distance
-- ============================================================

CREATE OR REPLACE FUNCTION get_nearest_agents(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 15
)
RETURNS TABLE (
  agent_id UUID,
  user_id UUID,
  full_name TEXT,
  mobile TEXT,
  vehicle_type TEXT,
  vehicle_number TEXT,
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  distance_km NUMERIC,
  rating_avg NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    da.id AS agent_id,
    da.user_id,
    u.full_name,
    u.mobile,
    da.vehicle_type,
    da.vehicle_number,
    da.current_latitude,
    da.current_longitude,
    ROUND((ST_Distance(
      da.current_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000)::numeric, 2) AS distance_km,
    da.rating_avg
  FROM delivery_agents da
  JOIN users u ON u.id = da.user_id
  WHERE da.status = 'approved'
    AND da.is_online = TRUE
    AND u.is_banned = FALSE
    AND da.current_location IS NOT NULL
    AND ST_DWithin(
      da.current_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY da.current_location <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCTION: calculate_delivery_charge(distance_km)
-- Looks up delivery_charge_rules slabs + base + platform charges
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_delivery_charge(
  p_distance_km NUMERIC,
  p_is_urgent BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  base_charge NUMERIC,
  distance_charge NUMERIC,
  platform_charge NUMERIC,
  urgent_charge NUMERIC,
  total_delivery_charge NUMERIC
) AS $$
DECLARE
  v_base_charge NUMERIC := 0;
  v_platform_charge NUMERIC := 0;
  v_urgent_charge NUMERIC := 0;
  v_distance_charge NUMERIC := 0;
BEGIN
  -- Base charge from app_settings
  SELECT COALESCE((SELECT value::numeric FROM app_settings WHERE key = 'base_charge'), 10) INTO v_base_charge;

  -- Platform charge from app_settings
  SELECT COALESCE((SELECT value::numeric FROM app_settings WHERE key = 'platform_charge'), 2) INTO v_platform_charge;

  -- Urgent charge from app_settings (only applied if urgent)
  IF p_is_urgent THEN
    SELECT COALESCE((SELECT value::numeric FROM app_settings WHERE key = 'urgent_charge'), 25) INTO v_urgent_charge;
  ELSE
    v_urgent_charge := 0;
  END IF;

  -- Distance-based slab charge
  SELECT COALESCE(charge, 0) INTO v_distance_charge
  FROM delivery_charge_rules
  WHERE is_active = TRUE
    AND p_distance_km >= min_distance_km
    AND p_distance_km < max_distance_km
  ORDER BY min_distance_km
  LIMIT 1;

  -- If distance exceeds all slabs, use the highest slab's charge
  IF v_distance_charge = 0 THEN
    SELECT COALESCE(charge, 90) INTO v_distance_charge
    FROM delivery_charge_rules
    WHERE is_active = TRUE
    ORDER BY max_distance_km DESC
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT
    v_base_charge,
    v_distance_charge,
    v_platform_charge,
    v_urgent_charge,
    (v_base_charge + v_distance_charge + v_platform_charge + v_urgent_charge);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCTION: update_daily_metrics()
-- Recomputes today's metrics row (call via cron / scheduled job)
-- ============================================================

CREATE OR REPLACE FUNCTION update_daily_metrics()
RETURNS VOID AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
BEGIN
  INSERT INTO daily_metrics (
    metric_date,
    total_orders,
    delivered_orders,
    cancelled_orders,
    total_revenue,
    delivery_charges_collected,
    platform_charges_collected,
    new_patients,
    new_agents,
    active_agents
  )
  VALUES (
    v_date,
    (SELECT COUNT(*) FROM orders WHERE created_at::date = v_date),
    (SELECT COUNT(*) FROM orders WHERE status = 'delivered' AND delivered_at::date = v_date),
    (SELECT COUNT(*) FROM orders WHERE status = 'cancelled' AND cancelled_at::date = v_date),
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'delivered' AND delivered_at::date = v_date),
    (SELECT COALESCE(SUM(delivery_charge), 0) FROM orders WHERE status = 'delivered' AND delivered_at::date = v_date),
    (SELECT COALESCE(SUM(platform_charge), 0) FROM orders WHERE status = 'delivered' AND delivered_at::date = v_date),
    (SELECT COUNT(*) FROM users WHERE role = 'patient' AND created_at::date = v_date),
    (SELECT COUNT(*) FROM users WHERE role = 'agent' AND created_at::date = v_date),
    (SELECT COUNT(*) FROM delivery_agents WHERE is_online = TRUE AND status = 'approved')
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    delivered_orders = EXCLUDED.delivered_orders,
    cancelled_orders = EXCLUDED.cancelled_orders,
    total_revenue = EXCLUDED.total_revenue,
    delivery_charges_collected = EXCLUDED.delivery_charges_collected,
    platform_charges_collected = EXCLUDED.platform_charges_collected,
    new_patients = EXCLUDED.new_patients,
    new_agents = EXCLUDED.new_agents,
    active_agents = EXCLUDED.active_agents,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;