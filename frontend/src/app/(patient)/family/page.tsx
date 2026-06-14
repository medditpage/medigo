"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import api, { getErrorMessage } from "@/lib/api";
import { FamilyMember } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  Users,
  Loader2,
} from "lucide-react";

const RELATIONS = [
  "father",
  "mother",
  "child",
  "grandparent",
  "spouse",
  "sibling",
  "other",
] as const;

export default function FamilyMembersPage() {
  const { t } = useLanguage();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    relation: "father",
    age: "",
    mobile: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function fetchMembers() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/patient/family-members");
      setMembers(data.familyMembers);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ fullName: "", relation: "father", age: "", mobile: "" });
    setDialogOpen(true);
  }

  function openEdit(member: FamilyMember) {
    setEditing(member);
    setForm({
      fullName: member.fullName,
      relation: member.relation,
      age: member.age ? String(member.age) : "",
      mobile: member.mobile || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        fullName: form.fullName,
        relation: form.relation,
        age: form.age ? parseInt(form.age) : null,
        mobile: form.mobile || null,
      };

      if (editing) {
        await api.patch(`/patient/family-members/${editing.id}`, payload);
      } else {
        await api.post("/patient/family-members", payload);
      }

      setDialogOpen(false);
      await fetchMembers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.delete + "?")) return;
    try {
      await api.delete(`/patient/family-members/${id}`);
      await fetchMembers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.familyMembers}</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
        >
          <Plus size={16} />
          {t.addFamilyMember}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">{t.loading}</p>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          <Users className="mx-auto mb-2 text-slate-300" size={32} />
          {t.noDataFound}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {member.fullName}
                </p>
                <p className="text-xs text-slate-500">
                  {(t as any)[member.relation]}
                  {member.age ? ` · ${member.age} yrs` : ""}
                  {member.mobile ? ` · ${member.mobile}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(member)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="rounded-full p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editing ? t.edit : t.addFamilyMember}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.fullName}
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fullName: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t.relation}
              </label>
              <select
                value={form.relation}
                onChange={(e) =>
                  setForm((p) => ({ ...p, relation: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {(t as any)[r]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Age
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.age}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, age: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t.mobile}
                </label>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {t.save}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
