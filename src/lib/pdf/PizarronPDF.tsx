import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ConexionPizarron, ElementoPizarron } from "@/lib/pizarron";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1A2130",
  },
  header: {
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: "#1F8A82",
    marginBottom: 18,
  },
  marca: { color: "#1F8A82", fontSize: 9, letterSpacing: 2, marginBottom: 7 },
  titulo: { fontSize: 23, fontFamily: "Helvetica-Bold" },
  fecha: { color: "#6B7280", fontSize: 9, marginTop: 7 },
  elemento: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "#E5E7EB",
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
  },
  tipo: { fontSize: 8, color: "#6B7280", textTransform: "uppercase", marginBottom: 5 },
  texto: { fontSize: 10, lineHeight: 1.5 },
  seccion: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 8 },
  relacion: { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  vacio: { color: "#6B7280", fontStyle: "italic", marginBottom: 12 },
});

export function PizarronPDF({
  titulo,
  elementos,
  conexiones,
}: {
  titulo: string;
  elementos: ElementoPizarron[];
  conexiones: ConexionPizarron[];
}) {
  const porId = new Map(elementos.map((elemento) => [elemento.id, elemento.texto]));

  return (
    <Document title={titulo} author="GRESANOVA OS">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.marca}>GRESANOVA OS · PIZARRÓN DE IDEAS</Text>
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.fecha}>Exportado el {new Date().toLocaleDateString("es-MX")}</Text>
        </View>

        <Text style={styles.seccion}>Ideas y notas</Text>
        {elementos.length === 0 ? (
          <Text style={styles.vacio}>Este pizarrón todavía no tiene elementos.</Text>
        ) : (
          elementos.map((elemento) => (
            <View key={elemento.id} style={{ ...styles.elemento, borderLeftColor: elemento.color }} wrap={false}>
              <Text style={styles.tipo}>{elemento.tipo === "idea" ? "Idea" : "Texto"}</Text>
              <Text style={styles.texto}>{elemento.texto}</Text>
            </View>
          ))
        )}

        <Text style={styles.seccion}>Conexiones</Text>
        {conexiones.length === 0 ? (
          <Text style={styles.vacio}>No hay conexiones entre elementos.</Text>
        ) : (
          conexiones.map((conexion) => (
            <Text key={conexion.id} style={styles.relacion}>
              {porId.get(conexion.desde) || "Elemento"} {"->"} {porId.get(conexion.hacia) || "Elemento"}
            </Text>
          ))
        )}
      </Page>
    </Document>
  );
}
