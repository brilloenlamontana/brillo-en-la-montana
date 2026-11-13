import { useEffect } from 'react';
import { useToastStore } from '@/store/toastStore';

// At least this long, and longer for what a character says, so it can be read while it is heard.
const TOAST_SECONDS = 3.5;
const READING_CHARS_PER_SECOND = 15;

export function Toast() {
  const message = useToastStore((state) => state.message);
  const id = useToastStore((state) => state.id);
  const hideToast = useToastStore((state) => state.hideToast);

  useEffect(() => {
    if (!message) return;
    const seconds = Math.max(TOAST_SECONDS, message.length / READING_CHARS_PER_SECOND);
    const timer = setTimeout(hideToast, seconds * 1000);
    return () => clearTimeout(timer);
  }, [message, id, hideToast]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[45] max-w-[calc(100%-32px)] sm:max-w-md bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-4 py-2.5 shadow-xl text-center font-semibold text-xs sm:text-sm pointer-events-none transition-all"
    >
      {message}
    </div>
  );
}
