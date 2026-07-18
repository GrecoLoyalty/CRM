import { createClient } from "@/lib/supabase/server";
import GestionClientesRoot from "@/components/root/GestionClientesRoot";

export default async function RootClientesPage() {
  const supabase = createClient();

  const [{ data: clientes }, { data: perfiles }, { data: tareas }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nombre_empresa, nombre_contacto, estado, vendedor_id, analista_id, ruta_visual, ruta_software, updated_at")
      .order("updated_at", { ascending: false }),
    supabase.from("perfiles").select("id, nombre_completo, role, depto, activo").eq("activo", true).order("nombre_completo"),
    supabase
      .from("tareas")
      .select("id, cliente_id, depto, titulo, estado, asignado_a")
      .order("created_at", { ascending: true }),
  ]);

  const perfilesPorId = new Map((perfiles || []).map((p) => [p.id, p]));
  const vendedores = (perfiles || []).filter((p) => p.role === "vendedor");
  const analistas = (perfiles || []).filter((p) => p.role === "analista");
  const equipoEstetica = (perfiles || []).filter((p) => p.role === "produccion" && p.depto === "estetica");
  const equipoDesarrollo = (perfiles || []).filter((p) => p.role === "produccion" && p.depto === "desarrollo");

  const clientesEnriquecidos = (clientes || []).map((c) => {
    const tareasCliente = (tareas || []).filter((t) => t.cliente_id === c.id);
    return {
      id: c.id,
      nombre_empresa: c.nombre_empresa,
      nombre_contacto: c.nombre_contacto,
      estado: c.estado,
      ruta_visual: c.ruta_visual,
      ruta_software: c.ruta_software,
      vendedor: c.vendedor_id ? perfilesPorId.get(c.vendedor_id) || null : null,
      analista: c.analista_id ? perfilesPorId.get(c.analista_id) || null : null,
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
          Root: mueve a cualquier cliente entre etapas y define quién es el encargado en cada departamento.
        </p>
      </div>

      <GestionClientesRoot
        clientes={clientesEnriquecidos}
        vendedores={vendedores}
        analistas={analistas}
        equipoEstetica={equipoEstetica}
        equipoDesarrollo={equipoDesarrollo}
      />
    </div>
  );
}
