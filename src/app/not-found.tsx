import React from "react";
import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 text-white min-h-screen">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-indigo-950/80 border border-indigo-800 flex items-center justify-center mx-auto text-indigo-400">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Page Not Found (404)</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            The page or society resource you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
              <Home className="w-4 h-4" /> Return to Platform Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

