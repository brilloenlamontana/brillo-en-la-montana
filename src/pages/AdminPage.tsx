import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ManualButton } from '@/components/manual/UserManual';
import { Navigate, useNavigate } from 'react-router-dom';
import { playAsStudent } from '@/app/onboarding';
import { WorldBackdrop } from '@/components/WorldBackdrop';
import { SEDES } from '@/data/univalle';
import { getMissionSummary } from '@/game/challenges/desafio1/mission';
import { getBonosSummary } from '@/game/challenges/bonos';
import { useNoMusic } from '@/game/engine/audio/useMenuMusic';
import { getDesafio2Summary } from '@/game/challenges/desafio2/mission';
import { getDesafio3Summary } from '@/game/challenges/desafio3/mission';
import { countDerrotas, getCierreSummary } from '@/game/challenges/relatoCierre/mission';
import type { MissionStep } from '@/game/challenges/types';
import {
  claimFirstAdmin,
  exportUsersToCSV,
  fetchAllUsers,
  hasAnyAdmin,
  isAdminAccount,
  subscribeToUsers,
  type AdminUserRecord,
} from '@/services/adminService';
import { signOutUser } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { STARS } from '@/store/progressStore';

// Admin dashboard: every player's registration and progress, live. It has no sign-in of its own: whoever is not signed
// in goes to the game's sign-in, which brings administrators back here. Who sees it is decided here only for
// the interface; the data itself must be protected by the Firestore security rules (see README).
export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  useNoMusic();

  // Authentication & authorization. `access` is the answer for one account: while it belongs to another (or there is
  // none yet) the permissions are still being checked.
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [access, setAccess] = useState<{ uid: string; admin: boolean; anyAdmin: boolean } | null>(null);
  const checked = user !== null && access?.uid === user.uid;
  const isAdminUser = checked ? access.admin : null;
  const hasAnyAdminInDB = checked ? access.anyAdmin : null;

  // Players
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // The uid rather than the record: the open sheet follows the player's live progress.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = useMemo(() => users.find((u) => u.uid === selectedUserId) ?? null, [users, selectedUserId]);
  const setSelectedUser = (record: AdminUserRecord | null) => setSelectedUserId(record?.uid ?? null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sedeFilter, setSedeFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Whether the signed-in account is an admin, checked each time the account changes.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const admin = await isAdminAccount(user);
        const anyAdmin = admin || (await hasAnyAdmin());
        if (!alive) return;
        if (admin) {
          setLoadingUsers(true);
          setAuthError(null);
        }
        setAccess({ uid: user.uid, admin, anyAdmin });
      } catch (error) {
        console.error('Could not verify the admin permissions:', error);
        if (!alive) return;
        setAuthError('Error al verificar permisos de administrador en la base de datos.');
        setAccess({ uid: user.uid, admin: false, anyAdmin: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  // Admins follow the player list and their progress in real time.
  useEffect(() => {
    if (!isAdminUser) return;
    return subscribeToUsers(
      (list) => {
        setUsers(list);
        setLoadingUsers(false);
      },
      () => setLoadingUsers(false),
    );
  }, [isAdminUser]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setUsers(await fetchAllUsers());
    } catch (error) {
      console.error('Could not load the players:', error);
      alert('Error al cargar la lista de usuarios.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaimFirstAdmin = async () => {
    if (!user) return;
    setAuthLoading(true);
    try {
      await claimFirstAdmin(user);
      useAuthStore.getState().updateUser({ role: 'admin' });
      setLoadingUsers(true);
      setAccess({ uid: user.uid, admin: true, anyAdmin: true });
      setAuthError(null);
    } catch (error) {
      console.error('Could not claim the admin role:', error);
      alert('Error al asignar rol de administrador inicial.');
    } finally {
      setAuthLoading(false);
    }
  };

  // An administrator who wants to play goes on as a student (registration, character) for the rest of the visit.
  const goPlay = () => {
    playAsStudent();
    navigate('/mundo');
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUsers([]);
      setSelectedUser(null);
    } catch (error) {
      console.error('Could not sign out:', error);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (u.nombresApellidos || u.name || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesCode = (u.codigoEstudiantil || '').toLowerCase().includes(q);
        const matchesProg = (u.programaNombre || u.programaCodigo || '').toLowerCase().includes(q);
        const matchesNick = (u.nickname || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesCode && !matchesProg && !matchesNick) {
          return false;
        }
      }

      // Sede Filter
      if (sedeFilter !== 'ALL') {
        if (u.sedeCodigo !== sedeFilter && u.sedeNombre !== sedeFilter) {
          return false;
        }
      }

      // Role Filter
      if (roleFilter === 'ADMIN_ONLY' && u.role !== 'admin') {
        return false;
      }
      if (roleFilter === 'STUDENT_ONLY' && u.role === 'admin') {
        return false;
      }

      return true;
    });
  }, [users, searchQuery, sedeFilter, roleFilter]);

  // Summary of the three missions, the closing story and the bonuses across filtered users (administrators who play also count).
  const missionStats = useMemo(() => {
    const summaries1 = filteredUsers.map((u) => getMissionSummary(u.progress));
    const completed1 = summaries1.filter((m) => m.completed).length;
    const started1 = summaries1.filter((m) => m.done > 0).length;
    const average1 = summaries1.length ? Math.round(summaries1.reduce((sum, m) => sum + m.percent, 0) / summaries1.length) : 0;

    const summaries2 = filteredUsers.map((u) => getDesafio2Summary(u.progress));
    const unlocked2 = summaries2.filter((m) => m.unlocked).length;
    const completed2 = summaries2.filter((m) => m.completed).length;

    const completed3 = filteredUsers.filter((u) => getDesafio3Summary(u.progress).completed).length;
    const finished = filteredUsers.filter((u) => getCierreSummary(u.progress).completed).length;
    const bonos = filteredUsers.reduce((sum, u) => sum + getBonosSummary(u.progress).bonos, 0);
    const bono1 = filteredUsers.filter((u) => getBonosSummary(u.progress).bono1.completed).length;
    const bono2 = filteredUsers.filter((u) => getBonosSummary(u.progress).bono2.completed).length;

    return { players: filteredUsers.length, completed1, started1, average1, unlocked2, completed2, completed3, finished, bonos, bono1, bono2 };
  }, [filteredUsers]);


  // 1. STATE: NOT AUTHENTICATED -> the one sign-in of the game (it brings administrators back here)
  if (!user) return <Navigate to="/login" replace />;

  // 2. STATE: LOGGED IN BUT NOT ADMIN -> Access Denied / First Admin Bootstrap
  if (isAdminUser === false) {
    return (
      <main className="h-dvh w-full bg-madera-900 flex items-center justify-center p-4 select-none overflow-y-auto relative">
        <WorldBackdrop />
        <div className="w-full max-w-lg bg-papel-50 rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-madera-600 text-center flex flex-col items-center z-10">
          <div className="w-16 h-16 rounded-full bg-oro-300 flex items-center justify-center text-madera-700 mb-4 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="font-serif text-2xl font-bold text-madera-800 mb-2">Acceso Restringido</h2>

          <p className="text-sm text-madera-600 mb-4 break-words">
            Has iniciado sesión con la cuenta <strong>{user.email}</strong>, pero este usuario no tiene privilegios de <strong>Administrador</strong> en el sistema.
          </p>
          {authError && <p className="text-xs text-carmesi mb-4">{authError}</p>}

          {/* If there are NO admins yet, allow initializing first admin */}
          {hasAnyAdminInDB === false && (
            <div className="w-full mb-5 p-4 rounded-2xl bg-papel-200 border border-papel-400 text-left text-xs text-madera-700">
              <p className="font-semibold text-madera-800 mb-1">👑 Acceso Inicial para Docentes y Coordinadores:</p>
              <p className="mb-3 text-madera-600">
                Aún no se ha asignado un administrador en el portal institucional. Como usuario de la Universidad del Valle, puedes activar tu cuenta como Administrador Principal.
              </p>
              <button
                onClick={handleClaimFirstAdmin}
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-musgo-600 hover:bg-musgo-700 text-white font-semibold rounded-xl text-sm transition cursor-pointer shadow-sm disabled:opacity-60"
              >
                {authLoading ? 'Activando...' : 'Activar mi cuenta como Administrador'}
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <button
              onClick={goPlay}
              className="flex-1 py-3 px-4 rounded-xl border border-madera-400 text-madera-700 font-semibold text-sm hover:bg-papel-200 transition cursor-pointer"
            >
              Ir al Mundo de Juego
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 py-3 px-4 rounded-xl bg-madera-600 hover:bg-madera-700 text-papel-100 font-semibold text-sm transition cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 3. STATE: LOADING ADMIN CHECK
  if (isAdminUser === null || authLoading) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center bg-madera-900 text-papel-100 gap-4">
        <div className="w-12 h-12 border-4 border-oro-400/30 border-t-oro-400 rounded-full animate-spin" />
        <p className="text-sm font-medium text-papel-300">Verificando credenciales de administrador...</p>
      </div>
    );
  }

  // 4. STATE: AUTHORIZED ADMIN DASHBOARD
  return (
    <div className="h-dvh w-full bg-papel-100 text-madera-800 flex flex-col overflow-hidden font-sans">
      {/* Top bar: the game's wood and gold */}
      <header className="bg-madera-800 text-papel-100 border-b-2 border-oro-600 px-3 sm:px-8 py-2.5 sm:py-3 pt-[max(0.625rem,env(safe-area-inset-top))] flex items-center justify-between gap-2 shrink-0 shadow-md z-20">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <span className="shrink-0 rounded-lg bg-papel-50 p-1 sm:p-1.5">
            <img src="/univalle.svg" alt="Univalle" className="w-7 sm:w-9 h-auto object-contain" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif font-bold text-base sm:text-xl leading-tight truncate">Brillo en la Montaña</h1>
              <span className="px-2 py-0.5 rounded-md bg-oro-400 text-madera-900 text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Panel admin
              </span>
            </div>
            <p className="text-xs text-papel-300 hidden md:block mt-0.5">Seguimiento en tiempo real del progreso de los estudiantes</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loadingUsers}
            className={`${HEADER_BUTTON} disabled:opacity-50`}
            title="Recargar datos"
            aria-label="Recargar datos"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin text-oro-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{refreshing ? 'Actualizando...' : 'Recargar'}</span>
          </button>

          <ManualButton variant="header" />

          <button onClick={goPlay} className={HEADER_BUTTON} title="Ver el mundo 3D" aria-label="Ver el mundo 3D">
            <span className="hidden md:inline">Ver Mundo 3D</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-3 border-l border-madera-500">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-oro-600 object-cover" />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-oro-400 text-madera-900 flex items-center justify-center text-sm font-bold">
                {user.name.charAt(0) || 'A'}
              </div>
            )}
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-sm font-bold leading-tight truncate max-w-[160px]">{user.name}</span>
              <span className="text-xs text-papel-300 truncate max-w-[160px]">{user.email}</span>
            </div>
            <button onClick={handleSignOut} className={HEADER_BUTTON} title="Cerrar sesión" aria-label="Cerrar sesión">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Scrollable) */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4 sm:space-y-6">
        {/* Missions summary (live): the number first, what it counts under it */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {[
            { label: 'Jugadores', value: missionStats.players, unit: 'en total', sub: `${missionStats.started1} han jugado` },
            { label: 'Misión 1 · Pantano', value: missionStats.completed1, unit: 'la superaron', sub: `${missionStats.average1}% de avance promedio` },
            { label: 'Misión 2 · Bosque', value: missionStats.unlocked2, unit: 'llegaron', sub: `${missionStats.completed2} la superaron` },
            { label: 'Misión 3 · Cumbre', value: missionStats.completed3, unit: 'la superaron', sub: 'Túneles, espectro y ogro' },
            { label: 'Juego completado', value: missionStats.finished, unit: 'con el cáliz', sub: `${missionStats.bonos} bonos obtenidos` },
            { label: 'Bono 1 · Estatua', value: missionStats.bono1, unit: 'lo obtuvieron', sub: 'Anillo de oro (pantano)' },
            { label: 'Bono 2 · Hada', value: missionStats.bono2, unit: 'lo obtuvieron', sub: 'Amuleto del hada (bosque)' },
          ].map(({ label, value, unit, sub }, index) => (
            <div key={label} className={`${CARD} p-3 sm:p-4 ${index === 0 ? 'col-span-2 lg:col-span-1' : ''}`}>
              <p className="text-[11px] sm:text-xs uppercase tracking-wide font-bold text-madera-500 leading-tight">{label}</p>
              <p className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                <span className="font-serif text-3xl font-bold text-madera-800 leading-none">{value}</span>
                <span className="text-sm font-semibold text-madera-600">{unit}</span>
              </p>
              <p className="text-xs text-madera-400 mt-1 leading-snug">{sub}</p>
            </div>
          ))}
        </section>

        {/* Search, filters and export */}
        <section className={`${CARD} p-3 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3`}>
          <div className="relative w-full lg:w-[420px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-madera-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar estudiante, código, correo o programa"
              className={`${FIELD} w-full pl-11 pr-9`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Borrar la búsqueda"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-madera-400 hover:text-madera-700 cursor-pointer text-sm"
              >
                ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto sm:justify-end">
            <select value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)} aria-label="Filtrar por sede" className={`${FIELD} min-w-0 font-medium cursor-pointer`}>
              <option value="ALL">Todas las sedes</option>
              {SEDES.map((s) => (
                <option key={s.codigo} value={s.codigo}>
                  {s.nombre}
                </option>
              ))}
            </select>

            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filtrar por rol" className={`${FIELD} min-w-0 font-medium cursor-pointer`}>
              <option value="ALL">Todos los roles</option>
              <option value="STUDENT_ONLY">Solo estudiantes</option>
              <option value="ADMIN_ONLY">Solo administradores</option>
            </select>

            <button
              onClick={() => exportUsersToCSV(filteredUsers)}
              className="col-span-2 py-3 px-5 bg-musgo-600 hover:bg-musgo-700 active:scale-[0.98] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              title="Descargar listado en formato Excel / CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Exportar CSV</span>
            </button>
          </div>
        </section>

        {/* Players: cards on phones and tablets, a table on wide screens */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3 px-1">
            <div className="flex items-center gap-2.5">
              <h2 className="font-serif font-bold text-madera-800 text-lg">Jugadores</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-papel-300 text-madera-700 text-xs font-bold">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            {loadingUsers && (
              <span className="text-sm text-carmesi flex items-center gap-2 font-medium animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-carmesi" />
                Cargando...
              </span>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <div className={`${CARD} py-12 px-4 text-center`}>
              <p className="font-serif font-bold text-base text-madera-700">No se encontraron jugadores</p>
              <p className="text-sm text-madera-400 mt-1">Prueba cambiando los filtros o la búsqueda.</p>
            </div>
          ) : (
            <>
              {/* Cards (under 1024 px) */}
              <ul className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredUsers.map((u) => (
                  <li key={u.uid} className={`${CARD} p-3.5 flex flex-col gap-3`}>
                    <div className="flex items-start gap-3">
                      <UserPhoto record={u} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-madera-800 leading-tight break-words">{u.nombresApellidos || u.name || 'Sin especificar'}</p>
                        <p className="text-xs text-madera-500 break-all mt-0.5">{u.email}</p>
                      </div>
                      <RoleChip admin={u.role === 'admin'} />
                    </div>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <Fact label="Código">{u.codigoEstudiantil ? <span className="font-mono font-semibold">{u.codigoEstudiantil}</span> : <span className="text-carmesi font-medium">Pendiente</span>}</Fact>
                      <Fact label="Sede">{u.sedeNombre || u.sedeCodigo || 'No asignada'}</Fact>
                      <Fact label="Programa" wide>
                        {u.programaNombre || u.programaCodigo || 'Sin programa'}
                      </Fact>
                      <Fact label="Personaje" wide>
                        {u.avatarName ? `${u.nickname || 'Sin alias'} · ${u.avatarName} (${u.gender === 'male' ? 'M' : 'F'})` : <span className="italic text-madera-400">No seleccionado</span>}
                      </Fact>
                    </dl>

                    <div className="space-y-2.5 rounded-xl bg-papel-100 border border-papel-300 p-3">
                      {userMissions(u).map((mission) => (
                        <MissionBar key={mission.title} mission={mission} titled />
                      ))}
                    </div>

                    <UserBonuses record={u} row />

                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <span className="flex items-center gap-2 text-xs text-madera-500">
                        Ley 1581
                        <ConsentChip signed={Boolean(u.acceptedLaw1581)} />
                      </span>
                      <button onClick={() => setSelectedUser(u)} className={`${OPEN_BUTTON} px-5 py-2.5`}>
                        Ver ficha
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Table (1024 px and up) */}
              <div className={`${CARD} hidden lg:block overflow-x-auto`}>
                <table className="w-full text-left text-sm text-madera-700 border-collapse">
                  <thead className="bg-papel-200 text-madera-600 font-bold border-b border-papel-300 uppercase tracking-wider text-xs">
                    <tr>
                      <th className="py-3.5 px-4">Estudiante</th>
                      <th className="py-3.5 px-4">Código</th>
                      <th className="py-3.5 px-4">Sede y programa</th>
                      <th className="py-3.5 px-4">Personaje</th>
                      <th className="py-3.5 px-4 min-w-[170px]">Misión 1: Pantano</th>
                      <th className="py-3.5 px-4 min-w-[170px]">Misión 2: Bosque</th>
                      <th className="py-3.5 px-4 min-w-[170px]">Misión 3 y cierre</th>
                      <th className="py-3.5 px-4 min-w-[170px]">Bonos</th>
                      <th className="py-3.5 px-4 text-center">Ley 1581</th>
                      <th className="py-3.5 px-4 text-center">Rol</th>
                      <th className="py-3.5 px-4 text-right">Ficha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-papel-300">
                    {filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-papel-100 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <UserPhoto record={u} />
                            <div>
                              <p className="font-bold text-madera-800 leading-tight">{u.nombresApellidos || u.name || 'Sin especificar'}</p>
                              <p className="text-xs text-madera-500 truncate max-w-[240px] mt-0.5">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.codigoEstudiantil ? (
                            <span className="font-mono px-2.5 py-1 bg-papel-200 text-madera-800 rounded-lg font-semibold text-xs">{u.codigoEstudiantil}</span>
                          ) : (
                            <span className="text-xs text-carmesi bg-carmesi-claro px-2.5 py-1 rounded-lg font-medium">Pendiente</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-madera-800 text-sm leading-tight">{u.sedeNombre || u.sedeCodigo || 'No asignada'}</p>
                          <p className="text-xs text-madera-500 truncate max-w-[240px] mt-0.5" title={u.programaNombre}>
                            {u.programaNombre || u.programaCodigo || 'Sin programa'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.avatarName ? (
                            <div>
                              <span className="font-bold text-madera-800 text-sm">{u.nickname || 'Sin alias'}</span>
                              <p className="text-xs text-madera-500 mt-0.5">
                                Avatar: {u.avatarName} ({u.gender === 'male' ? 'M' : 'F'})
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-madera-400 italic">No seleccionado</span>
                          )}
                        </td>
                        {userMissions(u).map((mission) => (
                          <td key={mission.title} className="py-3.5 px-4">
                            <MissionBar mission={mission} />
                          </td>
                        ))}
                        <td className="py-3.5 px-4">
                          <UserBonuses record={u} />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <ConsentChip signed={Boolean(u.acceptedLaw1581)} />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <RoleChip admin={u.role === 'admin'} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button onClick={() => setSelectedUser(u)} className={`${OPEN_BUTTON} px-4 py-2 whitespace-nowrap`}>
                            Ver ficha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Player record: a sheet from the bottom on phones, a centred window on wide screens */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-madera-900/70 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setSelectedUser(null)}>
          <div
            className="bg-papel-50 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border-2 border-madera-600 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Ficha del jugador"
          >
            <div className="p-4 sm:p-6 border-b border-papel-300 flex items-start justify-between gap-3 bg-papel-200">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <UserPhoto record={selectedUser} large />
                <div className="min-w-0">
                  <h3 className="font-serif font-bold text-madera-800 text-lg sm:text-xl leading-tight break-words">{selectedUser.nombresApellidos || selectedUser.name}</h3>
                  <p className="text-xs sm:text-sm text-madera-500 mt-0.5 break-all">{selectedUser.email}</p>
                  <div className="mt-1.5">
                    <RoleChip admin={selectedUser.role === 'admin'} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                aria-label="Cerrar la ficha"
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border-2 border-madera-600 text-madera-600 hover:bg-madera-600 hover:text-papel-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm text-madera-700">
              <div>
                <h4 className={SECTION_TITLE}>Datos académicos · Universidad del Valle</h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-papel-100 p-4 sm:p-5 rounded-2xl border border-papel-300">
                  <Fact label="Código estudiantil">
                    <span className="font-mono font-bold text-base">{selectedUser.codigoEstudiantil || 'No diligenciado'}</span>
                  </Fact>
                  <Fact label="Sede">{selectedUser.sedeNombre || selectedUser.sedeCodigo || 'No especificada'}</Fact>
                  <Fact label="Facultad">{selectedUser.facultadNombre || selectedUser.facultadCodigo || 'No especificada'}</Fact>
                  <Fact label="Programa académico">{selectedUser.programaNombre || selectedUser.programaCodigo || 'No especificado'}</Fact>
                </dl>
              </div>

              <div>
                <h4 className={SECTION_TITLE}>Personaje en el videojuego</h4>
                <dl className="grid grid-cols-3 gap-3.5 bg-papel-100 p-4 sm:p-5 rounded-2xl border border-papel-300">
                  <Fact label="Alias">{selectedUser.nickname || 'Sin alias'}</Fact>
                  <Fact label="Avatar 3D">{selectedUser.avatarName || 'No seleccionado'}</Fact>
                  <Fact label="Género">{selectedUser.gender === 'male' ? 'Masculino' : selectedUser.gender === 'female' ? 'Femenino' : 'No definido'}</Fact>
                </dl>
              </div>

              <div>
                <h4 className={SECTION_TITLE}>Vidas y derrotas</h4>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 bg-papel-100 p-4 sm:p-5 rounded-2xl border border-papel-300">
                  <Fact label="Estrellas">
                    {selectedUser.progress.estrellas} de {STARS}
                  </Fact>
                  <Fact label="Estrellas extra">{selectedUser.progress.vidasExtra}</Fact>
                  <Fact label="Extra perdidas">{selectedUser.progress.vidasExtraPerdidas}</Fact>
                  <Fact label="Vidas disponibles">{selectedUser.progress.estrellas + selectedUser.progress.vidasExtra}</Fact>
                  <Fact label="Derrotas totales">{countDerrotas(selectedUser.progress)}</Fact>
                  <Fact label="En el pantano">{selectedUser.progress.derrotas.desafio1 ?? 0}</Fact>
                  <Fact label="En el bosque">{selectedUser.progress.derrotas.desafio2 ?? 0}</Fact>
                  <Fact label="En la cumbre">{selectedUser.progress.derrotas.desafio3 ?? 0}</Fact>
                  <Fact label="Segundos bajos">{selectedUser.progress.reinicios.segundoBajo ?? 0}</Fact>
                  <Fact label="Terceros bajos">{selectedUser.progress.reinicios.tercerBajo ?? 0}</Fact>
                  <Fact label="Personajes perdidos" wide>
                    {(selectedUser.lostCharacters ?? []).join(', ') || 'Ninguno'}
                  </Fact>
                </dl>
              </div>

              {/* The three missions, the closing story and the bonuses (live) */}
              {(() => {
                const record = selectedUser;
                const mission = getMissionSummary(record.progress);
                const desafio2 = getDesafio2Summary(record.progress);
                const desafio3 = getDesafio3Summary(record.progress);
                const cierre = getCierreSummary(record.progress);
                const bonos = getBonosSummary(record.progress);
                const date = (iso: string | undefined) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }) : 'sin fecha');
                return (
                  <>
                    <MissionSection
                      title="Misión 1: El Pantano de la Tristeza"
                      summary={mission}
                      unlocked
                      note={
                        mission.completed && record.progress?.mision1CompletadaEn
                          ? `Completada el ${date(record.progress.mision1CompletadaEn)}`
                          : record.progressUpdatedAt
                            ? `Última actividad: ${date(record.progressUpdatedAt)}`
                            : 'Todavía no ha jugado.'
                      }
                      locked=""
                    />
                    <MissionSection
                      title="Misión 2: El Bosque de la Oscuridad"
                      summary={desafio2}
                      unlocked={desafio2.unlocked}
                      note={
                        desafio2.completed && record.progress?.mision2CompletadaEn
                          ? `Completada el ${date(record.progress.mision2CompletadaEn)}`
                          : `Herramientas élficas recogidas: ${desafio2.steps.filter((s) => s.id.startsWith('recoger-') && s.done).length} de 3 · Sendero oculto: ${desafio2.steps.find((s) => s.id === 'mapa')?.done ? 'despejado con el mapa' : 'cerrado por el muro de roca'}`
                      }
                      locked="Se habilita al completar la Misión 1 (Pantano de la Tristeza): el elfo espera al pie del gran árbol al otro lado del pantano."
                    />
                    <MissionSection
                      title="Misión 3: Los Túneles de la Cumbre"
                      summary={desafio3}
                      unlocked={desafio3.unlocked}
                      note={desafio3.completed ? `Completada el ${date(record.progress?.mision3CompletadaEn)}` : 'Brújula para el laberinto, muñeca para el espectro y guante para el ogro'}
                      locked="Se habilita al completar la Misión 2 (Bosque de la Oscuridad): Hedrig espera junto a la fogata de su casa, al pie de la cumbre."
                    />
                    <MissionSection
                      title="Relato de cierre: El Santuario y el Cáliz"
                      summary={cierre}
                      unlocked={cierre.unlocked}
                      note={cierre.completed ? `Juego completado el ${date(record.progress?.juegoCompletadoEn)}` : 'La dríada abre el santuario; el cáliz está sobre el altar'}
                      locked="Se habilita al llegar a la Cumbre de la Desesperación (Misión 3 completada)."
                    />
                    <MissionSection title="Bonos: La Estatua y el Hada" summary={bonos} unlocked note={`${bonos.bonos} de ${bonos.totalBonos} bonos obtenidos (opcionales)`} locked="" />
                  </>
                );
              })()}

              <div>
                <h4 className={SECTION_TITLE}>Tratamiento de datos (Ley 1581)</h4>
                <div className="bg-papel-100 p-4 sm:p-5 rounded-2xl border border-papel-300 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-madera-800">{selectedUser.acceptedLaw1581 ? 'Autorización otorgada' : 'Pendiente por autorizar'}</p>
                    <p className="text-xs sm:text-sm text-madera-500 mt-0.5">
                      Fecha:{' '}
                      {selectedUser.acceptedLaw1581Date
                        ? new Date(selectedUser.acceptedLaw1581Date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Sin registro'}
                    </p>
                  </div>
                  <ConsentChip signed={Boolean(selectedUser.acceptedLaw1581)} />
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-papel-300 bg-papel-200 flex items-center justify-end">
              <button onClick={() => setSelectedUser(null)} className={`${OPEN_BUTTON} w-full sm:w-auto py-3 sm:py-2.5 px-6`}>
                Cerrar ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// The dashboard wears the game's colours: parchment panels, wood borders and text, gold accents, moss for what is done.
const CARD = 'bg-papel-50 rounded-2xl border border-papel-400 shadow-[0_2px_6px_rgba(62,39,35,0.12)]';
const FIELD =
  'py-3 px-3.5 bg-papel-100 border border-papel-400 rounded-xl text-base sm:text-sm text-madera-800 placeholder-madera-300 focus:outline-none focus:ring-2 focus:ring-oro-600/30 focus:border-oro-600 transition';
const HEADER_BUTTON =
  'h-9 min-w-9 px-2 sm:px-3.5 rounded-xl border border-madera-500 text-papel-100 hover:bg-madera-600 text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer';
const OPEN_BUTTON = 'rounded-xl bg-madera-600 hover:bg-madera-700 active:scale-[0.98] text-papel-100 text-sm font-semibold transition cursor-pointer shadow-sm';
const SECTION_TITLE = 'font-serif font-bold text-sm uppercase tracking-wider text-carmesi mb-2.5';

const shortDate = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

// A mission as the list shows it: how far the player got, or that it is still locked.
type MissionGlance = { title: string; locked: boolean; label: string; percent: number; completed: boolean; note: string };

// The three missions of a player at a glance (the third one carries the closing story and the bonuses in its note).
function userMissions(record: AdminUserRecord): MissionGlance[] {
  const mission = getMissionSummary(record.progress);
  const desafio2 = getDesafio2Summary(record.progress);
  const desafio3 = getDesafio3Summary(record.progress);
  const cierre = getCierreSummary(record.progress);
  const bonos = getBonosSummary(record.progress);
  const steps = (summary: { done: number; total: number; completed: boolean }) => (summary.completed ? 'Completada' : `${summary.done} de ${summary.total} pasos`);
  return [
    {
      title: 'Misión 1 · Pantano',
      locked: false,
      label: steps(mission),
      percent: mission.percent,
      completed: mission.completed,
      note:
        mission.completed && record.progress?.mision1CompletadaEn
          ? `Superado: ${shortDate(record.progress.mision1CompletadaEn)}`
          : record.progressUpdatedAt
            ? `Activo: ${shortDate(record.progressUpdatedAt)}`
            : 'Sin actividad',
    },
    {
      title: 'Misión 2 · Bosque',
      locked: !desafio2.unlocked,
      label: steps(desafio2),
      percent: desafio2.percent,
      completed: desafio2.completed,
      note:
        desafio2.completed && record.progress?.mision2CompletadaEn
          ? `Superado: ${shortDate(record.progress.mision2CompletadaEn)}`
          : `${desafio2.steps.find((s) => s.id === 'duendes')?.status} duendes · ${desafio2.steps.find((s) => s.id === 'frutos')?.status} frutas`,
    },
    {
      title: 'Misión 3 y cierre',
      locked: !desafio3.unlocked,
      label: cierre.completed ? 'Juego completado' : steps(desafio3),
      percent: desafio3.percent,
      completed: desafio3.completed,
      note: desafio3.unlocked ? `Cierre: ${cierre.done} de ${cierre.total} · Bonos: ${bonos.bonos} de ${bonos.totalBonos}` : bonos.bonos > 0 ? `Bonos: ${bonos.bonos} de ${bonos.totalBonos}` : '',
    },
  ];
}

// One mission of a player in the list: its bar, how far it got and a line of detail. `titled` writes its name over it
// (the cards; in the table the column says it).
function MissionBar({ mission, titled = false }: { mission: MissionGlance; titled?: boolean }) {
  const { title, locked, label, percent, completed, note } = mission;
  return (
    <div className="min-w-[150px]">
      {titled && <p className="text-[11px] uppercase tracking-wide font-bold text-madera-500 mb-1">{title}</p>}
      {locked ? (
        <span className="text-xs text-madera-400 bg-papel-200 px-2.5 py-1 rounded-lg font-medium inline-block">Bloqueada</span>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className={completed ? 'text-musgo-700 font-bold' : 'text-madera-700'}>{label}</span>
            <span className="text-madera-500">{percent}%</span>
          </div>
          <ProgressTrack percent={percent} completed={completed} />
        </>
      )}
      {note && <p className="text-[11px] text-madera-400 mt-1">{note}</p>}
    </div>
  );
}

function ProgressTrack({ percent, completed, tall = false }: { percent: number; completed: boolean; tall?: boolean }) {
  return (
    <div className={`w-full bg-papel-300 ${tall ? 'h-2.5' : 'h-2'} rounded-full overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-500 ${completed ? 'bg-musgo-500' : 'bg-oro-600'}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

// The player's picture, or their initial.
function UserPhoto({ record, large = false }: { record: AdminUserRecord; large?: boolean }) {
  const size = large ? 'w-12 h-12 sm:w-14 sm:h-14 text-lg' : 'w-10 h-10 text-sm';
  return record.photoURL ? (
    <img src={record.photoURL} alt="" className={`${size} rounded-full border-2 border-papel-400 object-cover shrink-0`} />
  ) : (
    <div className={`${size} rounded-full bg-madera-600 text-papel-100 flex items-center justify-center font-bold shrink-0`}>
      {(record.nombresApellidos || record.name || 'U').charAt(0)}
    </div>
  );
}

function RoleChip({ admin }: { admin: boolean }) {
  return admin ? (
    <span className="inline-block px-2.5 py-1 rounded-lg bg-madera-800 text-oro-300 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Admin</span>
  ) : (
    <span className="inline-block px-2.5 py-1 rounded-lg bg-papel-200 text-madera-600 text-xs font-semibold whitespace-nowrap">Estudiante</span>
  );
}

function ConsentChip({ signed }: { signed: boolean }) {
  return signed ? (
    <span className="inline-block px-3 py-1 rounded-full bg-musgo-50 text-musgo-700 text-xs font-bold whitespace-nowrap">Firmado</span>
  ) : (
    <span className="inline-block px-3 py-1 rounded-full bg-carmesi-claro text-carmesi text-xs font-bold whitespace-nowrap">Pendiente</span>
  );
}

// A named fact of a player's record (`wide` takes the whole row of its grid).
function Fact({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${wide ? 'col-span-full' : ''}`}>
      <dt className="text-[11px] uppercase tracking-wide font-bold text-madera-400">{label}</dt>
      <dd className="font-semibold text-madera-800 mt-0.5 break-words">{children}</dd>
    </div>
  );
}

// The two bonuses of a player: one under the other in the table, side by side on a card.
function UserBonuses({ record, row = false }: { record: AdminUserRecord; row?: boolean }) {
  const { bono1, bono2 } = getBonosSummary(record.progress);
  return (
    <div className={row ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-1.5 min-w-[150px]'}>
      <BonusChip label="Bono 1 · Estatua" part={bono1} />
      <BonusChip label="Bono 2 · Hada" part={bono2} />
    </div>
  );
}

type BonusPart = { done: number; total: number; completed: boolean };

// One bonus in the list: obtained, under way (steps done) or not started.
function BonusChip({ label, part }: { label: string; part: BonusPart }) {
  const tone = part.completed ? 'bg-musgo-50 text-musgo-700 border-musgo-200' : part.done > 0 ? 'bg-oro-300/40 text-madera-700 border-oro-400' : 'bg-papel-200 text-madera-500 border-papel-300';
  return (
    <span className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${tone}`}>
      <span>{label}</span>
      <span className="whitespace-nowrap">{part.completed ? 'Obtenido' : `${part.done}/${part.total}`}</span>
    </span>
  );
}

type MissionSectionProps = {
  title: string;
  summary: { steps: MissionStep[]; done: number; total: number; percent: number; completed: boolean };
  unlocked: boolean;
  // Line under the progress bar.
  note: string;
  // Shown instead of the steps while it is locked.
  locked: string;
};

// A mission in the player's record: its title, how far it got and its steps.
function MissionSection({ title, summary, unlocked, note, locked }: MissionSectionProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-2.5 gap-x-2 gap-y-1.5">
        <h4 className={`${SECTION_TITLE} mb-0`}>{title}</h4>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${summary.completed ? 'bg-musgo-50 text-musgo-700' : unlocked ? 'bg-papel-200 text-madera-700' : 'bg-papel-200 text-madera-400'}`}
        >
          {summary.completed ? 'Completada' : unlocked ? `${summary.done} de ${summary.total} pasos (${summary.percent}%)` : 'Bloqueada'}
        </span>
      </div>
      {unlocked ? (
        <>
          <ProgressTrack percent={summary.percent} completed={summary.completed} tall />
          <p className="text-xs text-madera-500 mt-2 mb-3.5">{note}</p>
          <MissionSteps steps={summary.steps} />
        </>
      ) : (
        <p className="text-xs text-madera-500 bg-papel-100 p-3.5 rounded-xl border border-papel-300">{locked}</p>
      )}
    </div>
  );
}

// Steps of a mission in order, done ones checked.
function MissionSteps({ steps }: { steps: MissionStep[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-start gap-3 p-3 rounded-2xl border border-papel-300 bg-papel-100">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${step.done ? 'bg-musgo-200 text-musgo-700' : 'bg-papel-300 text-madera-500'}`}>
            {step.done ? '✓' : index + 1}
          </span>
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-madera-800 text-sm">{step.label}</p>
              <p className="text-xs text-madera-500">{step.detail}</p>
            </div>
            <span
              className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${step.done ? 'bg-musgo-50 text-musgo-700' : step.status === 'Rechazó la ayuda' ? 'bg-carmesi-claro text-carmesi' : 'bg-papel-200 text-madera-500'}`}
            >
              {step.status ?? (step.done ? 'Hecho' : 'Pendiente')}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
