"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import api, { getErrorMessage, uploadFileToStorage } from "@/lib/api";
import { Address, FamilyMember } from "@/types";
import {
  Upload,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
  ListChecks,
} from "lucide-react";

interface ManualItem {
  medicineName: string;
  quantity: number;
  unitPrice: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [orderMethod, setOrderMethod] = useState<"prescription" | "manual">(
    "prescription",
  );
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [addressId, setAddressId] = useState("");
  const [familyMemberId, setFamilyMemberId] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [notes, setNotes] = useState("");

  const [prescriptionFiles, setPrescriptionFiles] = useState<File[]>([]);
  const [items, setItems] = useState<ManualItem[]>([
    { medicineName: "", quantity: 1, unitPrice: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [addrRes, famRes] = await Promise.all([
          api.get("/patient/addresses"),
          api.get("/patient/family-members"),
        ]);
        setAddresses(addrRes.data.addresses);
        setFamilyMembers(famRes.data.familyMembers);

        const defaultAddr =
          addrRes.data.addresses.find((a: Address) => a.isDefault) ||
          addrRes.data.addresses[0];
        if (defaultAddr) setAddressId(defaultAddr.id);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { medicineName: "", quantity: 1, unitPrice: "" },
    ]);
  }

  function updateItem(
    index: number,
    field: keyof ManualItem,
    value: string | number,
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!addressId) {
      setError(t.requiredField + ": " + t.deliveryAddress);
      return;
    }

    if (orderMethod === "prescription" && prescriptionFiles.length === 0) {
      setError("Please upload at least one prescription image");
      return;
    }

    if (orderMethod === "manual") {
      const validItems = items.filter((i) => i.medicineName.trim());
      if (validItems.length === 0) {
        setError("Please add at least one medicine");
        return;
      }
    }

    setSubmitting(true);

    try {
      let prescriptionImageUrls: string[] = [];

      if (orderMethod === "prescription") {
        const folder = uuidv4();
        prescriptionImageUrls = await Promise.all(
          prescriptionFiles.map(async (file, idx) => {
            const path = `${user?.id}/${folder}/${idx}-${file.name}`;
            return uploadFileToStorage("order-images", path, file);
          }),
        );
      }

      const payload: Record<string, any> = {
        addressId,
        familyMemberId: familyMemberId || undefined,
        orderMethod,
        isUrgent,
        notes: notes || undefined,
      };

      if (orderMethod === "prescription") {
        payload.prescriptionImageUrls = prescriptionImageUrls;
      } else {
        payload.items = items
          .filter((i) => i.medicineName.trim())
          .map((i) => ({
            medicineName: i.medicineName,
            quantity: i.quantity || 1,
            unitPrice: i.unitPrice ? parseFloat(i.unitPrice) : 0,
          }));
      }

      const { data } = await api.post("/orders", payload);
      router.push(`/orders/${data.order.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">{t.loading}</p>;
  }

  if (addresses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          {t.requiredField}: {t.address}
        </p>
        <a
          href="/profile"
          className="mt-2 inline-block text-sm font-medium text-sky-600 hover:underline"
        >
          {t.addNewAddress}
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t.orderMedicine}</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setOrderMethod("prescription")}
          className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-colors ${
            orderMethod === "prescription"
              ? "border-sky-500 bg-sky-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <FileText
            className={
              orderMethod === "prescription" ? "text-sky-500" : "text-slate-400"
            }
            size={24}
          />
          <span className="text-sm font-medium text-slate-700">
            {t.uploadPrescription}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOrderMethod("manual")}
          className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-colors ${
            orderMethod === "manual"
              ? "border-sky-500 bg-sky-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <ListChecks
            className={
              orderMethod === "manual" ? "text-sky-500" : "text-slate-400"
            }
            size={24}
          />
          <span className="text-sm font-medium text-slate-700">
            {t.enterMedicineManually}
          </span>
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        {orderMethod === "prescription" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t.uploadPrescription}
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:bg-slate-50">
              <Upload className="text-slate-400" size={28} />
              <span className="text-sm text-slate-500">
                {prescriptionFiles.length > 0
                  ? `${prescriptionFiles.length} file(s) selected`
                  : "Click to upload images"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) =>
                  setPrescriptionFiles(Array.from(e.target.files || []))
                }
              />
            </label>
            {prescriptionFiles.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {prescriptionFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square overflow-hidden rounded-lg border border-slate-200"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              {t.enterMedicineManually}
            </label>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.medicineName}
                  value={item.medicineName}
                  onChange={(e) =>
                    updateItem(idx, "medicineName", e.target.value)
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
                <input
                  type="number"
                  min={1}
                  placeholder={t.quantity}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(idx, "quantity", parseInt(e.target.value) || 1)
                  }
                  className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="₹"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                  className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-rose-400 hover:text-rose-600"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline"
            >
              <Plus size={16} />
              {t.addMedicine}
            </button>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.selectAddress}
          </label>
          <select
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {addresses.map((addr) => (
              <option key={addr.id} value={addr.id}>
                {addr.label} - {addr.addressLine}, {addr.city}
              </option>
            ))}
          </select>
        </div>

        {familyMembers.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t.familyMembers}
            </label>
            <select
              value={familyMemberId}
              onChange={(e) => setFamilyMemberId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="">
                {user?.fullName} ({t.profile})
              </option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName} ({(t as any)[member.relation]})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.notes}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="e.g. ring the bell twice, leave at door, etc."
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
          />
          {t.urgentOrder}
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {t.submitOrder}
        </button>
      </form>
    </div>
  );
}
