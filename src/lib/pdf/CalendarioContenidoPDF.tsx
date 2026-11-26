import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

type PublicacionCalendarioPDF = {
  dia: string;
  fecha_hora: string;
  marca: string;
  plataforma: string;
  estado: string;
  responsable: string;
  guion: string;
  caption: string;
  hashtags: string[];
};

const COLOR_ACCENT = "#1F8A82";
const COLOR_INK = "#1A2130";
const COLOR_MUTED = "#6B7280";
const COLOR_LINE = "#D8DEE5";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLOR_INK,
  },
  header: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLOR_ACCENT,
  },
  title: { fontSize: 17, fontFamily: "Helvetica-Bold", color: COLOR_ACCENT },
  subtitle: { fontSize: 8, color: COLOR_MUTED, marginTop: 3 },
  weekdays: { flexDirection: "row", marginBottom: 2 },
  weekday: {
    width: "14.2857%",
    textAlign: "center",
    paddingVertical: 4,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLOR_MUTED,
    textTransform: "uppercase",
  },
  week: { flexDirection: "row" },
  dayCell: {
    width: "14.2857%",
    padding: 4,
    borderWidth: 0.5,
    borderColor: COLOR_LINE,
    backgroundColor: "#FFFFFF",
  },
  dayNumber: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  event: {
    borderLeftWidth: 1.5,
    borderLeftColor: COLOR_ACCENT,
    paddingLeft: 3,
    marginBottom: 3,
  },
  eventTime: { fontSize: 6, fontFamily: "Helvetica-Bold", color: COLOR_ACCENT },
  eventName: { fontSize: 6, color: COLOR_INK, marginTop: 1 },
  moreEvents: { fontSize: 6, color: COLOR_MUTED, marginTop: 1 },
  detail: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_LINE,
  },
  detailsContent: {
    paddingTop: 48,
  },
  detailDate: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLOR_ACCENT,
    marginBottom: 3,
  },
  detailBody: { width: "100%" },
  detailTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  detailMeta: { fontSize: 8, color: "#4B5563", marginBottom: 4 },
  detailCaption: { fontSize: 8, lineHeight: 1.35, marginTop: 3 },
  empty: { fontSize: 9, color: COLOR_MUTED, paddingVertical: 12 },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 24,
    right: 24,
    textAlign: "right",
    color: COLOR_MUTED,
    fontSize: 7,
  },
});

function formatearFecha(value: string) {
  return new Date(value).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatearHora(value: string) {
  return new Date(value).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function textoCorto(value: string, limite: number) {
  return value.length > limite ? `${value.slice(0, limite - 1)}…` : value;
}

export function CalendarioContenidoPDF({
  titulo,
  rango,
  dias,
  publicaciones,
}: {
  titulo: string;
  rango: string;
  dias: string[];
  publicaciones: PublicacionCalendarioPDF[];
}) {
  const semanas = Array.from({ length: Math.ceil(dias.length / 7) }, (_, index) =>
    dias.slice(index * 7, index * 7 + 7)
  );
  const altoCelda = Math.floor(460 / semanas.length);
  const maxEventosVisibles = Math.max(2, Math.floor((altoCelda - 14) / 23));
  const publicacionesPorDia = new Map<string, PublicacionCalendarioPDF[]>();

  for (const publicacion of publicaciones) {
    const delDia = publicacionesPorDia.get(publicacion.dia) || [];
    delDia.push(publicacion);
    publicacionesPorDia.set(publicacion.dia, delDia);
  }

  return (
    <Document title={`Calendario de contenido — ${titulo}`} author="GRESANOVA OS">
      <Page size="A4" orientation="landscape" style={styles.page} wrap={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Calendario de contenido · {titulo}</Text>
          <Text style={styles.subtitle}>{rango} · GRESANOVA OS</Text>
        </View>
        <View style={styles.weekdays}>
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => (
            <Text key={dia} style={styles.weekday}>{dia}</Text>
          ))}
        </View>
        {semanas.map((semana, index) => (
          <View key={index} style={[styles.week, { height: altoCelda }]}>
            {semana.map((dia) => {
              const eventos = publicacionesPorDia.get(dia) || [];
              const numeroDia = Number(dia.slice(-2));
              return (
                <View key={dia} style={[styles.dayCell, { height: altoCelda }]}>
                  <Text style={styles.dayNumber}>{numeroDia}</Text>
                  {eventos.slice(0, maxEventosVisibles).map((evento, eventoIndex) => (
                    <View key={`${evento.fecha_hora}-${eventoIndex}`} style={styles.event}>
                      <Text style={styles.eventTime}>
                        {formatearHora(evento.fecha_hora)} · {textoCorto(evento.plataforma, 13)}
                      </Text>
                      <Text style={styles.eventName}>{textoCorto(evento.marca, 20)}</Text>
                    </View>
                  ))}
                  {eventos.length > maxEventosVisibles && (
                    <Text style={styles.moreEvents}>
                      +{eventos.length - maxEventosVisibles} más
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </Page>

      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.title}>Detalle de publicaciones</Text>
          <Text style={styles.subtitle}>{rango} · GRESANOVA OS</Text>
        </View>
        <View style={styles.detailsContent}>
          {publicaciones.length === 0 ? (
            <Text style={styles.empty}>No hay publicaciones en este periodo con los filtros seleccionados.</Text>
          ) : (
            publicaciones.map((publicacion, index) => (
              <View key={`${publicacion.fecha_hora}-${index}`} style={styles.detail}>
                <Text style={styles.detailDate}>
                  {formatearFecha(publicacion.fecha_hora)} · {formatearHora(publicacion.fecha_hora)}
                </Text>
                <View style={styles.detailBody}>
                  <Text style={styles.detailTitle}>
                    {publicacion.marca} · {publicacion.plataforma}
                  </Text>
                  <Text style={styles.detailMeta}>
                    Estado: {publicacion.estado} · Responsable: {publicacion.responsable}
                  </Text>
                  {publicacion.guion && (
                    <Text style={styles.detailMeta}>Guion: {publicacion.guion}</Text>
                  )}
                  {publicacion.caption && (
                    <Text style={styles.detailCaption}>{publicacion.caption}</Text>
                  )}
                  {publicacion.hashtags.length > 0 && (
                    <Text style={styles.detailMeta}>
                      {publicacion.hashtags.map((tag) => `#${tag}`).join(" ")}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
