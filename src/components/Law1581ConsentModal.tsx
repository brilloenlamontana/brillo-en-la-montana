import React, { useState, useEffect } from 'react';

interface Law1581ConsentModalProps {
  isOpen: boolean;
  isReadOnly?: boolean;
  onAccept?: () => Promise<void> | void;
  onReject?: () => Promise<void> | void;
  onClose?: () => void;
  isSubmitting?: boolean;
}

export const Law1581ConsentModal: React.FC<Law1581ConsentModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <Law1581ConsentModalContent {...props} />;
};

const Law1581ConsentModalContent: React.FC<Law1581ConsentModalProps> = ({
  isOpen,
  isReadOnly = false,
  onAccept,
  onReject,
  onClose,
  isSubmitting = false,
}) => {
  const [isChecked, setIsChecked] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && isReadOnly && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isReadOnly, onClose]);

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="law1581-modal-title"
    >
      <div 
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center p-1.5 flex-shrink-0">
              <img 
                src="/univalle.svg" 
                alt="Logo Universidad del Valle" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-red-100 text-[#C8102E] tracking-wide mb-1">
                Ley 1581 de 2012 • Habeas Data
              </span>
              <h2 
                id="law1581-modal-title"
                className="text-base sm:text-lg md:text-xl font-bold text-slate-800 leading-tight"
              >
                Tratamiento de Datos Personales
              </h2>
            </div>
          </div>

          {isReadOnly && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
              aria-label="Cerrar modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed max-h-[60vh]">
          {/* Institutional Banner Highlight */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/5 to-slate-50 border border-red-500/25 text-slate-800 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-[#C8102E] text-white flex-shrink-0 mt-0.5 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm sm:text-base text-[#C8102E] leading-tight">
                  Uso Institucional y Garantía de No Divulgación
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-700 font-medium leading-relaxed">
                  Te informamos que <strong>el uso de tus datos será exclusivamente de carácter institucional y en ningún caso se divulgará tu información personal</strong>.
                </p>
                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                  En el videojuego institucional <em>Brillo en la Montaña</em>, la <strong>Universidad del Valle</strong> y la <strong>Dirección de Desarrollo Estudiantil y Éxito Académico (DEXIA)</strong> tratarán tus datos únicamente con fines formativos, de bienestar y acompañamiento estudiantil, bajo estrictos principios de confidencialidad y reserva.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 divide-y divide-slate-100">
            <div>
              <h4 className="font-semibold text-slate-800 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                1. Responsable del Tratamiento y Confidencialidad
              </h4>
              <p className="text-slate-600">
                La <strong>Universidad del Valle</strong> (DEXIA) es responsable de la custodia de tus datos. Se garantiza el principio de confidencialidad: tu información personal <strong>no será divulgada ni publicada</strong>, y solo será accesible para el personal institucional autorizado en el marco del proyecto.
              </p>
            </div>

            <div className="pt-3">
              <h4 className="font-semibold text-slate-800 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                2. No Divulgación ni Cesión a Terceros
              </h4>
              <p className="text-slate-600">
                Tus datos <strong>NO serán divulgados, comercializados, transferidos ni compartidos con empresas privadas, terceros ni entidades externas</strong>. Su uso se restringe exclusivamente al entorno institucional universitario.
              </p>
            </div>

            <div className="pt-3">
              <h4 className="font-semibold text-slate-800 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                3. Marco Legal Aplicable
              </h4>
              <p className="text-slate-600">
                El tratamiento de tu información se rige conforme a la <strong>Ley Estatutaria 1581 de 2012</strong> y el <strong>Decreto 1377 de 2013</strong> de la República de Colombia sobre el régimen general de protección de datos personales y Habeas Data.
              </p>
            </div>

            <div className="pt-3">
              <h4 className="font-semibold text-slate-800 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                4. Datos Recopilados en el Videojuego
              </h4>
              <p className="text-slate-600 mb-1.5">
                Al registrarte e interactuar en el videojuego, se almacenan únicamente los siguientes datos:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-1">
                <li>Nombre y apellidos provistos por tu cuenta institucional de Google.</li>
                <li>Correo electrónico institucional (@correounivalle.edu.co).</li>
                <li>Foto de perfil de tu cuenta de Google (para tu avatar de perfil).</li>
                <li>Nickname (apodo) y avatar 3D seleccionado para explorar el mundo.</li>
                <li>Progreso y logros alcanzados en el entorno virtual.</li>
              </ul>
            </div>

            <div className="pt-3">
              <h4 className="font-semibold text-slate-800 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                5. Finalidades Exclusivamente Institucionales
              </h4>
              <p className="text-slate-600">
                La recopilación de estos datos tiene como única finalidad:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-1 mt-1">
                <li>Permitir la autenticación y guardar tu partida, avatar y preferencias de juego.</li>
                <li>Fomentar actividades institucionales de integración y acompañamiento estudiantil.</li>
                <li>Elaborar métricas estadísticas anónimas para la mejora continua del proyecto institucional.</li>
              </ul>
            </div>

            <div className="pt-3">
              <h4 className="font-semibold text-slate-800 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                6. Tus Derechos (Habeas Data)
              </h4>
              <p className="text-slate-600">
                Como titular, tienes derecho a conocer, actualizar, rectificar y solicitar la supresión de tus datos personales en cualquier momento a través de los canales de la Universidad del Valle.
              </p>
            </div>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-slate-100 bg-slate-50/80 flex flex-col gap-3">
          {!isReadOnly ? (
            <>
              {/* Acceptance Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#C8102E] focus:ring-[#C8102E] transition cursor-pointer accent-[#C8102E]"
                />
                <span className="text-xs sm:text-[13px] text-slate-700 leading-snug group-hover:text-slate-900 transition-colors">
                  He sido informado(a) y autorizo el tratamiento de mis datos personales para <strong>uso exclusivamente institucional</strong> en el videojuego <em>Brillo en la Montaña</em>, con la garantía de que <strong>mi información no será divulgada</strong>, conforme a la <strong>Ley 1581 de 2012</strong>.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 mt-1">
                <button
                  type="button"
                  onClick={onReject}
                  disabled={isSubmitting}
                  className="uv-btn-secondary w-full sm:w-auto text-xs sm:text-sm py-2.5 px-5"
                >
                  Rechazar y Salir
                </button>

                <button
                  type="button"
                  onClick={onAccept}
                  disabled={!isChecked || isSubmitting}
                  className="uv-btn-primary w-full sm:w-auto text-xs sm:text-sm py-2.5 px-6"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Guardando autorización...</span>
                    </>
                  ) : (
                    <span>Aceptar y Continuar</span>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="uv-btn-secondary w-full sm:w-auto text-xs sm:text-sm py-2.5 px-5"
              >
                {onAccept ? 'Volver al Formulario' : 'Entendido'}
              </button>
              {onAccept && (
                <button
                  type="button"
                  onClick={onAccept}
                  className="uv-btn-primary w-full sm:w-auto text-xs sm:text-sm py-2.5 px-6"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Aceptar Términos</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
