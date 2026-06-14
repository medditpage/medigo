-- ============================================================
-- MediGo Row Level Security Policies
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_charge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: get current user's role
-- ============================================================

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION current_agent_id()
RETURNS UUID AS $$
  SELECT id FROM delivery_agents WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- USERS
-- ============================================================

CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid() OR is_admin());

CREATE POLICY "users_admin_all" ON users
  FOR ALL USING (is_admin());

-- ============================================================
-- ADDRESSES
-- ============================================================

CREATE POLICY "addresses_select_own" ON addresses
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "addresses_insert_own" ON addresses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "addresses_update_own" ON addresses
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "addresses_delete_own" ON addresses
  FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- FAMILY MEMBERS
-- ============================================================

CREATE POLICY "family_members_select_own" ON family_members
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "family_members_insert_own" ON family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "family_members_update_own" ON family_members
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "family_members_delete_own" ON family_members
  FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- DELIVERY AGENTS
-- ============================================================

-- Agent can read/update own profile; admin full access;
-- patients can read minimal info about the agent assigned to their order (handled via orders join in API layer)
CREATE POLICY "delivery_agents_select_own" ON delivery_agents
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "delivery_agents_select_for_order" ON delivery_agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.agent_id = delivery_agents.id
        AND o.patient_id = auth.uid()
    )
  );

CREATE POLICY "delivery_agents_insert_own" ON delivery_agents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "delivery_agents_update_own" ON delivery_agents
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "delivery_agents_admin_all" ON delivery_agents
  FOR ALL USING (is_admin());

-- ============================================================
-- MEDICAL STORES
-- ============================================================

-- Public can read active stores
CREATE POLICY "medical_stores_select_active" ON medical_stores
  FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "medical_stores_admin_all" ON medical_stores
  FOR ALL USING (is_admin());

-- ============================================================
-- ORDERS
-- ============================================================

-- Patients: read/write own orders
CREATE POLICY "orders_select_patient" ON orders
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "orders_insert_patient" ON orders
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "orders_update_patient" ON orders
  FOR UPDATE USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Agents: read orders assigned to them (via order_assignments) or currently theirs
CREATE POLICY "orders_select_agent" ON orders
  FOR SELECT USING (
    agent_id = current_agent_id()
    OR EXISTS (
      SELECT 1 FROM order_assignments oa
      WHERE oa.order_id = orders.id
        AND oa.agent_id = current_agent_id()
    )
  );

-- Agents: update orders assigned to them (status progression)
CREATE POLICY "orders_update_agent" ON orders
  FOR UPDATE USING (agent_id = current_agent_id())
  WITH CHECK (agent_id = current_agent_id());

-- Admin full access
CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (is_admin());

-- ============================================================
-- ORDER ITEMS
-- ============================================================

CREATE POLICY "order_items_select" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (o.patient_id = auth.uid() OR o.agent_id = current_agent_id() OR is_admin())
    )
  );

CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (o.patient_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "order_items_update" ON order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (o.patient_id = auth.uid() OR o.agent_id = current_agent_id() OR is_admin())
    )
  );

CREATE POLICY "order_items_delete" ON order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (o.patient_id = auth.uid() OR is_admin())
    )
  );

-- ============================================================
-- ORDER ASSIGNMENTS
-- ============================================================

-- Agents can see assignments broadcast to them
CREATE POLICY "order_assignments_select_agent" ON order_assignments
  FOR SELECT USING (agent_id = current_agent_id() OR is_admin());

-- Patients can see assignments for their own orders (read-only status info)
CREATE POLICY "order_assignments_select_patient" ON order_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_assignments.order_id
        AND o.patient_id = auth.uid()
    )
  );

-- Agents can update their own assignment (accept/reject)
CREATE POLICY "order_assignments_update_agent" ON order_assignments
  FOR UPDATE USING (agent_id = current_agent_id())
  WITH CHECK (agent_id = current_agent_id());

CREATE POLICY "order_assignments_admin_all" ON order_assignments
  FOR ALL USING (is_admin());

-- ============================================================
-- ORDER STATUS HISTORY
-- ============================================================

CREATE POLICY "order_status_history_select" ON order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_status_history.order_id
        AND (o.patient_id = auth.uid() OR o.agent_id = current_agent_id() OR is_admin())
    )
  );

CREATE POLICY "order_status_history_admin_all" ON order_status_history
  FOR ALL USING (is_admin());

-- ============================================================
-- INVOICES
-- ============================================================

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = invoices.order_id
        AND (o.patient_id = auth.uid() OR o.agent_id = current_agent_id() OR is_admin())
    )
  );

CREATE POLICY "invoices_admin_all" ON invoices
  FOR ALL USING (is_admin());

-- ============================================================
-- ORDER RATINGS
-- ============================================================

CREATE POLICY "order_ratings_select" ON order_ratings
  FOR SELECT USING (
    patient_id = auth.uid()
    OR agent_id = current_agent_id()
    OR is_admin()
  );

CREATE POLICY "order_ratings_insert_patient" ON order_ratings
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "order_ratings_admin_all" ON order_ratings
  FOR ALL USING (is_admin());

-- ============================================================
-- COMPLAINTS
-- ============================================================

CREATE POLICY "complaints_select_own" ON complaints
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "complaints_insert_own" ON complaints
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "complaints_update_own" ON complaints
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "complaints_admin_all" ON complaints
  FOR ALL USING (is_admin());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "notifications_admin_all" ON notifications
  FOR ALL USING (is_admin());

-- Service role / admin inserts notifications (done via backend with service key, bypasses RLS)

-- ============================================================
-- EMAIL LOGS (admin only)
-- ============================================================

CREATE POLICY "email_logs_admin_all" ON email_logs
  FOR ALL USING (is_admin());

-- ============================================================
-- AGENT EARNINGS
-- ============================================================

CREATE POLICY "agent_earnings_select_own" ON agent_earnings
  FOR SELECT USING (agent_id = current_agent_id() OR is_admin());

CREATE POLICY "agent_earnings_admin_all" ON agent_earnings
  FOR ALL USING (is_admin());

-- ============================================================
-- DAILY METRICS (admin only)
-- ============================================================

CREATE POLICY "daily_metrics_admin_all" ON daily_metrics
  FOR ALL USING (is_admin());

-- ============================================================
-- AUDIT LOGS (admin only)
-- ============================================================

CREATE POLICY "audit_logs_admin_all" ON audit_logs
  FOR ALL USING (is_admin());

-- ============================================================
-- DELIVERY CHARGE RULES
-- ============================================================

-- Public can read active rules (needed for fare estimate before login)
CREATE POLICY "delivery_charge_rules_select" ON delivery_charge_rules
  FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "delivery_charge_rules_admin_all" ON delivery_charge_rules
  FOR ALL USING (is_admin());

-- ============================================================
-- APP SETTINGS
-- ============================================================

-- Public can read settings (needed for charge calculation display)
CREATE POLICY "app_settings_select" ON app_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "app_settings_admin_all" ON app_settings
  FOR ALL USING (is_admin());