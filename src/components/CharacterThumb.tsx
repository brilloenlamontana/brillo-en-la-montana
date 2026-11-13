import type { CharacterOption } from '@/data/characters';

// Size of every character sprite, in pixels.
const SPRITE_W = 819;
const SPRITE_H = 1024;

type CharacterThumbProps = {
  // The player's character; without one (still choosing it) the account photo or the initial is shown.
  character: CharacterOption | null;
  photoURL?: string;
  name?: string;
  className?: string;
};

// Round portrait: the face of the character, cut from its sprite (CharacterOption.face).
export function CharacterThumb({ character, photoURL, name, className = '' }: CharacterThumbProps) {
  const base = `rounded-full overflow-hidden flex-shrink-0 ${className}`;
  if (character) {
    const [x, y, size] = character.face;
    const left = x - size / 2;
    const top = y - size / 2;
    return (
      <div
        role="img"
        aria-label={character.name}
        className={`${base} bg-gradient-to-b from-papel-200 to-papel-50 bg-no-repeat`}
        style={{
          backgroundImage: `url(${character.imagePath})`,
          backgroundSize: `${(SPRITE_W / size) * 100}% ${(SPRITE_H / size) * 100}%`,
          backgroundPosition: `${(left / (SPRITE_W - size)) * 100}% ${(top / (SPRITE_H - size)) * 100}%`,
        }}
      />
    );
  }
  if (photoURL) return <img src={photoURL} alt={name || 'Perfil'} referrerPolicy="no-referrer" className={`${base} object-cover`} />;
  return (
    <div className={`${base} bg-gradient-to-tr from-madera-600 to-madera-500 flex items-center justify-center font-bold text-papel-50`}>
      {(name && name[0]) || 'U'}
    </div>
  );
}
