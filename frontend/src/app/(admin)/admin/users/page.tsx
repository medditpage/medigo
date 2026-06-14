'use client';
import { useEffect, useState } from 'react';

import { useLanguage } from '@/hooks/useLanguage';

import api, { getErrorMessage } from '@/lib/api';

import { User } from '@/types';

import { AlertCircle, Search, Ban, CheckCircle2 } from 'lucide-react';
const ROLES = ['all', 'patient', 'agent', 'admin'] as const;
export default function AdminUsersPage() {

const { t, language } = useLanguage();

const [users, setUsers] = useState<User[]>([]);

const [role, setRole] = useState<(typeof ROLES)[number]>('all');

const [search, setSearch] = useState('');

const [loading, setLoading] = useState(true);

const [error, setError] = useState<string | null>(null);

const [actingId, setActingId] = useState<string | null>(null);
async function fetchUsers() {

setLoading(true);

setError(null);

try {

const { data } = await api.get('/admin/users', { params: { role, search: search || undefined } });

setUsers(data.users);

} catch (err) {

setError(getErrorMessage(err));

} finally {

setLoading(false);

}

}
useEffect(() => {

const timeout = setTimeout(fetchUsers, 300);

return () => clearTimeout(timeout);

}, [role, search]);
async function toggleBan(user: User) {

setActingId(user.id);

try {

await api.patch(`/admin/users/${user.id}/ban`, { isBanned: !user.isBanned });

await fetchUsers();

} catch (err) {

setError(getErrorMessage(err));

} finally {

setActingId(null);

}

}
return (

<div className="space-y-6">

<h1 className="text-2xl font-bold text-slate-900">{t.manageUsers}</h1>
  {error && (
    <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
      <AlertCircle size={16} />
      {error}
    </div>
  )}

  <div className="flex flex-wrap items-center gap-3">
    <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
      {ROLES.map((r) => (
        <button
          key={r}
          onClick={() => setRole(r)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
            role === r ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {r}
        </button>
      ))}
    </div>

    <div className="relative flex-1 sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type="text"
        placeholder={language === 'hi' ? 'नाम, ईमेल या मोबाइल खोजें' : 'Search name, email, mobile'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-full border border-slate-200 py-2 pl-9 pr-4 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
      />
    </div>
  </div>

  {loading ? (
    <p className="text-sm text-slate-400">{t.loading}</p>
  ) : users.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
      {t.noDataFound}
    </div>
  ) : (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-slate-500">
            <th className="px-4 py-3 font-medium">{t.fullName}</th>
            <th className="px-4 py-3 font-medium">{t.email}</th>
            <th className="px-4 py-3 font-medium">{t.mobile}</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">{t.status}</th>
            <th className="px-4 py-3 text-right font-medium">{language === 'hi' ? 'कार्रवाई' : 'Action'}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-3 font-medium text-slate-900">{u.fullName}</td>
              <td className="px-4 py-3 text-slate-500">{u.email}</td>
              <td className="px-4 py-3 text-slate-500">{u.mobile}</td>
              <td className="px-4 py-3 capitalize text-slate-500">{u.role}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    u.isBanned ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {u.isBanned ? t.banned : 'Active'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {u.role !== 'admin' && (
                  <button
                    onClick={() => toggleBan(u)}
                    disabled={actingId === u.id}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                      u.isBanned ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    }`}
                  >
                    {u.isBanned ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                    {u.isBanned ? t.unban : t.ban}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
);

}