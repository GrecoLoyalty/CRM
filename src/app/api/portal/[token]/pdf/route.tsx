import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServiceClient } from "@/lib/supabase/server";
import { FichaClientePDF, type EquipoFilaPDF, type EtapaPDF } from "@/lib/pdf/FichaClientePDF";

export const runtime = "nodejs";

// PDF público del portal — a propósito NO incluye bitácora ni materiales
// (son notas y archivos internos del equipo, no pensados para el
// cliente). Solo expone lo mismo que ya se ve en la página del portal:
// datos generales, línea de tiempo y equipo asignado.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = createServiceClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*, giro:giros_industria(nombre)")
    .eq("portal_token", params.token)
    .single();

  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Defensa en profundidad: aunque alguien tenga el link, si Root/CEO ya
  // apagó el interruptor de "ver ficha", no se genera el PDF.
  if (!cliente.mostrar_ficha_portal) {
    return NextResponse.json({ error: "Esta ficha no está disponible por ahora." }, { status: 403 });
  }

  const [{ data: equipoRaw }, { data: etapas }] = await Promise.all([
    supabase.from("cliente_equipo").select("depto, perfiles!perfil_id(nombre_completo)").eq("cliente_id", cliente.id),
    supabase
      .from("clientes_etapas_historial")
      .select("estado, fecha_real, fecha_estimada, comentario_publico")
      .eq("cliente_id", cliente.id)
      .order("fecha_real", { ascending: true }),
  ]);

  const equipoPorDepto = new Map<string, Set<string>>();
  for (const fila of (equipoRaw || []) as any[]) {
    const nombre = fila.perfiles?.nombre_completo;
    if (!nombre) continue;
    if (!equipoPorDepto.has(fila.depto)) equipoPorDepto.set(fila.depto, new Set());
    equipoPorDepto.get(fila.depto)!.add(nombre);
  }
  const equipo: EquipoFilaPDF[] = [...equipoPorDepto.entries()].map(([depto, nombres]) => ({ depto, nombres: [...nombres] }));

  const etapasPDF: EtapaPDF[] = (etapas || []).map((e) => ({
    estado: e.estado,
    fecha_real: e.fecha_real,
    fecha_estimada: e.fecha_estimada,
    comentario_publico: e.comentario_publico,
  }));

  const buffer = await renderToBuffer(
    <FichaClientePDF
      nombreEmpresa={cliente.nombre_empresa}
      nombreContacto={cliente.nombre_contacto}
      clienteCodigo={cliente.cliente_codigo}
      estado={cliente.estado}
      telefono={cliente.telefono}
      email={cliente.email}
      giro={cliente.giro?.nombre || null}
      necesidadDetectada={cliente.necesidad_detectada}
      presupuesto={cliente.presupuesto_estimado}
      fechaCreacion={cliente.created_at}
      fechaEntregaEstimada={cliente.fecha_entrega_estimada}
      equipo={equipo}
      etapas={etapasPDF}
      notas={[]}
      materiales={[]}
      generadoPor="GRESANOVA OS"
    />
  );

  const nombreArchivo = `Ficha-${cliente.nombre_empresa.replace(/[^\w]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombreArchivo}"`,
    },
  });
}
