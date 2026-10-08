import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { validarContenidoPizarron } from "@/lib/pizarron";
import { PizarronPDF } from "@/lib/pdf/PizarronPDF";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: pizarron, error } = await supabase
    .from("pizarrones")
    .select("titulo, elementos, conexiones")
    .eq("id", params.id)
    .single();
  if (error || !pizarron) return NextResponse.json({ error: "Pizarrón no encontrado." }, { status: 404 });
  if (!validarContenidoPizarron(pizarron.elementos, pizarron.conexiones)) {
    return NextResponse.json({ error: "El contenido del pizarrón no es válido." }, { status: 422 });
  }

  try {
    const buffer = await renderToBuffer(
      <PizarronPDF
        titulo={pizarron.titulo}
        elementos={pizarron.elementos}
        conexiones={pizarron.conexiones}
      />
    );
    const nombre = pizarron.titulo.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "pizarron";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombre}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[pizarron-pdf] No se pudo generar el PDF:", error);
    return NextResponse.json({ error: "No se pudo generar el PDF." }, { status: 500 });
  }
}
