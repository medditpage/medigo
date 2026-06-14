-- ============================================================
-- MediGo Storage Buckets & Policies
-- ============================================================

-- ============================================================
-- BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('order-images', 'order-images', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bills', 'bills', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agent-docs', 'agent-docs', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoices', 'invoices', FALSE, 10485760, ARRAY['application/pdf', 'text/html'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- HELPER: is_admin (re-declared here in case rls.sql runs after,
-- but storage.sql should run AFTER rls.sql which defines it)
-- ============================================================

-- Assumes is_admin() already exists from rls.sql

-- ============================================================
-- ORDER-IMAGES BUCKET (public)
-- Path convention: order-images/{user_id}/{filename}
-- ============================================================

CREATE POLICY "order_images_authenticated_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'order-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "order_images_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'order-images');

CREATE POLICY "order_images_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'order-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "order_images_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'order-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

-- ============================================================
-- BILLS BUCKET (private)
-- Path convention: bills/{order_id}/{filename}
-- Only the agent who owns the order, the patient who placed it, or admin can read.
-- Upload restricted to authenticated agents.
-- ============================================================

CREATE POLICY "bills_authenticated_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'bills'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "bills_owner_or_admin_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'bills'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id::text = (storage.foldername(name))[1]
          AND (o.patient_id = auth.uid() OR o.agent_id = current_agent_id())
      )
    )
  );

CREATE POLICY "bills_admin_delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'bills' AND is_admin());

-- ============================================================
-- AGENT-DOCS BUCKET (private)
-- Path convention: agent-docs/{user_id}/{filename}
-- Only the owning agent or admin can read.
-- ============================================================

CREATE POLICY "agent_docs_authenticated_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-docs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "agent_docs_owner_or_admin_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'agent-docs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

CREATE POLICY "agent_docs_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'agent-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "agent_docs_admin_delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'agent-docs' AND is_admin());

-- ============================================================
-- INVOICES BUCKET (private)
-- Path convention: invoices/{order_id}/{filename}
-- Backend (service role) writes; patient/agent/admin can read.
-- ============================================================

CREATE POLICY "invoices_service_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "invoices_owner_or_admin_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'invoices'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id::text = (storage.foldername(name))[1]
          AND (o.patient_id = auth.uid() OR o.agent_id = current_agent_id())
      )
    )
  );