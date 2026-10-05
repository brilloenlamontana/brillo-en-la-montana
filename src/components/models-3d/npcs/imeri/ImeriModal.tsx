import React from 'react';
import { useUIStore } from '../../../../store/uiStore';
import { useProgressStore } from '../../../../store/progressStore';
import { saveProgressToDB } from '../../../../services/progressService';

// Texto de la "Audio explicación de Imeri" (docs/cronograma-de-escenas.md).
const IMERI_EXPLICACION = [
  'El Pantano de la Tristeza hace honor a su nombre, es un lugar miserable. Al formar parte del Delta del Gran Río, las corrientes siempre fluyen con fuerza, cambiando los senderos con frecuencia, lo que imposibilita hacer un mapa.',
  'Los senderos embarrados a veces desaparecen sin aviso y los suelos se licúan dejando pozos que parecen poco profundos, pero que se tragan a veces a los animales e incluso a los borrachos desprevenidos que se aventuran sin saberlo. Entrar solo, sin alguien que te pueda sacar de un apuro, es mortal; lo mejor es ir atado a alguien que te pueda sacar de un lodazal.',
  'La mayoría de los que intentan atravesarlo cuentan que hubieran podido soportarlo todo con más valentía si no fuera por los insectos: el pantano está plagado de unos mosquitos gigantes que los pueblerinos llaman Zumbones, cuya picadura produce fiebres y terribles dolores por varios días. Una sola picadura no es mortal, pero los Zumbones nunca pican una sola vez.',
  'Entre las amenazas más temidas por los cazadores hay algo particularmente amenazante: un Golem Gigante, una feroz criatura creada hace cientos de años por un mago que ya murió. El secreto de cómo desactivarlo o controlarlo murió con su creador. Se cuenta que el Golem emite una gran luz roja en el centro del pecho.',
];

export const ImeriModal: React.FC = () => {
  const { isImeriModalOpen, setImeriModalOpen } = useUIStore();
  const alreadyTalked = useProgressStore((state) => state.progress.interactedWithImeri === true);

  if (!isImeriModalOpen) return null;

  const handleContinue = () => {
    if (!alreadyTalked) saveProgressToDB(undefined, 'interactedWithImeri', true);
    setImeriModalOpen(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        padding: '16px',
      }}
    >
      <div
        role="dialog"
        aria-labelledby="imeri-titulo"
        style={{
          width: 'min(640px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#f4e4bc',
          color: '#3e2723',
          border: '3px solid #5c3a21',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          padding: '24px 28px',
          fontFamily: 'Georgia, serif',
        }}
      >
        <h2 id="imeri-titulo" style={{ margin: '0 0 4px', fontSize: '1.6rem' }}>Imeri</h2>
        <p style={{ margin: '0 0 16px', fontStyle: 'italic', color: '#5c3a21' }}>La cazadora que mejor conoce el pantano</p>
        {IMERI_EXPLICACION.map((paragraph) => (
          <p key={paragraph.slice(0, 24)} style={{ margin: '0 0 12px', lineHeight: 1.5 }}>{paragraph}</p>
        ))}
        {!alreadyTalked && (
          <p style={{ margin: '16px 0 0', padding: '10px 12px', background: 'rgba(92,58,33,0.12)', borderRadius: '8px', fontFamily: 'system-ui, sans-serif', fontSize: '0.95rem' }}>
            🎒 Se activó tu <b>mochila</b>: entra a la casa de Imeri y recoge lo que creas que te servirá.
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="button"
            onClick={handleContinue}
            className="hover:scale-105 transition-transform"
            style={{
              padding: '10px 28px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '8px',
              background: '#5c3a21',
              color: '#f4d03f',
              border: '2px solid #3e2723',
              boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
