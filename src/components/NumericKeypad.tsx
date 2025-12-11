"use client";

import { useMemo } from "react";

export type NumericKeypadProps = {
  value: string;
  onChange: (next: string) => void;
  onDone?: () => void;
  decimals?: boolean;
  maxLength?: number;
  label?: string;
  className?: string;
};

export function NumericKeypad({
  value,
  onChange,
  onDone,
  decimals = false,
  maxLength,
  label,
  className = "",
}: NumericKeypadProps) {
  const keypadValue = useMemo(() => value ?? "", [value]);

  const appendCharacter = (next: string) => {
    if (maxLength && keypadValue.length >= maxLength) return;
    onChange(`${keypadValue}${next}`);
  };

  const handleDigit = (digit: string) => appendCharacter(digit);

  const handleDecimal = () => {
    if (!decimals) return;
    if (!keypadValue.includes(".")) {
      appendCharacter(".");
    }
  };

  const handleBackspace = () => {
    if (keypadValue.length === 0) return;
    onChange(keypadValue.slice(0, -1));
  };

  const handleClear = () => onChange("");

  const digits = ["7", "8", "9", "4", "5", "6", "1", "2", "3"]; 

  return (
    <div
      className={`w-full max-w-md rounded-3xl bg-slate-900/95 p-5 text-white shadow-2xl ring-1 ring-white/10 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          {label ? (
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
          ) : null}
          <p className="text-2xl font-black tracking-widest text-white">{keypadValue || "—"}</p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-inner transition active:scale-95"
        >
          C
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {digits.map((digit) => (
          <button
            key={digit}
            type="button"
            className="rounded-2xl bg-cyan-600 py-4 text-3xl font-bold text-white shadow-lg transition active:scale-95"
            onClick={() => handleDigit(digit)}
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          className="rounded-2xl bg-slate-700 py-4 text-xl font-bold uppercase text-white shadow-lg transition active:scale-95"
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          type="button"
          className="rounded-2xl bg-cyan-600 py-4 text-3xl font-bold text-white shadow-lg transition active:scale-95"
          onClick={() => handleDigit("0")}
        >
          0
        </button>
        <button
          type="button"
          className="rounded-2xl bg-emerald-600 py-4 text-2xl font-bold text-white shadow-lg transition active:scale-95"
          onClick={handleBackspace}
        >
          ←
        </button>
      </div>

      <div className="mt-3 flex gap-3">
        {decimals ? (
          <button
            type="button"
            className="flex-1 rounded-2xl bg-slate-700 py-3 text-xl font-bold text-white shadow-lg transition active:scale-95"
            onClick={handleDecimal}
          >
            .
          </button>
        ) : null}
        {onDone ? (
          <button
            type="button"
            className="flex-[2] rounded-2xl bg-emerald-500 py-3 text-xl font-bold uppercase text-slate-900 shadow-lg transition active:scale-95"
            onClick={onDone}
          >
            Done
          </button>
        ) : null}
      </div>
    </div>
  );
}
