"use client";

import { useAuthContext } from "@/lib/AuthContext";

// Exporting the exact same shape so your dashboard/layout files stay untouched!
export function useAuth() {
  return useAuthContext();
}
