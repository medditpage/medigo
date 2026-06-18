'use client';
// admin/setting/page.tsx
import { useEffect, useState } from 'react';

import { useLanguage } from '@/hooks/useLanguage';

import api, { getErrorMessage } from '@/lib/api';

import { AppSetting, DeliveryChargeRule } from '@/types';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { AlertCircle, CheckCircle2, Loader2, Plus, Settings as SettingsIcon, Ruler } from 'lucide-react';
const SETTINGS_KEYS = [

{ key: 'base_charge', label: 'Base Delivery Charge (₹)' },

{ key: 'platform_charge', label: 'Platform Charge (₹)' },

{ key: 'urgent_charge', label: 'Urgent Order Charge (₹)' },

{ key: 'tax_percent', label: 'Tax Percent (%)' },

{ key: 'assignment_timeout_seconds', label: 'Assignment Timeout (seconds)' },

{ key: 'max_broadcast_agents', label: 'Max Broadcast Agents' },

{ key: 'support_phone', label: 'Support Phone' },

{ key: 'support_email', label: 'Support Email' },

];
export default function AdminSettingsPage() {
  const { t, language } = useLanguage();

  const [settings, setSettings] = useState<Record<string, string>>({});

  const [rules, setRules] = useState<DeliveryChargeRule[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  const [editingRule, setEditingRule] = useState<DeliveryChargeRule | null>(
    null,
  );

  const [ruleForm, setRuleForm] = useState({
    minDistanceKm: "",
    maxDistanceKm: "",
    charge: "",
    isActive: true,
  });

  const [savingRule, setSavingRule] = useState(false);
  async function fetchData() {
    setLoading(true);

    setError(null);

    try {
      const { data } = await api.get("/admin/charge-rules");

      setRules(data.rules);

      const settingsMap: Record<string, string> = {};

      data.settings.forEach((s: AppSetting) => {
        settingsMap[s.key] = s.value;
      });

      setSettings(settingsMap);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  async function handleSettingSave(key: string) {
    setSavingKey(key);
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/admin/settings/${key}`, { value: settings[key] });
      await fetchData();
      setSuccess(`${key} updated ✓`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingKey(null);
    }
  }
  function openCreateRule() {
    setEditingRule(null);

    setRuleForm({
      minDistanceKm: "",
      maxDistanceKm: "",
      charge: "",
      isActive: true,
    });

    setRuleDialogOpen(true);
  }
  function openEditRule(rule: DeliveryChargeRule) {
    setEditingRule(rule);

    setRuleForm({
      minDistanceKm: rule.minDistanceKm,

      maxDistanceKm: rule.maxDistanceKm,

      charge: rule.charge,

      isActive: rule.isActive,
    });

    setRuleDialogOpen(true);
  }
  async function handleRuleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSavingRule(true);

    setError(null);

    try {
      const payload = {
        minDistanceKm: parseFloat(ruleForm.minDistanceKm),

        maxDistanceKm: parseFloat(ruleForm.maxDistanceKm),

        charge: parseFloat(ruleForm.charge),

        isActive: ruleForm.isActive,
      };
      if (editingRule) {
        await api.patch(`/admin/charge-rules/${editingRule.id}`, payload);
      } else {
        await api.post("/admin/charge-rules", payload);
      }

      setRuleDialogOpen(false);
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingRule(false);
    }
  }
  async function toggleRuleActive(rule: DeliveryChargeRule) {
    try {
      await api.patch(`/admin/charge-rules/${rule.id}`, {
        isActive: !rule.isActive,
      });

      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }
  if (loading) return <p className="text-sm text-slate-400">{t.loading}</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.settings}</h1>
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SettingsIcon size={16} className="text-sky-500" />
          {language === "hi" ? "सामान्य सेटिंग्स" : "General Settings"}
        </h2>
        <div className="space-y-3">
          {SETTINGS_KEYS.map((item) => (
            <div key={item.key} className="flex items-center gap-3">
              <label className="w-1/2 text-sm text-slate-600">
                {item.label}
              </label>
              <input
                type="text"
                value={settings[item.key] ?? ""}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, [item.key]: e.target.value }))
                }
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <button
                onClick={() => handleSettingSave(item.key)}
                disabled={savingKey === item.key}
                className="flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
              >
                {savingKey === item.key && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {t.save}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Ruler size={16} className="text-sky-500" />
            {language === "hi"
              ? "दूरी आधारित शुल्क नियम"
              : "Distance-Based Charge Rules"}
          </h2>
          <button
            onClick={openCreateRule}
            className="flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600"
          >
            <Plus size={14} />
            Add Rule
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-3 py-2 font-medium">Min Distance (km)</th>
                <th className="px-3 py-2 font-medium">Max Distance (km)</th>
                <th className="px-3 py-2 font-medium">Charge (₹)</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-slate-50 last:border-0"
                >
                  <td className="px-3 py-2 text-slate-600">
                    {rule.minDistanceKm}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {rule.maxDistanceKm}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    ₹{rule.charge}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        rule.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => openEditRule(rule)}
                      className="mr-2 text-xs font-semibold text-sky-600 hover:underline"
                    >
                      {t.edit}
                    </button>
                    <button
                      onClick={() => toggleRuleActive(rule)}
                      className="text-xs font-semibold text-slate-500 hover:underline"
                    >
                      {rule.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent onClose={() => setRuleDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? t.edit : "Add Charge Rule"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRuleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Min Distance (km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ruleForm.minDistanceKm}
                  onChange={(e) =>
                    setRuleForm((p) => ({
                      ...p,
                      minDistanceKm: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Max Distance (km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ruleForm.maxDistanceKm}
                  onChange={(e) =>
                    setRuleForm((p) => ({
                      ...p,
                      maxDistanceKm: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Charge (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={ruleForm.charge}
                onChange={(e) =>
                  setRuleForm((p) => ({ ...p, charge: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={ruleForm.isActive}
                onChange={(e) =>
                  setRuleForm((p) => ({ ...p, isActive: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
              />
              Active
            </label>

            <button
              type="submit"
              disabled={savingRule}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {savingRule && <Loader2 size={16} className="animate-spin" />}
              {t.save}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}