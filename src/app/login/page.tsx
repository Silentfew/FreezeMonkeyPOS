"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        const { error: message } = await response.json();
        setError(message ?? "Unable to sign in");
        return;
      }

      router.push("/");
    } catch (requestError) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md rounded-3xl bg-slate-800 p-10 shadow-2xl">
        <h1 className="text-center text-3xl font-semibold text-white">FreezeMonkey POS</h1>
        <p className="mt-2 text-center text-slate-300">Enter your access PIN to continue.</p>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="pin" className="block text-lg font-medium text-slate-200">
              4-Digit PIN
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="mt-3 w-full rounded-2xl border border-slate-600 bg-slate-900 p-4 text-center text-3xl tracking-widest text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          {error ? (
            <p className="rounded-xl bg-red-500/20 p-3 text-center text-sm font-semibold text-red-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-2xl bg-cyan-500 p-5 text-2xl font-bold uppercase tracking-wider text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || pin.trim().length === 0}
          >
            {isSubmitting ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
