import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";

const COLOR_ACCENT = "#1F8A82";
const COLOR_ACCENT_SOFT = "#E7F5F3";
const COLOR_INK = "#1A2130";
const COLOR_MUTED = "#6B7280";
const COLOR_LINE = "#E5E7EB";

const ESTADO_LABEL: Record<string, string> = {
  PROSPECTO: "Prospecto",
  TRANSFERIDO: "Transferido a Análisis",
  EN_ANALISIS: "En Análisis",
  EN_PRODUCCION: "En Producción",
  EN_SUPERVISION: "En Supervisión",
  ENTREGADO: "Entregado",
  HISTORICO: "Histórico",
};

const DEPTO_LABEL: Record<string, string> = {
  ventas: "Ventas",
  analisis: "Análisis",
  estetica: "Estética Visual",
  desarrollo: "Desarrollo",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 50,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLOR_INK,
  },
  header: {
    backgroundColor: COLOR_ACCENT,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logoBadge: {
    width: 26,
    height: 26,
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  logoLetter: { color: COLOR_ACCENT, fontSize: 13, fontFamily: "Helvetica-Bold" },
  brand: { color: "#FFFFFF", fontSize: 9, letterSpacing: 2, marginBottom: 2 },
  clienteNombre: { color: "#FFFFFF", fontSize: 22, fontFamily: "Helvetica-Bold", maxWidth: 340 },
  clienteContacto: { color: "#DFF4F1", fontSize: 10, marginTop: 3 },
  estadoBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  codigoCliente: { color: "#DFF4F1", fontSize: 8, marginTop: 6, textAlign: "right" },

  body: { paddingHorizontal: 40, paddingTop: 22 },

  seccionTitulo: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLOR_ACCENT,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 18,
  },

  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  infoCol: { width: "50%", marginBottom: 10, paddingRight: 10 },
  infoLabel: { fontSize: 8, color: COLOR_MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  infoValor: { fontSize: 10.5, color: COLOR_INK },

  divider: { borderBottomWidth: 1, borderBottomColor: COLOR_LINE, marginVertical: 4 },

  tablaFila: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLOR_LINE,
    paddingVertical: 6,
  },
  tablaCeldaDepto: { width: "28%", fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  tablaCeldaNombres: { width: "72%", fontSize: 9.5, color: COLOR_INK },

  timelineItem: { flexDirection: "row", marginBottom: 10 },
  timelineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLOR_ACCENT, marginTop: 3, marginRight: 8 },
  timelineTexto: { flex: 1 },
  timelineEstado: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  timelineMeta: { fontSize: 8, color: COLOR_MUTED, marginTop: 1 },
  timelineComentario: { fontSize: 9, color: COLOR_INK, marginTop: 2 },

  notaCard: {
    backgroundColor: "#F8FAFA",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  notaMeta: { fontSize: 8, color: COLOR_MUTED, marginBottom: 3 },
  notaContenido: { fontSize: 9.5, color: COLOR_INK },
  notaLink: { fontSize: 8, color: COLOR_ACCENT, marginTop: 3 },

  materialesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  materialThumb: { width: 100, height: 100, borderRadius: 5, objectFit: "cover", backgroundColor: COLOR_ACCENT_SOFT },
  materialNombre: { fontSize: 7.5, color: COLOR_MUTED, marginTop: 3, width: 100 },
  materialListaItem: { fontSize: 9, color: COLOR_INK, marginBottom: 3 },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLOR_LINE,
  },
  footerTexto: { fontSize: 7.5, color: COLOR_MUTED },
});

export interface EquipoFilaPDF {
  depto: string;
  nombres: string[];
}

export interface EtapaPDF {
  estado: string;
  fecha_real: string;
  fecha_estimada: string | null;
  comentario_publico: string | null;
}

export interface NotaBitacoraPDF {
  autor_nombre: string | null;
  depto: string | null;
  contenido: string;
  link: string | null;
  created_at: string;
}

export interface MaterialPDF {
  nombre_archivo: string;
  esImagen: boolean;
  imagenBase64?: string | null;
  fecha: string;
}

function formatearFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export function FichaClientePDF({
  nombreEmpresa,
  nombreContacto,
  clienteCodigo,
  estado,
  telefono,
  email,
  giro,
  necesidadDetectada,
  presupuesto,
  fechaCreacion,
  fechaEntregaEstimada,
  equipo,
  etapas,
  notas,
  materiales,
  generadoPor,
}: {
  nombreEmpresa: string;
  nombreContacto: string;
  clienteCodigo: string;
  estado: string;
  telefono: string;
  email: string | null;
  giro: string | null;
  necesidadDetectada: string;
  presupuesto: string | null;
  fechaCreacion: string;
  fechaEntregaEstimada: string | null;
  equipo: EquipoFilaPDF[];
  etapas: EtapaPDF[];
  notas: NotaBitacoraPDF[];
  materiales: MaterialPDF[];
  generadoPor: string;
}) {
  const imagenes = materiales.filter((m) => m.esImagen && m.imagenBase64).slice(0, 6);
  const soloLista = materiales.filter((m) => !(m.esImagen && m.imagenBase64));

  return (
    <Document title={`Ficha de cliente — ${nombreEmpresa}`} author="GRESANOVA OS">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetter}>G</Text>
            </View>
            <Text style={styles.brand}>GRESANOVA OS · FICHA DE CLIENTE</Text>
            <Text style={styles.clienteNombre}>{nombreEmpresa}</Text>
            <Text style={styles.clienteContacto}>
              {nombreContacto} {telefono ? `· ${telefono}` : ""}
            </Text>
          </View>
          <View>
            <Text style={styles.estadoBadge}>{ESTADO_LABEL[estado] || estado}</Text>
            <Text style={styles.codigoCliente}>{clienteCodigo}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.seccionTitulo}>Información general</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Correo</Text>
              <Text style={styles.infoValor}>{email || "—"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Giro / industria</Text>
              <Text style={styles.infoValor}>{giro || "—"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Presupuesto estimado</Text>
              <Text style={styles.infoValor}>{presupuesto || "—"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Cliente desde</Text>
              <Text style={styles.infoValor}>{formatearFecha(fechaCreacion)}</Text>
            </View>
            <View style={{ width: "100%" }}>
              <Text style={styles.infoLabel}>Necesidad detectada</Text>
              <Text style={styles.infoValor}>{necesidadDetectada || "—"}</Text>
            </View>
            {fechaEntregaEstimada && (
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Entrega estimada</Text>
                <Text style={styles.infoValor}>{formatearFecha(fechaEntregaEstimada)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.seccionTitulo}>Equipo asignado</Text>
          {equipo.length === 0 ? (
            <Text style={{ fontSize: 9.5, color: COLOR_MUTED }}>Sin equipo asignado todavía.</Text>
          ) : (
            equipo.map((fila, i) => (
              <View key={i} style={styles.tablaFila}>
                <Text style={styles.tablaCeldaDepto}>{DEPTO_LABEL[fila.depto] || fila.depto}</Text>
                <Text style={styles.tablaCeldaNombres}>{fila.nombres.join(", ")}</Text>
              </View>
            ))
          )}

          <Text style={styles.seccionTitulo}>Línea de tiempo</Text>
          {etapas.length === 0 ? (
            <Text style={{ fontSize: 9.5, color: COLOR_MUTED }}>Sin movimientos de etapa registrados.</Text>
          ) : (
            etapas.map((e, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineTexto}>
                  <Text style={styles.timelineEstado}>{ESTADO_LABEL[e.estado] || e.estado}</Text>
                  <Text style={styles.timelineMeta}>
                    {formatearFecha(e.fecha_real)}
                    {e.fecha_estimada ? ` · estimado: ${formatearFecha(e.fecha_estimada)}` : ""}
                  </Text>
                  {e.comentario_publico && <Text style={styles.timelineComentario}>{e.comentario_publico}</Text>}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerTexto}>Generado por {generadoPor} · GRESANOVA OS</Text>
          <Text style={styles.footerTexto} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>

      {(notas.length > 0 || materiales.length > 0) && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header} fixed>
            <View>
              <Text style={styles.brand}>GRESANOVA OS · FICHA DE CLIENTE</Text>
              <Text style={[styles.clienteNombre, { fontSize: 16 }]}>{nombreEmpresa}</Text>
            </View>
          </View>

          <View style={styles.body}>
            {notas.length > 0 && (
              <>
                <Text style={styles.seccionTitulo}>Bitácora del equipo</Text>
                {notas.map((n, i) => (
                  <View key={i} style={styles.notaCard}>
                    <Text style={styles.notaMeta}>
                      {n.autor_nombre || "—"}
                      {n.depto ? ` · ${DEPTO_LABEL[n.depto] || n.depto}` : ""} · {formatearFecha(n.created_at)}
                    </Text>
                    <Text style={styles.notaContenido}>{n.contenido}</Text>
                    {n.link && <Text style={styles.notaLink}>{n.link}</Text>}
                  </View>
                ))}
              </>
            )}

            {materiales.length > 0 && (
              <>
                <Text style={styles.seccionTitulo}>Materiales</Text>
                {imagenes.length > 0 && (
                  <View style={styles.materialesGrid}>
                    {imagenes.map((m, i) => (
                      <View key={i}>
                        <Image src={`data:image/png;base64,${m.imagenBase64}`} style={styles.materialThumb} />
                        <Text style={styles.materialNombre}>{m.nombre_archivo}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {soloLista.length > 0 && (
                  <View style={{ marginTop: imagenes.length > 0 ? 10 : 0 }}>
                    {soloLista.map((m, i) => (
                      <Text key={i} style={styles.materialListaItem}>
                        • {m.nombre_archivo} — {formatearFecha(m.fecha)}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerTexto}>Generado por {generadoPor} · GRESANOVA OS</Text>
            <Text style={styles.footerTexto} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
          </View>
        </Page>
      )}
    </Document>
  );
}
