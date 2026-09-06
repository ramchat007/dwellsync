"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Calendar,
  Clock,
  Users,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Settings2,
} from "lucide-react";

interface AmenitiesAdminClientProps {
  initialAmenities: any[];
  initialBookings: any[];
  societyId: string;
}

const CATEGORIES = [
  "CLUBHOUSE",
  "GYM",
  "SWIMMING_POOL",
  "TENNIS_COURT",
  "COMMUNITY_HALL",
  "ROOFTOP",
  "BADMINTON_COURT",
  "OTHER",
];

export function AmenitiesAdminClient({
  initialAmenities,
  initialBookings,
  societyId,
}: AmenitiesAdminClientProps) {
  const [amenities, setAmenities] = useState<any[]>(initialAmenities);
  const [bookings] = useState<any[]>(initialBookings);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "CLUBHOUSE",
    capacity: 50,
    operating_hours_start: "06:00",
    operating_hours_end: "22:00",
    slot_duration_minutes: 60,
    rules: "",
    status: "AVAILABLE",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreateAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/society/${societyId}/amenities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create amenity.");

      setAmenities([...amenities, data.amenity]);
      setIsNewModalOpen(false);
      setFormData({
        name: "",
        description: "",
        category: "CLUBHOUSE",
        capacity: 50,
        operating_hours_start: "06:00",
        operating_hours_end: "22:00",
        slot_duration_minutes: 60,
        rules: "",
        status: "AVAILABLE",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (amenityId: string, newStatus: string) => {
    setTogglingId(amenityId);
    try {
      const res = await fetch(`/api/society/${societyId}/amenities`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: amenityId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");

      setAmenities(amenities.map((a) => (a.id === amenityId ? data.amenity : a)));
    } catch (err: any) {
      alert(err.message || "Failed to update amenity status.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Amenities & Facilities Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure community spaces, operating hours, capacity limits, and monitor bookings.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Amenity</span>
        </button>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {amenities.map((a) => (
          <div
            key={a.id}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {a.category.replace("_", " ")}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    a.status === "AVAILABLE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {a.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900">{a.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                  {a.description || "Society community amenity."}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Hours:</span>
                  <span className="font-semibold text-slate-700">
                    {a.operating_hours_start} - {a.operating_hours_end}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Max Capacity:</span>
                  <span className="font-semibold text-slate-700">{a.capacity || "N/A"} Persons</span>
                </div>
              </div>
            </div>

            {/* Quick Status Selector */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Facility Status:</span>
              <select
                disabled={togglingId === a.id}
                value={a.status}
                onChange={(e) => handleToggleStatus(a.id, e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
              >
                <option value="AVAILABLE">Available</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Society Bookings Roster */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Recent Reservations ({bookings.length})
        </h3>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {bookings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No resident bookings recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Amenity</th>
                    <th className="py-3 px-4">Resident</th>
                    <th className="py-3 px-4">Residence</th>
                    <th className="py-3 px-4">Reservation Date & Time</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{b.amenity?.name}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {b.booker?.display_name || b.booker?.full_name}
                        </div>
                        {b.booker?.phone && (
                          <div className="text-[10px] text-slate-400">{b.booker.phone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {b.unit ? `Flat ${b.unit.unit_number}` : "Resident"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {b.booking_date} ({b.start_time} - {b.end_time})
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Amenity Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Society Amenity</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAmenity} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Amenity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Club Lounge or Olympic Pool"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capacity (Max Persons)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Opens At</label>
                  <input
                    type="time"
                    value={formData.operating_hours_start}
                    onChange={(e) => setFormData({ ...formData, operating_hours_start: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Closes At</label>
                  <input
                    type="time"
                    value={formData.operating_hours_end}
                    onChange={(e) => setFormData({ ...formData, operating_hours_end: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Usage Rules & Guidelines</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Proper swimwear required. Guests must be accompanied by resident."
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Amenity</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
