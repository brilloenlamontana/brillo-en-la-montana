import React, { useState, useEffect, useMemo } from 'react';
import { type UserData } from '../store/authStore';
import { Law1581ConsentModal } from './Law1581ConsentModal';
import {
  getSedes,
  getFacultades,
  getProgramasAcademicos
} from '../services/academicService';
import {
  type Sede,
  type Facultad,
  type ProgramaAcademico,
  formatFullName
} from '../data/univalleData';

export interface StudentRegistrationData {
  nombresApellidos: string;
  email: string;
  codigoEstudiantil: string;
  sedeCodigo: string;
  sedeNombre: string;
  facultadCodigo: string;
  facultadNombre: string;
  programaCodigo: string;
  programaNombre: string;
  acceptedLaw1581?: boolean;
  acceptedLaw1581Date?: string;
}

interface StudentRegistrationModalProps {
  isOpen: boolean;
  user: UserData | null;
  onSubmit: (data: StudentRegistrationData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const StudentRegistrationModal: React.FC<StudentRegistrationModalProps> = ({
  isOpen,
  user,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  if (!isOpen || !user) return null;

  return (
    <StudentRegistrationModalContent
      user={user}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isSubmitting={isSubmitting}
    />
  );
};

const StudentRegistrationModalContent: React.FC<{
  user: UserData;
  onSubmit: (data: StudentRegistrationData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting: boolean;
}> = ({ user, onSubmit, onCancel, isSubmitting }) => {
  // Format Name: Title Case (cada palabra la primera en mayúscula, las demás en minúscula)
  const formattedName = useMemo(() => formatFullName(user.name), [user.name]);
  const userEmail = user.email || '';

  // Student Code: 20 fixed prefix + 7 student digits (exactly 9 characters total)
  const [studentDigits, setStudentDigits] = useState('');
  
  // Academic selections
  const [sedesList, setSedesList] = useState<Sede[]>([]);
  const [facultadesList, setFacultadesList] = useState<Facultad[]>([]);
  const [programasList, setProgramasList] = useState<ProgramaAcademico[]>([]);

  const [selectedSede, setSelectedSede] = useState<string>('');
  const [selectedFacultad, setSelectedFacultad] = useState<string>('');
  const [selectedPrograma, setSelectedPrograma] = useState<string>('');

  // Ley 1581 Terms & Data Processing Consent
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(Boolean(user.acceptedLaw1581));
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  const [loadingAcademicData, setLoadingAcademicData] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Sedes and Facultades from local JSON catalog
  useEffect(() => {
    let isMounted = true;
    const loadAcademicOptions = async () => {
      try {
        setLoadingAcademicData(true);
        const [sedes, facultades] = await Promise.all([
          getSedes(),
          getFacultades()
        ]);
        if (isMounted) {
          setSedesList(sedes);
          setFacultadesList(facultades);
        }
      } catch (err) {
        console.error('Error loading academic data:', err);
      } finally {
        if (isMounted) {
          setLoadingAcademicData(false);
        }
      }
    };

    loadAcademicOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update Programs whenever Sede or Facultad changes
  useEffect(() => {
    let isMounted = true;
    const fetchPrograms = async () => {
      if (!selectedSede || !selectedFacultad) {
        setProgramasList([]);
        setSelectedPrograma('');
        return;
      }

      try {
        const progs = await getProgramasAcademicos(selectedSede, selectedFacultad);
        if (isMounted) {
          setProgramasList(progs);
          // Reset program if current is not in filtered list
          if (!progs.some(p => p.codigo === selectedPrograma)) {
            setSelectedPrograma('');
          }
        }
      } catch (err) {
        console.error('Error filtering programs:', err);
      }
    };

    fetchPrograms();
    return () => {
      isMounted = false;
    };
  }, [selectedSede, selectedFacultad, selectedPrograma]);

  // Handle student digits input: strictly numeric, max 7 digits
  const handleStudentDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 7);
    setStudentDigits(numericOnly);
    setErrorMessage(null);
  };

  const fullStudentCode = `20${studentDigits}`;
  const isCodeValid = studentDigits.length === 7; // 20 + 7 digits = 9 characters

  const isFormValid =
    isCodeValid &&
    Boolean(selectedSede) &&
    Boolean(selectedFacultad) &&
    Boolean(selectedPrograma) &&
    acceptedTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCodeValid) {
      setErrorMessage('El código estudiantil debe tener exactamente 9 dígitos (20 + 7 dígitos).');
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage('Debes autorizar el tratamiento de datos personales institucional conforme a la Ley 1581 de 2012.');
      return;
    }

    const sedeObj = sedesList.find(s => s.codigo === selectedSede);
    const facObj = facultadesList.find(f => f.codigo === selectedFacultad);
    const progObj = programasList.find(p => p.codigo === selectedPrograma);

    if (!sedeObj || !facObj || !progObj) {
      setErrorMessage('Por favor completa la sede, facultad y programa académico.');
      return;
    }

    try {
      await onSubmit({
        nombresApellidos: formattedName,
        email: userEmail,
        codigoEstudiantil: fullStudentCode,
        sedeCodigo: sedeObj.codigo,
        sedeNombre: sedeObj.nombre,
        facultadCodigo: facObj.codigo,
        facultadNombre: facObj.nombre,
        programaCodigo: progObj.codigo,
        programaNombre: progObj.nombre,
        acceptedLaw1581: true,
        acceptedLaw1581Date: user.acceptedLaw1581Date || new Date().toISOString()
      });
    } catch (err) {
      console.error('Error in student registration submit:', err);
      setErrorMessage('Ocurrió un error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-registration-title"
    >
      <div
        className="w-full max-w-xl max-h-[92dvh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-100 bg-gradient-to-r from-red-50/70 via-white to-slate-50 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center p-1.5 flex-shrink-0">
              <img
                src="/univalle.svg"
                alt="Logo Universidad del Valle"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-red-100 text-[#C8102E] tracking-wide mb-0.5">
                Primer Ingreso • Registro Institucional
              </span>
              <h2
                id="student-registration-title"
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
              >
                Completa tu Registro Estudiantil
              </h2>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6 space-y-4 sm:space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2 animate-fade-in">
              <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Nombres y Apellidos (Pre-filled, Title Case, Read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Nombres y Apellidos</span>
              <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" />
                </svg>
                No modificable
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formattedName}
                readOnly
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-700 text-sm font-medium cursor-not-allowed outline-none select-text"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Datos obtenidos de tu cuenta institucional de Google.
            </p>
          </div>

          {/* 2. Correo Electrónico (Pre-filled, Read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Correo Electrónico Institucional</span>
              <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" />
                </svg>
                No modificable
              </span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={userEmail}
                readOnly
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-700 text-sm font-medium cursor-not-allowed outline-none select-text"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                Código Estudiantil <strong className="text-[#C8102E]">*</strong>
              </span>
              
            </label>

            <div className="flex rounded-xl overflow-hidden border border-slate-300 focus-within:border-[#C8102E] focus-within:ring-2 focus-within:ring-red-100 transition-all bg-white shadow-sm">
              {/* Fixed unmodifiable '20' prefix */}
              <div className="pl-3.5 py-2.5 flex items-center justify-center font-mono  text-slate-700 select-none text-sm">
                <span>20</span>
              </div>

              {/* 7 digits entry */}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={7}
                placeholder="Ej: 2147698"
                value={studentDigits}
                onChange={handleStudentDigitsChange}
                disabled={isSubmitting}
                className="flex-1 py-2.5 pr-3.5 text-slate-800 font-mono text-sm tracking-wider outline-none bg-transparent placeholder:text-slate-400 placeholder:font-sans"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Ingresa únicamente los <strong>7 dígitos</strong> restantes (ej: <em>2510047</em>).
            </p>
          </div>

          {/* 4. Sede (Dropdown from local JSON) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              Sede Universitaria <strong className="text-[#C8102E]">*</strong>
            </label>
            <div className="relative">
              <select
                value={selectedSede}
                onChange={(e) => {
                  setSelectedSede(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isSubmitting || loadingAcademicData}
                className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl bg-white border border-slate-300 focus:border-[#C8102E] focus:ring-2 focus:ring-red-100 outline-none text-slate-800 text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">-- Selecciona tu Sede --</option>
                {sedesList.map((sede) => (
                  <option key={sede.codigo} value={sede.codigo}>
                    {sede.nombre} ({sede.codigo})
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* 5. Facultad (Dropdown from local JSON) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              Facultad <strong className="text-[#C8102E]">*</strong>
            </label>
            <div className="relative">
              <select
                value={selectedFacultad}
                onChange={(e) => {
                  setSelectedFacultad(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isSubmitting || loadingAcademicData}
                className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl bg-white border border-slate-300 focus:border-[#C8102E] focus:ring-2 focus:ring-red-100 outline-none text-slate-800 text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">-- Selecciona tu Facultad --</option>
                {facultadesList.map((fac) => (
                  <option key={fac.codigo} value={fac.codigo}>
                    {fac.nombre}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* 6. Programa Académico (Dropdown from local JSON, filtered by Sede & Facultad) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                Programa Académico de Pregrado <strong className="text-[#C8102E]">*</strong>
              </span>
              {selectedSede && selectedFacultad && (
                <span className="text-[10px] text-slate-500">
                  {programasList.length} {programasList.length === 1 ? 'disponible' : 'disponibles'}
                </span>
              )}
            </label>
            <div className="relative">
              <select
                value={selectedPrograma}
                onChange={(e) => {
                  setSelectedPrograma(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isSubmitting || !selectedSede || !selectedFacultad || programasList.length === 0}
                className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl bg-white border border-slate-300 focus:border-[#C8102E] focus:ring-2 focus:ring-red-100 outline-none text-slate-800 text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {!selectedSede || !selectedFacultad ? (
                  <option value="">-- Primero selecciona Sede y Facultad --</option>
                ) : programasList.length === 0 ? (
                  <option value="">-- No hay programas de pregrado para esta sede y facultad --</option>
                ) : (
                  <>
                    <option value="">-- Selecciona tu Programa Académico --</option>
                    {programasList.map((prog) => (
                      <option key={prog.codigo} value={prog.codigo}>
                        {prog.nombre} ({prog.codigo})
                      </option>
                    ))}
                  </>
                )}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {selectedSede && selectedFacultad && programasList.length === 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                No se encontraron programas de pregrado registrados para la combinación de Sede y Facultad seleccionada. Por favor verifica tu sede o facultad.
              </p>
            )}
          </div>

          {/* 7. Términos y Tratamiento de Datos (Ley 1581 de 2012) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-red-50/20 border border-slate-200/90 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Tratamiento de Datos Personales
              </span>
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-[11px] font-semibold text-[#C8102E] hover:text-[#A80D26] underline underline-offset-2 transition-colors cursor-pointer flex items-center gap-1 group"
              >
                <span>Consultar términos</span>
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tus datos serán para uso exclusivamente institucional y <strong>en ningún caso serán divulgados</strong>.
            </p>

            <label className="flex items-start gap-2.5 cursor-pointer group select-none pt-0.5">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  setErrorMessage(null);
                }}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#C8102E] focus:ring-[#C8102E] transition cursor-pointer accent-[#C8102E] flex-shrink-0"
              />
              <span className="text-xs text-slate-700 leading-snug group-hover:text-slate-900 transition-colors">
                He sido informado(a) y autorizo el tratamiento de mis datos personales para <strong>uso exclusivamente institucional</strong> en el videojuego <em>Brillo en la Montaña</em>, con la garantía de que <strong>mi información no será divulgada</strong>, conforme a la{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowTermsModal(true);
                  }}
                  className="text-[#C8102E] underline font-semibold hover:text-[#A80D26] cursor-pointer"
                >
                  Ley 1581 de 2012
                </button>.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="uv-btn-secondary w-full sm:w-auto text-xs sm:text-sm py-2.5 px-5"
              >
                Cancelar y Salir
              </button>
            )}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="uv-btn-primary w-full sm:w-auto text-xs sm:text-sm py-2.5 px-7"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Guardando registro...</span>
                </>
              ) : (
                <span>Completar Registro y Continuar</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal para consultar la política de datos completa */}
      <Law1581ConsentModal
        isOpen={showTermsModal}
        isReadOnly={true}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setAcceptedTerms(true);
          setShowTermsModal(false);
          setErrorMessage(null);
        }}
      />
    </div>
  );
};
