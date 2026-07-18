"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Barra {
  etiqueta: string;
  valor: number;
}

export default function GraficaBarras({
  datos,
  colorBarra = "#3AA7A1",
  formatearValor = (v: number) => String(v),
  alturaViewBox = 260,
}: {
  datos: Barra[];
  colorBarra?: string;
  formatearValor?: (v: number) => string;
  alturaViewBox?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const ANCHO = 640;
  const ALTO = alturaViewBox;

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (datos.length === 0) {
      svg
        .append("text")
        .attr("x", ANCHO / 2)
        .attr("y", ALTO / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#6B7280")
        .attr("font-size", 13)
        .text("Todavía no hay datos suficientes.");
      return;
    }

    const margen = { top: 16, right: 12, bottom: 34, left: 12 };
    const anchoInterno = ANCHO - margen.left - margen.right;
    const altoInterno = ALTO - margen.top - margen.bottom;

    const g = svg.append("g").attr("transform", `translate(${margen.left},${margen.top})`);

    const x = d3
      .scaleBand()
      .domain(datos.map((d) => d.etiqueta))
      .range([0, anchoInterno])
      .padding(0.35);

    const maxValor = d3.max(datos, (d) => d.valor) || 1;
    const y = d3.scaleLinear().domain([0, maxValor * 1.15]).range([altoInterno, 0]);

    // Línea base
    g.append("line")
      .attr("x1", 0)
      .attr("x2", anchoInterno)
      .attr("y1", altoInterno)
      .attr("y2", altoInterno)
      .attr("stroke", "#232B3F")
      .attr("stroke-width", 1);

    const barra = g
      .selectAll("g.barra")
      .data(datos)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${x(d.etiqueta)},0)`);

    barra
      .append("rect")
      .attr("x", 0)
      .attr("y", altoInterno)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("rx", 4)
      .attr("fill", colorBarra)
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr("y", (d) => y(d.valor))
      .attr("height", (d) => altoInterno - y(d.valor));

    barra
      .append("text")
      .attr("x", x.bandwidth() / 2)
      .attr("y", (d) => y(d.valor) - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "#D1D5DB")
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .style("opacity", 0)
      .text((d) => formatearValor(d.valor))
      .transition()
      .delay(300)
      .duration(400)
      .style("opacity", 1);

    g.append("g")
      .attr("transform", `translate(0,${altoInterno + 16})`)
      .selectAll("text")
      .data(datos)
      .enter()
      .append("text")
      .attr("x", (d) => (x(d.etiqueta) || 0) + x.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#6B7280")
      .attr("font-size", 10)
      .text((d) => d.etiqueta);
  }, [datos, colorBarra, formatearValor]);

  return <svg ref={svgRef} viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid meet" className="w-full" style={{ height: ALTO }} />;
}
