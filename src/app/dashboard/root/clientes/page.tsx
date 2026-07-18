import { createClient } from "@/lib/supabase/server";
import GestionClientesRoot from "@/components/root/GestionClientesRoot";
import type { Depto } from "@/lib/types";

export default async function RootClientesPage() {
  const supabase = createClient();

  const [{ data: clientes }, { data: perfiles }, { data: tareas }, { data: deptosPorPersona }, { data: equipo }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nombre_empresa, nombre_contacto, estado, vendedor_id, analista_id, ruta_visual, ruta_software, updated_at")
      .order("updated_at", { ascending: false }),
    supabase.from("perfiles").select("id, nombre_completo, role, depto, activo").eq("activo", true).order("nombre_completo"),
    supabase
      .from("tareas")
      .select("id, cliente_id, depto, titulo, estado, asignado_a")
      .order("created_at", { ascending: true }),
    // Fuente de verdad de "quién pertenece a qué depto" (incluye el depto
    // principal, ya que la migración 0008 lo copia aquí también).
    supabase.from("perfiles_departamentos").select("perfil_id, depto"),
    // Fuente de verdad de "quién atiende a cada cliente" (puede haber
    // varias personas del mismo depto para el mismo cliente).
    supabase.from("cliente_equipo").select("cliente_id, depto, perfil_id"),
  ]);

  const perfilesPorId = new Map((perfiles || []).map((p) => [p.id, p]));
  const vendedores = (perfiles || []).filter((p) => p.role === "vendedor");
  const analistas = (perfiles || []).filter((p) => p.role === "analista");
  const equipoEstetica = (perfiles || []).filter((p) => p.role === "produccion" && p.depto === "estetica");
  const equipoDesarrollo = (perfiles || []).filter((p) => p.role === "produccion" && p.depto === "desarrollo");

  // equipoPorDepto: todas las personas activas que pertenecen a cada
  // departamento (principal o adicional), para poder marcarlas con
  // checkbox al armar el equipo de un cliente.
  const equipoPorDepto: Record<Depto, { id: string; nombre_completo: string }[]> = {
    ventas: [],
    analisis: [],
    estetica: [],
    desarrollo: [],
  };
  for (const fila of deptosPorPersona || []) {
    const p = perfilesPorId.get(fila.perfil_id);
    if (!p) continue;
    equipoPorDepto[fila.depto as Depto].push({ id: p.id, nombre_completo: p.nombre_completo });
  }

  const clientesEnriquecidos = (clientes || []).map((c) => {
    const tareasCliente = (tareas || []).filter((t) => t.cliente_id === c.id);
    const equipoCliente = (equipo || []).filter((e) => e.cliente_id === c.id);
    const equipoAsignado: Record<Depto, string[]> = { ventas: [], analisis: [], estetica: [], desarrollo: [] };
    for (const fila of equipoCliente) {
      equipoAsignado[fila.depto as Depto].push(fila.perfil_id);
    }

    return {
      id: c.id,
      nombre_empresa: c.nombre_empresa,
      nombre_contacto: c.nombre_contacto,
      estado: c.estado,
      ruta_visual: c.ruta_visual,
      ruta_software: c.ruta_software,
      vendedor: c.vendedor_id ? perfilesPorId.get(c.vendedor_id) || null : null,
      analista: c.analista_id ? perfilesPorId.get(c.analista_id) || null : null,
      equipoAsignado,
      tareasEstetica: tareasCliente
        .filter((t) => t.depto === "estetica")
        .map((t) => ({ id: t.id, titulo: t.titulo, estado: t.estado, asignado_a: t.asignado_a })),
      tareasDesarrollo: tareasCliente
        .filter((t) => t.depto === "desarrollo")
        .map((t) => ({ id: t.id, titulo: t.titulo, estado: t.estado, asignado_a: t.asignado_a })),
    };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Clientes — Vista y edición total</h1>
        <p className="text-gray-500 text-sm mt-1">
          Root: mueve a cualquier cliente entre etapas y define el equipo completo (varias personas por
          departamento) que lo atiende. Ese equipo es el que el cliente ve en su portal.
        </p>
      </div>

      <GestionClientesRoot
        clientes={clientesEnriquecidos}
        vendedores={vendedores}
        analistas={analistas}
        equipoEstetica={equipoEstetica}
        equipoDesarrollo={equipoDesarrollo}
        equipoPorDepto={equipoPorDepto}
      />
    </div>
  );
}
