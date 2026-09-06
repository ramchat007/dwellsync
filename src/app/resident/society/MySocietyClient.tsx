"use client";

import React from "react";
import {
  Building,
  MapPin,
  Phone,
  Mail,
  Shield,
  PhoneCall,
  Clock,
  Award,
  AlertTriangle,
  UserCheck,
  Zap,
  Wrench,
  Flame,
  Ambulance,
  Building2,
} from "lucide-react";
import { Society } from "@/lib/types/database";

interface MySocietyClientProps {
  society: Society | null;
  officeBearers: {
    role: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  }[];
}

export function MySocietyClient({
  society,
  officeBearers,
}: MySocietyClientProps) {
  const emergencyContacts = [
    ...(society?.contact_phone
      ? [
          {
            label: "Society Office Desk",
            number: society.contact_phone,
            icon: Building2,
            color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400",
          },
        ]
      : []),
    { label: "National Emergency Helpline", number: "112", icon: Shield, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400" },
    { label: "Police Control", number: "100", icon: AlertTriangle, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400" },
    { label: "Ambulance / Medical", number: "108", icon: Ambulance, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400" },
    { label: "Fire & Rescue", number: "101", icon: Flame, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400" },
    { label: "Women Helpline", number: "1091", icon: PhoneCall, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Building className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          My Society Information
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Official society registration details, management committee contacts, and emergency lines.
        </p>
      </div>

      {/* Society Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/20">
              {society?.name?.charAt(0) || "S"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {society?.name || "Society"}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {society?.society_type ? society.society_type.replace(/_/g, " ") : "RESIDENTIAL"}
                </span>
                <span className="text-xs text-slate-500">
                  Reg No: {society?.registration_number || "Not specified"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Society Address
            </h3>
            <div className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                {society?.address_line_1 || society?.address ? (
                  <>
                    <p>{society?.address_line_1 || society?.address}</p>
                    {society?.address_line_2 && <p>{society.address_line_2}</p>}
                    {society?.landmark && <p>Near {society.landmark}</p>}
                    <p>
                      {[society?.city, society?.state].filter(Boolean).join(", ")}
                      {society?.pincode ? ` — ${society.pincode}` : ""}
                    </p>
                    {society?.country && <p className="text-slate-400 mt-0.5">{society.country}</p>}
                  </>
                ) : (
                  <p className="text-slate-400 italic">Address not provided</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Society Contact & Info
            </h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Phone:{" "}
                  {society?.contact_phone ? (
                    <a href={`tel:${society.contact_phone}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      {society.contact_phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not specified</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Email:{" "}
                  {society?.contact_email ? (
                    <a href={`mailto:${society.contact_email}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      {society.contact_email}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not specified</span>
                  )}
                </span>
              </div>
              {society?.website && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">Web:</span>
                  <a
                    href={society.website.startsWith("http") ? society.website : `https://${society.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline truncate"
                  >
                    {society.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Speed Dial */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-rose-600" />
          Emergency & Helpdesk Speed Dial
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {emergencyContacts.map((contact, idx) => {
            const Icon = contact.icon;
            return (
              <a
                key={idx}
                href={`tel:${contact.number}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 transition shadow-sm group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl ${contact.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-blue-600 transition">
                      {contact.label}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">{contact.number}</span>
                  </div>
                </div>
                <Phone className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Management Committee */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-blue-600" />
          Managing Committee & Office Bearers
        </h2>
        {officeBearers.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Award className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Committee Members Listed
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Management committee records have not been registered by the society administration yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {officeBearers.map((bearer, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                    {bearer.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{bearer.name}</h4>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block">
                      {bearer.role}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                  {bearer.phone && <p>📱 {bearer.phone}</p>}
                  {bearer.email && <p className="truncate">✉ {bearer.email}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

