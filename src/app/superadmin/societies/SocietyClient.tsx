"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Society, SocietyStatus } from "@/lib/types/database";
import {
  Building2,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Search,
  MapPin,
  UserCheck,
  ExternalLink,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export function SocietyClient({ initialSocieties }: { initialSocieties: Society[] }) {
  const router = useRouter();
  const [societies, setSocieties] = useState<Society[]>(initialSocieties);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const filtered = societies.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.city && s.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.registration_number && s.registration_number.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (society: Society) => {
    const nextStatus: SocietyStatus = society.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (!confirm(`Are you sure you want to change status of ${society.name} to ${nextStatus}?`)) {
      return;
    }

    try {
      setActionLoadingId(society.id);
      const res = await fetch(`/api/superadmin/societies/${society.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSocieties((prev) =>
          prev.map((s) => (s.id === society.id ? { ...s, status: nextStatus } : s))
        );
        router.refresh();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Status toggle error:", err);
      alert("Error updating status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Societies & Tenants</h1>
          <p className="text-xs text-slate-500">
            Multi-tenant society registry with independent boundary isolation across India.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search by name, code or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-32 text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ONBOARDING">Onboarding</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ARCHIVED">Archived</option>
          </Select>

          <Link href="/superadmin/societies/new">
            <Button className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Add Society (Wizard)
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Society Name & Type</TableHead>
              <TableHead>Location & State</TableHead>
              <TableHead>Registration Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((society) => (
                <TableRow key={society.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <Link
                          href={`/superadmin/societies/${society.id}`}
                          className="font-semibold text-slate-900 text-xs hover:text-indigo-600 transition-colors"
                        >
                          {society.name}
                        </Link>
                        <div className="text-[11px] font-mono text-slate-500 uppercase flex items-center gap-1.5 mt-0.5">
                          <span>Code: {society.code}</span>
                          <span>•</span>
                          <span className="text-indigo-600">{society.society_type?.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {[society.city, society.district, society.state].filter(Boolean).join(", ") || "Unspecified"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 font-mono">
                    {society.registration_number || "—"}
                  </TableCell>

                  <TableCell>
                    {society.status === "ACTIVE" && (
                      <Badge variant="success" className="gap-1 font-mono text-[10px]">
                        <ShieldCheck className="w-3 h-3" /> ACTIVE
                      </Badge>
                    )}
                    {society.status === "ONBOARDING" && (
                      <Badge variant="warning" className="gap-1 font-mono text-[10px]">
                        ONBOARDING
                      </Badge>
                    )}
                    {society.status === "SUSPENDED" && (
                      <Badge variant="destructive" className="gap-1 font-mono text-[10px]">
                        <ShieldAlert className="w-3 h-3" /> SUSPENDED
                      </Badge>
                    )}
                    {society.status === "ARCHIVED" && (
                      <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
                        ARCHIVED
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-slate-500 font-mono">
                    {formatDate(society.created_at)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/superadmin/societies/${society.id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-7 px-2 gap-1">
                          <Eye className="w-3 h-3" /> View
                        </Button>
                      </Link>

                      <Button
                        variant={society.status === "ACTIVE" ? "destructive" : "outline"}
                        size="sm"
                        disabled={actionLoadingId === society.id}
                        onClick={() => handleToggleStatus(society)}
                        className="text-xs h-7 px-2.5"
                      >
                        {actionLoadingId === society.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : society.status === "ACTIVE" ? (
                          "Suspend"
                        ) : (
                          "Activate"
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  {searchQuery || statusFilter !== "ALL"
                    ? "No matching societies found."
                    : "No societies created yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
