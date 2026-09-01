"use client";

import React, { createContext, useContext, useState } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: "default" | "success" | "error";
}

interface ToastContextType {
  toast: (props: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = ({ title, description, type = "default" }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "p-3 rounded-lg border shadow-lg bg-white text-xs flex items-start gap-2.5 animate-in slide-in-from-bottom-5",
              t.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
              t.type === "error" && "border-red-200 bg-red-50 text-red-900"
            )}
          >
            {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <div className="font-bold">{t.title}</div>
              {t.description && <div className="text-[11px] opacity-80 mt-0.5">{t.description}</div>}
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="p-0.5 hover:opacity-100 opacity-60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: ({ title }: { title: string }) => console.log("[Toast]", title),
    };
  }
  return context;
}

