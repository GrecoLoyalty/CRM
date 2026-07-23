import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FichaClientePDF, type EquipoFilaPDF, type EtapaPDF, type NotaBitacoraPDF, type MaterialPDF } from "@/lib/pdf/FichaClientePDF";

// @react-pdf/renderer necesita el runtime de Node (usa Buffer y fuentes
// embebidas); no funciona en el runtime Edge.
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // La consulta respeta RLS: si este usuario no puede ver este cliente,
  // simplemente no regresa la fila — mismo criterio de acceso que la ficha.
  const { data: cliente } = await supabase
    .from("clientes")
    .select("*, giro:giros_industria(nombre)")
    .eq("id", params.id)
    .single();

  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado o sin acceso" }, { status: 404 });

  const { data: miPerfil } = await supabase.from("perfiles").select("nombre_completo").eq("id", user.id).single();

  const [{ data: equipoRaw }, { data: etapas }, { data: notas }, { data: materialesRaw }] = await Promise.all([
    supabase.from("cliente_equipo").select("depto, perfiles!perfil_id(nombre_completo)").eq("cliente_id", cliente.id),
    supabase
      .from("clientes_etapas_historial")
      .select("estado, fecha_real, fecha_estimada, comentario_publico")
      .eq("cliente_id", cliente.id)
      .order("fecha_real", { ascending: true }),
    supabase
      .from("cliente_bitacora")
      .select("autor_nombre, depto, contenido, link, created_at")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("materiales_cliente")
      .select("storage_path, link_url, nombre_archivo, tipo_mime, created_at")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false }),
  ]);

  const equipoPorDepto = new Map<string, Set<string>>();
  for (const fila of (equipoRaw || []) as any[]) {
    const nombre = fila.perfiles?.nombre_completo;
    if (!nombre) continue;
    if (!equipoPorDepto.has(fila.depto)) equipoPorDepto.set(fila.depto, new Set());
    equipoPorDepto.get(fila.depto)!.add(nombre);
  }
  const equipo: EquipoFilaPDF[] = [...equipoPorDepto.entries()].map(([depto, nombres]) => ({
    depto,
    nombres: [...nombres],
  }));

  const etapasPDF: EtapaPDF[] = (etapas || []).map((e) => ({
    estado: e.estado,
    fecha_real: e.fecha_real,
    fecha_estimada: e.fecha_estimada,
    comentario_publico: e.comentario_publico,
  }));

  const notasPDF: NotaBitacoraPDF[] = (notas || []).map((n) => ({
    autor_nombre: n.autor_nombre,
    depto: n.depto,
    contenido: n.contenido,
    link: n.link,
    created_at: n.created_at,
  }));

  // Para las fotos, se descargan (servidor a servidor, con permisos de
  // servicio) y se embeben directo en el PDF como base64 — se limita a las
  // primeras imágenes para que la generación sea rápida.
  const admin = createServiceClient();
  const materiales: MaterialPDF[] = [];
  let imagenesEmbebidas = 0;
  for (const m of (materialesRaw || []) as any[]) {
    const esImagen = !!m.storage_path && m.tipo_mime?.startsWith("image/");
    let imagenBase64: string | null = null;

    if (esImagen && imagenesEmbebidas < 6) {
      try {
        const { data: blob } = await admin.storage.from("materiales-cliente").download(m.storage_path);
        if (blob) {
          const buffer = Buffer.from(await blob.arrayBuffer());
          imagenBase64 = buffer.toString("base64");
          imagenesEmbebidas++;
        }
      } catch {
        // si falla la descarga de una imagen puntual, se lista como texto y ya
      }
    }

    materiales.push({
      nombre_archivo: m.nombre_archivo,
      esImagen: esImagen && !!imagenBase64,
      imagenBase64,
      fecha: m.created_at,
    });
  }

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
      notas={notasPDF}
      materiales={materiales}
      generadoPor={miPerfil?.nombre_completo || "—"}
    />
  );

  const nombreArchivo = `Ficha-${cliente.nombre_empresa.replace(/[^\w]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
