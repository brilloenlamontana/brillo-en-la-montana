import { useId, type ReactNode } from 'react';

type ParchmentDialogProps = {
  title: string;
  subtitle?: string;
  paragraphs: readonly string[];
  // Footer: the question and its answers.
  children: ReactNode;
};

// Dialog of the story characters, drawn over the canvas. No backdrop blur: blurring a live 3D canvas every frame is
// expensive on phones.
export function ParchmentDialog({ title, subtitle, paragraphs, children }: ParchmentDialogProps) {
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 select-none">
      <div
        role="dialog"
        aria-labelledby={titleId}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#f4e4bc] text-[#3e2723] border-2 sm:border-[3px] border-[#5c3a21] rounded-2xl shadow-2xl p-4 sm:p-7 font-serif"
      >
        <h2 id={titleId} className="text-xl sm:text-2xl font-bold mb-1">
          {title}
        </h2>
        {subtitle && <p className="italic text-[#5c3a21] text-xs sm:text-sm mb-4">{subtitle}</p>}
        <div className="space-y-3 text-xs sm:text-sm leading-relaxed font-sans">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-5 pt-3 border-t border-[#5c3a21]/20">{children}</div>
      </div>
    </div>
  );
}

type ParchmentButtonProps = { onClick: () => void; tone?: 'accept' | 'decline'; children: ReactNode };

export function ParchmentButton({ onClick, tone = 'accept', children }: ParchmentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-bold cursor-pointer rounded-lg bg-[#5c3a21] border-2 border-[#3e2723] shadow-md hover:scale-105 active:scale-95 transition-transform ${
        tone === 'accept' ? 'text-[#f4d03f]' : 'text-[#ff6b6b]'
      }`}
    >
      {children}
    </button>
  );
}
