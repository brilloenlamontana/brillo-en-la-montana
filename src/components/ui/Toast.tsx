import { useEffect } from 'react';
import { useToastStore } from '../../store/toastStore';

const TOAST_SECONDS = 3.5;

export function Toast() {
  const message = useToastStore((state) => state.message);
  const id = useToastStore((state) => state.id);
  const hideToast = useToastStore((state) => state.hideToast);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hideToast, TOAST_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [message, id, hideToast]);

  if (!message) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 95,
        maxWidth: 'calc(100% - 32px)',
        background: '#f4e4bc',
        color: '#3e2723',
        border: '2px solid #5c3a21',
        borderRadius: '10px',
        padding: '10px 16px',
        boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  );
}
