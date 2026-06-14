import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env
  .SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables",
  );
}

// Admin client - uses service role key, bypasses RLS.
// Only used server-side, never expose this key to the frontend.
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export const STORAGE_BUCKETS = {
  ORDER_IMAGES: "order-images",
  BILLS: "bills",
  AGENT_DOCS: "agent-docs",
  INVOICES: "invoices",
} as const;

export async function uploadBuffer(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload to ${bucket}/${path}: ${error.message}`);
  }

  if (bucket === STORAGE_BUCKETS.ORDER_IMAGES) {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  const { data, error: signedError } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (signedError || !data) {
    throw new Error(`Failed to create signed URL for ${bucket}/${path}`);
  }

  return data.signedUrl;
}

export default supabaseAdmin;
