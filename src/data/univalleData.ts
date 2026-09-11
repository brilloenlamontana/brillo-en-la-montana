import sedesData from './sedes.json';
import facultadesData from './facultades.json';
import programasData from './programas.json';

export interface Sede {
  codigo: string;
  nombre: string;
}

export interface Facultad {
  codigo: string;
  nombre: string;
}

export interface ProgramaAcademico {
  codigo: string;
  nombre: string;
  sedeCodigo: string;
  facultadCodigo: string;
  jornada?: 'DIU' | 'NOC' | 'VES';
}

export const SEDES: Sede[] = sedesData;
export const FACULTADES: Facultad[] = facultadesData;
export const PROGRAMAS_ACADEMICOS: ProgramaAcademico[] = programasData as ProgramaAcademico[];

/**
 * Formats full name to Title Case:
 * Each word begins with an uppercase letter followed by lowercase letters.
 * Example: "JUAN CARLOS PÉREZ" -> "Juan Carlos Pérez"
 */
export function formatFullName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

/**
 * Resolves Sede details from the local JSON catalog by code.
 */
export function findSedeByCodigo(codigo?: string): Sede | undefined {
  if (!codigo) return undefined;
  return SEDES.find(s => s.codigo === codigo);
}

/**
 * Resolves Facultad details from the local JSON catalog by code.
 */
export function findFacultadByCodigo(codigo?: string): Facultad | undefined {
  if (!codigo) return undefined;
  return FACULTADES.find(f => f.codigo === codigo);
}

/**
 * Resolves Programa Académico details from the local JSON catalog by code.
 */
export function findProgramaByCodigo(codigo?: string): ProgramaAcademico | undefined {
  if (!codigo) return undefined;
  return PROGRAMAS_ACADEMICOS.find(p => p.codigo === codigo);
}
