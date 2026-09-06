"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Building,
  Loader2,
  Ban,
} from "lucide-react";
import { Amenity, AmenityBooking, Society } from "@/lib/types/database";

interface AmenitiesClientProps {
  initialAmenities: any[];
  initialBookings: any[];
  residentUnits: any[];
  society: Society;
}

export function AmenitiesClient({
  initialAmenities,
  initialBookings,
  residentUnits,
  society,
}: AmenitiesClientProps) {
  const [amenities] = useState<any[]>(initialAmenities);
  const [bookings, setBookings] = useState<any[]>(initialBookings);
  const [activeTab, setActiveTab] = useState<"CATALOG" | "MY_BOOKINGS">("CATALOG");

  // Booking Modal
  const [bookingAmenity, setBookingAmenity] = useState<any | null>(null);
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [targetUnitId, setTargetUnitId] = useState(residentUnits[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleBookAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingAmenity) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/resident/amenities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amenity_id: bookingAmenity.id,
          unit_id: targetUnitId || null,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to book slot.");
      }

      setBookings([data.booking, ...bookings]);
      setBookingAmenity(null);
      setActiveTab("MY_BOOKINGS");
      setNotes("");
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      const res = await fetch("/api/resident/amenities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel.");

      setBookings(
        bookings.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
      );
    } catch (err: any) {
      alert(err.message || "Could not cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Society Amenities</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold font-mono">
              {amenities.length} Facilities
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complimentary access to society facilities: clubhouse, gym, pool, sports courts, and halls.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("CATALOG")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "CATALOG"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            All Amenities ({amenities.length})
          </button>
          <button
            onClick={() => setActiveTab("MY_BOOKINGS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "MY_BOOKINGS"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            My Reservations ({bookings.length})
          </button>
        </div>
      </div>

      {/* Tab: Catalog */}
      {activeTab === "CATALOG" && (
        <div>
          {amenities.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Amenities Configured</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your society management has not published amenities yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {amenities.map((a) => {
                const isAvailable = a.status === "AVAILABLE";

                return (
                  <div
                    key={a.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {a.category.replace("_", " ")}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{a.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {a.description || "Community amenity for verified society residents."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {a.operating_hours_start || "06:00"} - {a.operating_hours_end || "22:00"}
                          </span>
                        </div>
                        {a.capacity && (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Max {a.capacity} Persons</span>
                          </div>
                        )}
                      </div>

                      {a.rules && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-bold">Guidelines:</span> {a.rules}
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setBookingAmenity(a);
                          setErrorMsg("");
                        }}
                        disabled={!isAvailable}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                          isAvailable
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        <span>{isAvailable ? "Reserve Free Slot" : "Under Maintenance"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Reservations */}
      {activeTab === "MY_BOOKINGS" && (
        <div>
          {bookings.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Reservations</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You haven&apos;t booked any amenities yet. Explore facilities in the catalog tab to reserve slots.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const isConfirmed = b.status === "CONFIRMED";

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isConfirmed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {b.status}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {b.amenity?.name || "Facility"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {b.booking_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {b.start_time} - {b.end_time}
                        </span>
                        {b.unit && (
                          <span className="flex items-center gap-1 font-mono text-slate-500">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            Flat {b.unit.unit_number}
                          </span>
                        )}
                      </div>

                      {b.notes && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">Notes: {b.notes}</p>
                      )}
                    </div>

                    {isConfirmed && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        disabled={cancellingId === b.id}
                        className="self-end md:self-center px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition flex items-center gap-1"
                      >
                        {cancellingId === b.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Ban className="w-3.5 h-3.5" />
                        )}
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reservation Slot Booking Modal */}
      {bookingAmenity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reserve {bookingAmenity.name}</h3>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Complimentary Society Amenity
                </span>
              </div>
              <button
                onClick={() => setBookingAmenity(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 text-xs"
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

            <form onSubmit={handleBookAmenity} className="space-y-4 text-xs">
              {/* Unit Dropdown if multiple */}
              {residentUnits.length > 1 && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Booking Flat
                  </label>
                  <select
                    value={targetUnitId}
                    onChange={(e) => setTargetUnitId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {residentUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        Flat {u.unit_number} ({u.building?.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reservation Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              {/* Time Slots */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Purpose / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Birthday family dinner or practice session"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              {/* Zero Financial Cost Guarantee Card */}
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-[11px] text-blue-900 dark:text-blue-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Free Society Booking</span>
                </div>
                <div>
                  No fees or deposits charged. Please adhere to society community guidelines.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBookingAmenity(null)}
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
                  <span>Confirm Slot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
