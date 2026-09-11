import {
  SEDES,
  FACULTADES,
  PROGRAMAS_ACADEMICOS,
  type Sede,
  type Facultad,
  type ProgramaAcademico
} from '../data/univalleData';

/**
 * Retrieves all Sedes from local project JSON catalog.
 */
export async function getSedes(): Promise<Sede[]> {
  return [...SEDES].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Retrieves all Facultades from local project JSON catalog.
 */
export async function getFacultades(): Promise<Facultad[]> {
  return [...FACULTADES].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
}

/**
 * Retrieves Programas Académicos filtered by Sede and Facultad from local project JSON catalog.
 */
export async function getProgramasAcademicos(
  sedeCodigo?: string,
  facultadCodigo?: string
): Promise<ProgramaAcademico[]> {
  return PROGRAMAS_ACADEMICOS.filter(p => {
    if (sedeCodigo && p.sedeCodigo !== sedeCodigo) return false;
    if (facultadCodigo && p.facultadCodigo !== facultadCodigo) return false;
    return true;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));
}
