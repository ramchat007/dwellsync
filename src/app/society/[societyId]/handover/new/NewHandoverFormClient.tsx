"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface Props {
  societyId: string;
}

export function NewHandoverFormClient({ societyId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    builder_name: "",
    builder_contact_name: "",
    builder_contact_email: "",
    builder_contact_phone: "",
    handover_start_date: "",
    target_handover_date: "",
  });

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== "")
      );

      const res = await fetch(`/api/society/${societyId}/handover/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create project");
        return;
      }

      router.push(`/society/${societyId}/handover/${data.project.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium text-slate-700">Project Title *</label>
        <Input
          id="title"
          value={form.title}
          onChange={set("title")}
          required
          minLength={3}
          maxLength={200}
          placeholder="e.g., Skyline Heights Phase 1 Handover"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          id="description"
          value={form.description}
          onChange={set("description")}
          rows={3}
          maxLength={2000}
          placeholder="Brief description of the handover scope…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="builder_name" className="text-sm font-medium text-slate-700">Builder / Developer Name *</label>
          <Input
            id="builder_name"
            value={form.builder_name}
            onChange={set("builder_name")}
            required
            maxLength={200}
            placeholder="Builder Ltd."
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="builder_contact_name" className="text-sm font-medium text-slate-700">Builder Contact Person</label>
          <Input
            id="builder_contact_name"
            value={form.builder_contact_name}
            onChange={set("builder_contact_name")}
            maxLength={150}
            placeholder="Contact person name"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="builder_contact_email" className="text-sm font-medium text-slate-700">Builder Contact Email</label>
          <Input
            id="builder_contact_email"
            type="email"
            value={form.builder_contact_email}
            onChange={set("builder_contact_email")}
            placeholder="builder@example.com"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="builder_contact_phone" className="text-sm font-medium text-slate-700">Builder Contact Phone</label>
          <Input
            id="builder_contact_phone"
            type="tel"
            value={form.builder_contact_phone}
            onChange={set("builder_contact_phone")}
            maxLength={20}
            placeholder="+91 98765 43210"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="handover_start_date" className="text-sm font-medium text-slate-700">Start Date</label>
          <Input
            id="handover_start_date"
            type="date"
            value={form.handover_start_date}
            onChange={set("handover_start_date")}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="target_handover_date" className="text-sm font-medium text-slate-700">Target Handover Date</label>
          <Input
            id="target_handover_date"
            type="date"
            value={form.target_handover_date}
            onChange={set("target_handover_date")}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…
            </>
          ) : (
            "Create Handover Project"
          )}
        </Button>
      </div>
    </form>
  );
}
