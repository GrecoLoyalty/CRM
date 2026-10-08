export type ElementoPizarron = {
  id: string;
  tipo: "idea" | "texto";
  texto: string;
  x: number;
  y: number;
  color: string;
};

export type ConexionPizarron = {
  id: string;
  desde: string;
  hacia: string;
};

export type Pizarron = {
  id: string;
  titulo: string;
  elementos: ElementoPizarron[];
  conexiones: ConexionPizarron[];
  creado_por: string;
  updated_at: string;
};

export const COLORES_IDEA = ["#F2C66D", "#82C9C3", "#A6B8F5", "#E69ABB", "#F19B79"];

export function validarContenidoPizarron(
  elementos: unknown,
  conexiones: unknown
): elementos is ElementoPizarron[] {
  if (!Array.isArray(elementos) || !Array.isArray(conexiones)) return false;
  if (elementos.length > 100 || conexiones.length > 200) return false;

  const ids = new Set<string>();
  for (const elemento of elementos) {
    if (
      !elemento ||
      typeof elemento.id !== "string" ||
      elemento.id.length > 80 ||
      ids.has(elemento.id) ||
      !["idea", "texto"].includes(elemento.tipo) ||
      typeof elemento.texto !== "string" ||
      elemento.texto.length > 2000 ||
      typeof elemento.x !== "number" ||
      !Number.isFinite(elemento.x) ||
      elemento.x < 0 ||
      elemento.x > 100 ||
      typeof elemento.y !== "number" ||
      !Number.isFinite(elemento.y) ||
      elemento.y < 0 ||
      elemento.y > 100 ||
      typeof elemento.color !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(elemento.color)
    ) {
      return false;
    }
    ids.add(elemento.id);
  }

  const connectionIds = new Set<string>();
  for (const conexion of conexiones) {
    if (
      !conexion ||
      typeof conexion.id !== "string" ||
      connectionIds.has(conexion.id) ||
      typeof conexion.desde !== "string" ||
      typeof conexion.hacia !== "string" ||
      !ids.has(conexion.desde) ||
      !ids.has(conexion.hacia) ||
      conexion.desde === conexion.hacia
    ) {
      return false;
    }
    connectionIds.add(conexion.id);
  }
  return true;
}
