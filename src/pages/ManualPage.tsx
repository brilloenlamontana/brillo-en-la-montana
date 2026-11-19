import { useNavigate } from 'react-router-dom';
import { ManualContent } from '@/components/manual/UserManual';

// The user manual on a page of its own (/manual), open to anyone with the link, signed in or not. The same manual
// opens as a window from the sign-in page, the game and the admin dashboard (ManualButton).
export default function ManualPage() {
  const navigate = useNavigate();
  return (
    <main className="w-screen h-dvh bg-madera-900 p-0 sm:p-4">
      <div className="h-full max-w-6xl mx-auto sm:rounded-3xl sm:border-[3px] border-madera-600 overflow-hidden shadow-2xl">
        <ManualContent onClose={() => navigate('/login')} />
      </div>
    </main>
  );
}
