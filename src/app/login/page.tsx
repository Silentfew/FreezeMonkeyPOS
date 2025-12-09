"use client";

import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_PIN_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!pin.trim() || isSubmitting) return;

      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

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

        setSuccess("PIN accepted. Redirecting to POS...");
        setTimeout(() => router.push("/pos"), 500);
      } catch (requestError) {
        setError("Unable to reach the server. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, pin, router]
  );

  const handleDigit = (digit: string) => {
    if (isSubmitting) return;
    setPin((current) =>
      current.length < MAX_PIN_LENGTH ? `${current}${digit}` : current
    );
  };

  const handleClear = () => {
    if (isSubmitting) return;
    setPin("");
    setError(null);
    setSuccess(null);
  };

  const maskedPin = pin.length > 0 ? "●".repeat(pin.length) : "— — — —";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md rounded-3xl bg-slate-800 p-10 shadow-2xl">
        <h1 className="text-center text-3xl font-semibold text-white">FreezeMonkey POS</h1>
        <p className="mt-2 text-center text-slate-300">Enter your access PIN to continue.</p>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <p className="block text-lg font-medium text-slate-200">4-Digit PIN</p>
            <div
              className="mt-3 w-full rounded-2xl border-2 border-cyan-400/60 bg-slate-900 p-4 text-center text-3xl font-semibold tracking-widest text-white"
              aria-label="Entered PIN"
              role="presentation"
            >
              {maskedPin}
            </div>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-500/20 p-3 text-center text-sm font-semibold text-red-200">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-xl bg-emerald-500/20 p-3 text-center text-sm font-semibold text-emerald-200">
              {success}
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                className="rounded-2xl bg-cyan-600 p-5 text-3xl font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-60"
                onClick={() => handleDigit(digit)}
                disabled={isSubmitting}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              className="rounded-2xl bg-slate-600 p-5 text-xl font-bold uppercase text-white shadow-lg transition active:scale-95 disabled:opacity-60"
              onClick={handleClear}
              disabled={isSubmitting}
            >
              Clear
            </button>
            <button
              type="button"
              className="rounded-2xl bg-cyan-600 p-5 text-3xl font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-60"
              onClick={() => handleDigit("0")}
              disabled={isSubmitting}
            >
              0
            </button>
            <button
              type="button"
              className="rounded-2xl bg-emerald-600 p-5 text-xl font-bold uppercase text-white shadow-lg transition active:scale-95 disabled:opacity-60"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || pin.trim().length === 0}
            >
              Enter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
