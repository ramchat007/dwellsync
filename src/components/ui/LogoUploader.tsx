"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Check, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "./button";

export function LogoUploader({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Client-side validations
    if (file.size > 2 * 1024 * 1024) {
      setError("File size exceeds 2MB limit.");
      return;
    }

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setError("Only PNG, JPEG, WEBP or SVG images are supported.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/superadmin/societies/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPreview(data.url);
        onChange(data.url);
      } else {
        setError(data.error || "Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      setError("Upload connection error.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {preview ? (
          <div className="relative w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center p-1 shadow-2xs group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Society Logo Preview"
              className="w-full h-full object-contain"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-600"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">Upload</span>
              </>
            )}
          </div>
        )}

        <div className="text-xs space-y-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-7 text-xs px-2.5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading...
                </>
              ) : preview ? (
                "Change Logo"
              ) : (
                "Select File"
              )}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="h-7 text-xs px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Remove
              </Button>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            PNG, JPG, WEBP or SVG &middot; Max 2MB &middot; Stored in Supabase Storage
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

