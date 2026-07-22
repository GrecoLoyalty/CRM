"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { MaterialCliente } from "@/lib/types";

interface MaterialConSubidor extends MaterialCliente {
  subidor?: { nombre_completo: string } | null;
}

function iconoPara(tipoMime: string | null, nombre: string) {
  if (tipoMime?.startsWith("image/")) return null; // se muestra la miniatura real
  const ext = nombre.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (["doc", "docx"].includes(ext || "")) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext || "")) return "📊";
  if (["ppt", "pptx"].includes(ext || "")) return "📑";
  if (["mp4", "mov", "avi", "webm"].includes(ext || "")) return "🎬";
  if (["zip", "rar"].includes(ext || "")) return "🗜️";
  return "📎";
}

function formatearTamano(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialesCliente({
  clienteId,
  materialesIniciales,
  userId,
  esRootOCeo,
}: {
  clienteId: string;
  materialesIniciales: MaterialConSubidor[];
  userId: string;
  esRootOCeo: boolean;
}) {
  const [materiales, setMateriales] = useState(materialesIniciales);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function generarUrls(lista: MaterialConSubidor[]) {
    const supabase = createClient();
    const conArchivo = lista.filter((m) => m.storage_path);
    const entradas = await Promise.all(
      conArchivo.map(async (m) => {
        const { data } = await supabase.storage.from("materiales-cliente").createSignedUrl(m.storage_path as string, 3600);
        return [m.id, data?.signedUrl || ""] as const;
      })
    );
    setUrls(Object.fromEntries(entradas));
  }

  async function recargar() {
    const supabase = createClient();
    const { data } = await supabase
      .from("materiales_cliente")
      .select("*, subidor:perfiles!subido_por(nombre_completo)")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });
    if (data) {
      setMateriales(data as any);
      generarUrls(data as any);
    }
  }

  useEffect(() => {
    generarUrls(materialesIniciales);
    const supabase = createClient();
    const canal = supabase
      .channel(`materiales-${clienteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "materiales_cliente", filter: `cliente_id=eq.${clienteId}` }, () => recargar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function subirArchivos(archivos: FileList | File[]) {
    setError(null);
    setSubiendo(true);
    const supabase = createClient();
    const lista = Array.from(archivos);
    const fallos: string[] = [];
    let exitos = 0;

    for (const archivo of lista) {
      setProgreso(`Subiendo ${archivo.name}…`);
      const rutaLimpia = archivo.name.replace(/[^\w.\-]/g, "_");
      const path = `${clienteId}/${crypto.randomUUID()}-${rutaLimpia}`;

      const { error: errStorage } = await supabase.storage.from("materiales-cliente").upload(path, archivo);
      if (errStorage) {
        console.error("[materiales] error al subir al storage:", archivo.name, errStorage);
        fallos.push(`"${archivo.name}": ${errStorage.message}`);
        continue;
      }

      const { error: errMeta } = await supabase.from("materiales_cliente").insert({
        cliente_id: clienteId,
        storage_path: path,
        nombre_archivo: archivo.name,
        tipo_mime: archivo.type || null,
        tamano_bytes: archivo.size,
        subido_por: userId,
      });
      if (errMeta) {
        console.error("[materiales] se subió el archivo pero falló el registro:", archivo.name, errMeta);
        fallos.push(`"${archivo.name}" se subió pero no se pudo registrar: ${errMeta.message}`);
        // El archivo quedó huérfano en el bucket (sin fila en materiales_cliente);
        // lo removemos para no dejar basura que nadie puede ver ni borrar desde el CRM.
        await supabase.storage.from("materiales-cliente").remove([path]);
        continue;
      }
      exitos++;
    }

    setProgreso(null);
    setSubiendo(false);

    if (fallos.length > 0) {
      setError(
        `${exitos > 0 ? `Se subieron ${exitos} de ${lista.length} archivos. ` : "No se pudo subir ningún archivo. "}` +
          `Falló: ${fallos.join(" · ")}`
      );
    }
    recargar();
  }

  async function eliminar(material: MaterialConSubidor) {
    if (!confirm(`¿Eliminar "${material.nombre_archivo}"? No se puede deshacer.`)) return;
    const supabase = createClient();
    if (material.storage_path) {
      await supabase.storage.from("materiales-cliente").remove([material.storage_path]);
    }
    await supabase.from("materiales_cliente").delete().eq("id", material.id);
    recargar();
  }

  return (
    <section className="card p-5">
      <h2 className="font-display font-semibold text-sm text-gray-400 uppercase tracking-wide mb-3">
        Materiales — documentos y fotos
      </h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          if (e.dataTransfer.files.length > 0) subirArchivos(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors mb-4 ${
          arrastrando ? "border-accent bg-accent/5" : "border-base-600 hover:border-base-500"
        }`}
      >
        <p className="text-sm text-gray-400">Arrastra archivos aquí, o haz clic para elegirlos</p>
        <p className="text-xs text-gray-600 mt-1">Fotos, PDFs, Word, Excel, lo que necesite el equipo</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && subirArchivos(e.target.files)}
        />
      </div>

      {progreso && <p className="text-xs text-accent-soft mb-3">{progreso}</p>}
      {error && (
        <div className="flex items-start justify-between gap-3 bg-signal-urgent/10 border border-signal-urgent/40 text-signal-urgent text-sm rounded-lg px-3 py-2 mb-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 hover:opacity-70">
            ✕
          </button>
        </div>
      )}

      {materiales.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay materiales para este cliente.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {materiales.map((m) => {
            const esImagen = m.tipo_mime?.startsWith("image/");
            const esLink = !m.storage_path && !!m.link_url;
            const url = esLink ? (m.link_url as string) : urls[m.id];
            const puedeBorrar = m.subido_por === userId || esRootOCeo;
            return (
              <div key={m.id} className="group relative bg-base-900 border border-base-600 rounded-lg overflow-hidden">
                <a href={url || "#"} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="aspect-square bg-base-700 flex items-center justify-center overflow-hidden">
                    {esImagen && url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={m.nombre_archivo} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{esLink ? "🔗" : iconoPara(m.tipo_mime, m.nombre_archivo)}</span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-300 truncate" title={m.nombre_archivo}>
                      {m.nombre_archivo}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {esLink ? "Link externo" : formatearTamano(m.tamano_bytes)} · {format(new Date(m.created_at), "d MMM", { locale: es })}
                    </p>
                    <p className="text-[10px] text-gray-600 truncate">{m.subidor?.nombre_completo || "—"}</p>
                  </div>
                </a>
                {puedeBorrar && (
                  <button
                    onClick={() => eliminar(m)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    aria-label="Eliminar"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
