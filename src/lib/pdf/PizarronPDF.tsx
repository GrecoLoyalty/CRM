import { Fragment } from "react";
import {
  Document,
  Line,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  altoDeElemento,
  anchoDeElemento,
  type ConexionPizarron,
  type ElementoPizarron,
} from "@/lib/pizarron";

const ANCHO_MAPA = 1000;
const ALTO_MAPA = 650;
const ANCHO_PDF = 740;
const ALTO_PDF = (ANCHO_PDF * ALTO_MAPA) / ANCHO_MAPA;

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    color: "#1A2130",
  },
  header: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#1F8A82",
  },
  marca: { color: "#1F8A82", fontSize: 8, letterSpacing: 2, marginBottom: 4 },
  titulo: { fontSize: 17, fontFamily: "Helvetica-Bold" },
  fecha: { color: "#6B7280", fontSize: 7, marginTop: 4 },
  mapa: {
    position: "relative",
    width: ANCHO_PDF,
    height: ALTO_PDF,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F8FAFC",
  },
  elemento: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    padding: 7,
    borderWidth: 1,
    borderRadius: 7,
    overflow: "hidden",
  },
  tipo: { fontSize: 6, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  texto: { fontSize: 8, lineHeight: 1.25 },
  vacio: { color: "#6B7280", fontSize: 10, textAlign: "center", marginTop: 225 },
});

function colorTexto(color: string) {
  const canales = color.match(/[0-9a-f]{2}/gi)?.map((canal) => parseInt(canal, 16)) || [];
  if (canales.length !== 3) return "#1A2130";
  const luminancia =
    (0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2]) / 255;
  return luminancia > 0.55 ? "#1A2130" : "#FFFFFF";
}

function flecha(x1: number, y1: number, x2: number, y2: number) {
  const angulo = Math.atan2(y2 - y1, x2 - x1);
  const largo = 9;
  const ancho = 5;
  const baseX = x2 - Math.cos(angulo) * largo;
  const baseY = y2 - Math.sin(angulo) * largo;
  const lado1X = baseX + Math.cos(angulo + Math.PI / 2) * ancho;
  const lado1Y = baseY + Math.sin(angulo + Math.PI / 2) * ancho;
  const lado2X = baseX + Math.cos(angulo - Math.PI / 2) * ancho;
  const lado2Y = baseY + Math.sin(angulo - Math.PI / 2) * ancho;
  return `M ${x2} ${y2} L ${lado1X} ${lado1Y} L ${lado2X} ${lado2Y} Z`;
}

export function PizarronPDF({
  titulo,
  elementos,
  conexiones,
}: {
  titulo: string;
  elementos: ElementoPizarron[];
  conexiones: ConexionPizarron[];
}) {
  const porId = new Map(elementos.map((elemento) => [elemento.id, elemento]));

  return (
    <Document title={titulo} author="GRESANOVA OS">
      <Page size="A4" orientation="landscape" style={styles.page} wrap={false}>
        <View style={styles.header}>
          <Text style={styles.marca}>GRESANOVA OS · PIZARRÓN DE IDEAS</Text>
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.fecha}>Exportado el {new Date().toLocaleDateString("es-MX")}</Text>
        </View>

        {elementos.length === 0 ? (
          <View style={styles.mapa}>
            <Text style={styles.vacio}>Este pizarrón todavía no tiene elementos.</Text>
          </View>
        ) : (
          <View style={styles.mapa}>
            <Svg
              style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
              viewBox={`0 0 ${ANCHO_MAPA} ${ALTO_MAPA}`}
              preserveAspectRatio="none"
            >
              {conexiones.map((conexion) => {
                const desde = porId.get(conexion.desde);
                const hacia = porId.get(conexion.hacia);
                if (!desde || !hacia) return null;

                const x1 = desde.x * 10 + anchoDeElemento(desde) / 2;
                const y1 = desde.y * 6.5 + altoDeElemento(desde) / 2;
                const x2 = hacia.x * 10 + anchoDeElemento(hacia) / 2;
                const y2 = hacia.y * 6.5 + altoDeElemento(hacia) / 2;
                const colorDesde = desde.color;
                const colorHacia = hacia.color;

                if (colorDesde.toLowerCase() === colorHacia.toLowerCase()) {
                  return (
                    <Fragment key={conexion.id}>
                      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colorDesde} strokeWidth={3} />
                      <Path d={flecha(x1, y1, x2, y2)} fill={colorHacia} />
                    </Fragment>
                  );
                }

                const mitadX = (x1 + x2) / 2;
                const mitadY = (y1 + y2) / 2;
                return (
                  <Fragment key={conexion.id}>
                    <Line x1={x1} y1={y1} x2={mitadX} y2={mitadY} stroke={colorDesde} strokeWidth={3} />
                    <Line x1={mitadX} y1={mitadY} x2={x2} y2={y2} stroke={colorHacia} strokeWidth={3} />
                    <Path d={flecha(x1, y1, x2, y2)} fill={colorHacia} />
                  </Fragment>
                );
              })}
            </Svg>

            {elementos.map((elemento) => (
              <View
                key={elemento.id}
                style={{
                  ...styles.elemento,
                  left: `${elemento.x}%`,
                  top: `${elemento.y}%`,
                  width: `${anchoDeElemento(elemento) / 10}%`,
                  height: `${altoDeElemento(elemento) / 6.5}%`,
                  backgroundColor: elemento.color,
                  borderColor: elemento.color,
                }}
              >
                <Text style={{ ...styles.tipo, color: colorTexto(elemento.color) }}>
                  {elemento.tipo === "idea" ? "IDEA" : "TEXTO"}
                </Text>
                <Text style={{ ...styles.texto, color: colorTexto(elemento.color) }}>
                  {elemento.texto}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
