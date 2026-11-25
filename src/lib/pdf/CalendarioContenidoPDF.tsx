import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

type PublicacionCalendarioPDF = {
  fecha_hora: string;
  marca: string;
  plataforma: string;
  estado: string;
  responsable: string;
  guion: string;
  caption: string;
  hashtags: string[];
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1A2130",
  },
  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#1F8A82",
  },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1F8A82" },
  subtitle: { fontSize: 9, color: "#6B7280", marginTop: 4 },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  date: { width: "15%", paddingRight: 8, fontFamily: "Helvetica-Bold" },
  details: { width: "85%" },
  headline: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  meta: { color: "#4B5563", marginBottom: 2 },
  caption: { marginTop: 3, lineHeight: 1.3 },
  empty: { color: "#6B7280", paddingVertical: 16 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    textAlign: "right",
    color: "#6B7280",
    fontSize: 8,
  },
});

function formatearFecha(value: string) {
  return new Date(value).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatearHora(value: string) {
  return new Date(value).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CalendarioContenidoPDF({
  titulo,
  publicaciones,
}: {
  titulo: string;
  publicaciones: PublicacionCalendarioPDF[];
}) {
  return (
    <Document title={`Calendario de contenido — ${titulo}`} author="GRESANOVA OS">
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.title}>Calendario de contenido</Text>
          <Text style={styles.subtitle}>{titulo} · GRESANOVA OS</Text>
        </View>
        {publicaciones.length === 0 ? (
          <Text style={styles.empty}>No hay publicaciones en este periodo con los filtros seleccionados.</Text>
        ) : (
          publicaciones.map((publicacion, index) => (
            <View key={`${publicacion.fecha_hora}-${index}`} style={styles.row} wrap={false}>
              <Text style={styles.date}>
                {formatearFecha(publicacion.fecha_hora)}
                {"\n"}
                {formatearHora(publicacion.fecha_hora)}
              </Text>
              <View style={styles.details}>
                <Text style={styles.headline}>
                  {publicacion.marca} · {publicacion.plataforma}
                </Text>
                <Text style={styles.meta}>
                  Estado: {publicacion.estado} · Responsable: {publicacion.responsable}
                  {publicacion.guion ? ` · Guion: ${publicacion.guion}` : ""}
                </Text>
                {publicacion.caption && <Text style={styles.caption}>{publicacion.caption}</Text>}
                {publicacion.hashtags.length > 0 && (
                  <Text style={styles.meta}>{publicacion.hashtags.map((tag) => `#${tag}`).join(" ")}</Text>
                )}
              </View>
            </View>
          ))
        )}
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
