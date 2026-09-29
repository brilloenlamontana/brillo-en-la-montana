import React, { useState, useEffect, useMemo } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase.config';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  fetchAllUsers,
  checkIsAdmin,
  checkHasAnyAdmin,
  exportUsersToCSV,
  type AdminUserRecord,
  getEnvAdminEmails
} from '../services/adminService';
import { SEDES } from '../data/univalleData';
import { SnowEffect } from '../components/environment/SnowEffect';
import { LoginLayout } from '../components/auth/LoginLayout';

export const AdminPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  // Authentication & authorization states
  const [authLoading, setAuthLoading] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasAnyAdminInDB, setHasAnyAdminInDB] = useState<boolean | null>(null);

  // Users data states
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sedeFilter, setSedeFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Verify admin status when user changes
  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      if (!user) {
        if (isMounted) {
          setIsAdminUser(null);
          setUsers([]);
        }
        return;
      }

      try {
        setAuthLoading(true);
        // Fetch user doc directly to get latest role
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        const firestoreData = docSnap.exists() ? docSnap.data() : null;

        const isAdmin = checkIsAdmin(user, firestoreData);

        if (isAdmin) {
          if (isMounted) {
            setIsAdminUser(true);
            setAuthError(null);
          }
          await loadUsers();
        } else {
          // Check if there are ANY admins in the database (bootstrap mode)
          const anyAdmin = await checkHasAnyAdmin();
          if (isMounted) {
            setHasAnyAdminInDB(anyAdmin);
            setIsAdminUser(false);
          }
        }
      } catch (err) {
        console.error('Error verifying admin status:', err);
        if (isMounted) {
          setAuthError('Error al verificar permisos de administrador en la base de datos.');
          setIsAdminUser(false);
        }
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const userList = await fetchAllUsers();
      setUsers(userList);
    } catch (err) {
      console.error('Error loading users:', err);
      alert('Error al cargar la lista de usuarios.');
    } finally {
      setLoadingUsers(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const loggedUser = result.user;

      if (!loggedUser) return;

      const email = (loggedUser.email || '').toLowerCase().trim();
      const adminEmails = getEnvAdminEmails();
      const isUnivalle = email.endsWith('@correounivalle.edu.co');
      const isConfiguredAdmin = adminEmails.includes(email);

      // Validate email domain
      if (!isUnivalle && !isConfiguredAdmin) {
        await signOut(auth);
        setUser(null);
        setAuthError(`El correo ${email} no es institucional. Solo se admiten cuentas institucionales de la Universidad del Valle (@correounivalle.edu.co).`);
        return;
      }

      // Check user document in Firestore
      const userRef = doc(db, 'users', loggedUser.uid);
      const docSnap = await getDoc(userRef);
      const firestoreData = docSnap.exists() ? docSnap.data() : null;

      // Auto-assign admin if email matches environment configuration
      if (isConfiguredAdmin && (!firestoreData || firestoreData.role !== 'admin')) {
        await setDoc(userRef, { role: 'admin', isAdmin: true }, { merge: true });
      }

      const isAdmin = checkIsAdmin({
        uid: loggedUser.uid,
        email: loggedUser.email || '',
        name: loggedUser.displayName || '',
        photoURL: loggedUser.photoURL || '',
      }, firestoreData);

      if (!isAdmin) {
        const anyAdmin = await checkHasAnyAdmin();
        setHasAnyAdminInDB(anyAdmin);
        setIsAdminUser(false);
      }
    } catch (err: any) {
      console.error('Error signing in for admin:', err);
      setAuthError('Error al iniciar sesión con Google. Inténtalo de nuevo.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleClaimFirstAdmin = async () => {
    if (!user) return;
    try {
      setAuthLoading(true);
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        name: user.name,
        role: 'admin',
        isAdmin: true,
      }, { merge: true });

      setIsAdminUser(true);
      setAuthError(null);
      await loadUsers();
    } catch (err) {
      console.error('Error claiming admin role:', err);
      alert('Error al asignar rol de administrador inicial.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdminUser(null);
      setUsers([]);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
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


  // 1. STATE: NOT AUTHENTICATED -> Show Admin Login
  if (!user) {
    return (
      <LoginLayout
        accessType="admin"
        onSignIn={handleGoogleSignIn}
        loading={authLoading}
        errorMessage={authError}
      />
    );
  }

  // 2. STATE: LOGGED IN BUT NOT ADMIN -> Access Denied / First Admin Bootstrap
  if (isAdminUser === false) {
    return (
      <main className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4 select-none overflow-y-auto relative">
        <SnowEffect />
        <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 text-center flex flex-col items-center z-10">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>

          <p className="text-sm text-slate-600 mb-4">
            Has iniciado sesión con la cuenta <strong>{user.email}</strong>, pero este usuario no tiene privilegios de <strong>Administrador</strong> en el sistema.
          </p>

          {/* If there are NO admins yet, allow initializing first admin */}
          {hasAnyAdminInDB === false && (
            <div className="w-full mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-left text-xs text-blue-900">
              <p className="font-semibold text-blue-800 mb-1">👑 Acceso Inicial para Docentes y Coordinadores:</p>
              <p className="mb-3 text-blue-700">
                Aún no se ha asignado un administrador en el portal institucional. Como usuario de la Universidad del Valle, puedes activar tu cuenta como Administrador Principal.
              </p>
              <button
                onClick={handleClaimFirstAdmin}
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition cursor-pointer shadow-sm disabled:opacity-60"
              >
                {authLoading ? 'Activando...' : 'Activar mi cuenta como Administrador'}
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <button
              onClick={() => navigate('/mundo')}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Ir al Mundo de Juego
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs transition cursor-pointer"
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
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-300">Verificando credenciales de administrador...</p>
      </div>
    );
  }

  // 4. STATE: AUTHORIZED ADMIN DASHBOARD
  return (
    <div className="h-screen w-full bg-slate-100 text-slate-900 flex flex-col overflow-hidden font-sans">
      {/* Top Navbar */}
      <header className="h-18 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3.5">
          <img src="/univalle.svg" alt="Univalle" className="w-10 h-auto object-contain" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-bold text-slate-900 text-lg sm:text-xl leading-tight">
                Brillo en la Montaña
              </h1>
              <span className="px-2.5 py-0.5 rounded-md bg-red-100 text-[#C8102E] text-xs font-bold uppercase tracking-wider">
                Panel Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
              Monitoreo académico y seguimiento en tiempo real del progreso estudiantil
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loadingUsers}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-2 transition cursor-pointer font-medium disabled:opacity-50"
            title="Recargar datos"
          >
            <svg
              className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin text-[#C8102E]' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{refreshing ? 'Actualizando...' : 'Recargar'}</span>
          </button>

          <button
            onClick={() => navigate('/mundo')}
            className="hidden md:flex px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium items-center gap-2 transition cursor-pointer"
          >
            <span>Ver Mundo 3D</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          {/* Admin User Profile Capsule */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-9 h-9 rounded-full border border-slate-200 object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#C8102E] text-white flex items-center justify-center text-sm font-bold">
                {user.name.charAt(0) || 'A'}
              </div>
            )}
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-sm font-bold text-slate-800 leading-tight truncate max-w-[160px]">{user.name}</span>
              <span className="text-xs text-slate-500 truncate max-w-[160px]">{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
              title="Cerrar sesión"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Scrollable) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">



        {/* Toolbar & Filters Card */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full lg:w-[420px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por estudiante, código, email o programa..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer text-sm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Select Filters and Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Sede Filter */}
            <select
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value)}
              className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:border-[#C8102E] transition cursor-pointer"
            >
              <option value="ALL">Todas las Sedes</option>
              {SEDES.map((s) => (
                <option key={s.codigo} value={s.codigo}>
                  {s.nombre}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:border-[#C8102E] transition cursor-pointer"
            >
              <option value="ALL">Todos los Roles</option>
              <option value="STUDENT_ONLY">Solo Estudiantes</option>
              <option value="ADMIN_ONLY">Solo Administradores</option>
            </select>

            {/* Export CSV Button */}
            <button
              onClick={() => exportUsersToCSV(filteredUsers)}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-xl text-sm flex items-center gap-2 shadow-sm transition cursor-pointer ml-auto sm:ml-0"
              title="Descargar listado en formato Excel / CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Exportar CSV</span>
            </button>
          </div>
        </section>

        {/* Users Table Card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">Listado de Usuarios</h2>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            {loadingUsers && (
              <span className="text-sm text-[#C8102E] flex items-center gap-2 font-medium animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C8102E]" />
                Cargando datos...
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 border-collapse">
              <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-4 px-5">Estudiante</th>
                  <th className="py-4 px-5">Código</th>
                  <th className="py-4 px-5">Sede y Programa</th>
                  <th className="py-4 px-5">Personaje</th>
                  <th className="py-4 px-5 text-center">Datos Ley 1581</th>
                  <th className="py-4 px-5 text-center">Rol</th>
                  <th className="py-4 px-5 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-semibold text-base text-slate-600">No se encontraron usuarios coincidentes</p>
                        <p className="text-sm text-slate-400">Prueba cambiando los filtros o el término de búsqueda.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isAdmin = u.role === 'admin';

                    return (
                      <tr
                        key={u.uid}
                        className="hover:bg-slate-50/90 transition-colors"
                      >
                        {/* Student Name & Email */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3.5">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {(u.nombresApellidos || u.name || 'U').charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                                {u.nombresApellidos || u.name || 'Sin especificar'}
                              </p>
                              <p className="text-xs sm:text-sm text-slate-500 truncate max-w-[240px] mt-0.5">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Student Code */}
                        <td className="py-4 px-5">
                          {u.codigoEstudiantil ? (
                            <span className="font-mono px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg font-semibold text-xs sm:text-sm">
                              {u.codigoEstudiantil}
                            </span>
                          ) : (
                            <span className="text-xs sm:text-sm text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg font-medium">
                              Pendiente
                            </span>
                          )}
                        </td>

                        {/* Sede and Program */}
                        <td className="py-4 px-5">
                          <p className="font-bold text-slate-800 text-sm leading-tight">
                            {u.sedeNombre || u.sedeCodigo || 'No asignada'}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-500 truncate max-w-[240px] mt-0.5" title={u.programaNombre}>
                            {u.programaNombre || u.programaCodigo || 'Sin programa'}
                          </p>
                        </td>

                        {/* Character 3D & Nickname */}
                        <td className="py-4 px-5">
                          {u.avatarName ? (
                            <div>
                              <span className="font-bold text-slate-800 text-sm">
                                {u.nickname || 'Sin alias'}
                              </span>
                              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                Avatar: {u.avatarName} ({u.gender === 'male' ? 'M' : 'F'})
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 italic">No seleccionado</span>
                          )}
                        </td>

                        {/* Law 1581 Consent */}
                        <td className="py-4 px-5 text-center">
                          {u.acceptedLaw1581 ? (
                            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-semibold">
                              Firmado
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs sm:text-sm font-medium">
                              Pendiente
                            </span>
                          )}
                        </td>

                        {/* User Role */}
                        <td className="py-4 px-5 text-center">
                          {isAdmin ? (
                            <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold text-xs sm:text-sm uppercase tracking-wider">
                              Admin
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs sm:text-sm font-medium">
                              Estudiante
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition cursor-pointer shadow-xs"
                          >
                            Ver Ficha
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* User Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                {selectedUser.photoURL ? (
                  <img src={selectedUser.photoURL} alt="" className="w-14 h-14 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#C8102E] text-white flex items-center justify-center font-bold text-lg">
                    {(selectedUser.nombresApellidos || selectedUser.name || 'U').charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-slate-900 text-lg sm:text-xl leading-tight">
                      {selectedUser.nombresApellidos || selectedUser.name}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {selectedUser.role === 'admin' ? 'Administrador' : 'Estudiante'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{selectedUser.email}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">

              {/* Section 1: Academic Data */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-[#C8102E] mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  Datos Académicos Universidad del Valle
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-semibold">Código Estudiantil</span>
                    <span className="font-mono font-bold text-slate-900 text-base mt-0.5 block">
                      {selectedUser.codigoEstudiantil || 'No diligenciado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-semibold">Sede</span>
                    <span className="font-bold text-slate-800 text-sm sm:text-base mt-0.5 block">
                      {selectedUser.sedeNombre || selectedUser.sedeCodigo || 'No especificada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-semibold">Facultad</span>
                    <span className="font-semibold text-slate-800 text-sm sm:text-base mt-0.5 block">
                      {selectedUser.facultadNombre || selectedUser.facultadCodigo || 'No especificada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-semibold">Programa Académico</span>
                    <span className="font-semibold text-slate-800 text-sm sm:text-base mt-0.5 block">
                      {selectedUser.programaNombre || selectedUser.programaCodigo || 'No especificado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Character 3D & Avatar */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-[#C8102E] mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Configuración del Avatar en el Videojuego
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-semibold">Alias (Nickname)</span>
                    <span className="font-bold text-slate-800 text-sm sm:text-base mt-0.5 block">{selectedUser.nickname || 'Sin alias'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-semibold">Avatar 3D</span>
                    <span className="font-semibold text-slate-800 text-sm sm:text-base mt-0.5 block">{selectedUser.avatarName || 'No seleccionado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-semibold">Género</span>
                    <span className="font-semibold text-slate-800 text-sm sm:text-base mt-0.5 block">
                      {selectedUser.gender === 'male' ? 'Masculino' : selectedUser.gender === 'female' ? 'Femenino' : 'No definido'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Game Progress Details */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-[#C8102E] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Progreso en las Actividades de Inducción
                  </h4>
                  {(() => {
                    const completed = (selectedUser.progress?.openedMayorLetter ? 1 : 0) + (selectedUser.progress?.interactedWithImeri ? 1 : 0);
                    const pct = Math.round((completed / 2) * 100);
                    return (
                      <span className="text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                        {completed} de 2 actividades ({pct}%)
                      </span>
                    );
                  })()}
                </div>

                {/* Visual Progress Bar */}
                {(() => {
                  const completed = (selectedUser.progress?.openedMayorLetter ? 1 : 0) + (selectedUser.progress?.interactedWithImeri ? 1 : 0);
                  const pct = Math.round((completed / 2) * 100);
                  return (
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-200'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  );
                })()}

                <div className="space-y-2.5">
                  {/* Activity 1: Mayor Letter */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0">
                        📜
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">Lectura de la Carta del Alcalde</p>
                        <p className="text-xs sm:text-sm text-slate-500">Mensaje de bienvenida en el pergamino de la plaza</p>
                      </div>
                    </div>
                    {selectedUser.progress?.openedMayorLetter ? (
                      <span className="px-3.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Leída
                      </span>
                    ) : (
                      <span className="px-3.5 py-1.5 bg-slate-100 text-slate-500 rounded-full text-xs sm:text-sm font-medium">
                        Pendiente
                      </span>
                    )}
                  </div>

                  {/* Activity 2: Imeri Interaction */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-xl shrink-0">
                        🧙‍♂️
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">Orientación con el Guía Imeri</p>
                        <p className="text-xs sm:text-sm text-slate-500">Diálogo introductorio de acogida universitaria</p>
                      </div>
                    </div>
                    {selectedUser.progress?.interactedWithImeri ? (
                      <span className="px-3.5 py-1.5 bg-purple-100 text-purple-800 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Completada
                      </span>
                    ) : (
                      <span className="px-3.5 py-1.5 bg-slate-100 text-slate-500 rounded-full text-xs sm:text-sm font-medium">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Consent & Authorization */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-[#C8102E] mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Tratamiento de Datos Institucionales (Ley 1581)
                </h4>
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm sm:text-base">
                      Estado: {selectedUser.acceptedLaw1581 ? 'Autorización otorgada' : 'Pendiente por autorizar'}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Fecha: {selectedUser.acceptedLaw1581Date ? new Date(selectedUser.acceptedLaw1581Date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sin registro'}
                    </p>
                  </div>
                  <span className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold ${selectedUser.acceptedLaw1581 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                    {selectedUser.acceptedLaw1581 ? 'Válido' : 'Pendiente'}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="py-2.5 px-6 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm transition cursor-pointer shadow-xs"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
