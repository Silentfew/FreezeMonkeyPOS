"use client";

import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 px-4 py-3 text-slate-50 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Rift Control</h1>
          <AdminNav />
        </div>
        <Link
          href="/pos"
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-lg transition active:scale-95"
        >
          Back to POS
        </Link>
      </div>
    </header>
  );
}
