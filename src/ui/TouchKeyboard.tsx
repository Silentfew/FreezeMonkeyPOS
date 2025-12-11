"use client";

interface TouchKeyboardProps {
  onKeyPress: (key: string) => void;
  disabled?: boolean;
}

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export default function TouchKeyboard({ onKeyPress, disabled }: TouchKeyboardProps) {
  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-white/5 p-4 shadow-lg ring-1 ring-white/10">
      {KEY_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-2">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onKeyPress(key.toLowerCase())}
              className="min-h-[44px] flex-1 rounded-full bg-[#111827] px-3 py-3 text-lg font-semibold text-[#E9F9FF] shadow-lg ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#1c2741] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {key}
            </button>
          ))}
        </div>
      ))}

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onKeyPress('space')}
          className="min-h-[44px] flex-1 rounded-full bg-[#1f2937] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[#E9F9FF] shadow-lg ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#2f3a52] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Space
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onKeyPress('backspace')}
          className="min-h-[44px] flex-1 rounded-full bg-[#1f2937] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[#E9F9FF] shadow-lg ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#2f3a52] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Backspace
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onKeyPress('clear')}
          className="min-h-[44px] flex-1 rounded-full bg-[#1f2937] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[#E9F9FF] shadow-lg ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#2f3a52] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onKeyPress('done')}
          className="min-h-[44px] flex-1 rounded-full bg-[#00C2FF] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#0b1222] shadow-lg ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#2ad2ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}
