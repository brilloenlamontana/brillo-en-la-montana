import sedesData from './sedes.json';
import facultadesData from './facultades.json';
import programasData from './programas.json';

// Catalog of Universidad del Valle campuses, faculties and programs, bundled with the app (no network).

interface Sede {
  codigo: string;
  nombre: string;
}

interface Facultad {
  codigo: string;
  nombre: string;
}

interface ProgramaAcademico {
  codigo: string;
  nombre: string;
  sedeCodigo: string;
  facultadCodigo: string;
  jornada?: 'DIU' | 'NOC' | 'VES';
}

export const SEDES: Sede[] = sedesData;
const FACULTADES: Facultad[] = facultadesData;
const PROGRAMAS: ProgramaAcademico[] = programasData as ProgramaAcademico[];

// Sorted for the registration selects.
export const SEDES_SORTED = [...SEDES].sort((a, b) => a.nombre.localeCompare(b.nombre));
export const FACULTADES_SORTED = [...FACULTADES].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));

export const programasOf = (sedeCodigo: string, facultadCodigo: string): ProgramaAcademico[] =>
  PROGRAMAS.filter((p) => p.sedeCodigo === sedeCodigo && p.facultadCodigo === facultadCodigo).sort((a, b) => a.nombre.localeCompare(b.nombre));

// "JUAN CARLOS PÉREZ" → "Juan Carlos Pérez".
export function formatFullName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const findSedeByCodigo = (codigo?: string) => (codigo ? SEDES.find((s) => s.codigo === codigo) : undefined);
export const findFacultadByCodigo = (codigo?: string) => (codigo ? FACULTADES.find((f) => f.codigo === codigo) : undefined);
export const findProgramaByCodigo = (codigo?: string) => (codigo ? PROGRAMAS.find((p) => p.codigo === codigo) : undefined);
