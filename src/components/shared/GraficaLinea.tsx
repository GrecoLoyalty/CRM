"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface PuntoLinea {
  etiqueta: string;
  valor: number;
}

export default function GraficaLinea({
  datos,
  formatearValor = (v: number) => String(v),
  alturaViewBox = 260,
}: {
  datos: PuntoLinea[];
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
        .text("Todavía no hay movimientos registrados.");
      return;
    }

    const margen = { top: 20, right: 16, bottom: 34, left: 16 };
    const anchoInterno = ANCHO - margen.left - margen.right;
    const altoInterno = ALTO - margen.top - margen.bottom;

    const g = svg.append("g").attr("transform", `translate(${margen.left},${margen.top})`);

    const x = d3
      .scalePoint()
      .domain(datos.map((d) => d.etiqueta))
      .range([0, anchoInterno])
      .padding(0.5);

    const minValor = Math.min(0, d3.min(datos, (d) => d.valor) || 0);
    const maxValor = Math.max(0, d3.max(datos, (d) => d.valor) || 0);
    const y = d3
      .scaleLinear()
      .domain([minValor - Math.abs(minValor) * 0.1 - 1, maxValor * 1.15 + 1])
      .range([altoInterno, 0]);

    const colorLinea = maxValor >= 0 ? "#3AA7A1" : "#EF4444";

    // Línea del cero, para dejar claro cuándo la caja está en negativo.
    g.append("line")
      .attr("x1", 0)
      .attr("x2", anchoInterno)
      .attr("y1", y(0))
      .attr("y2", y(0))
      .attr("stroke", "#232B3F")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");

    const area = d3
      .area<PuntoLinea>()
      .x((d) => x(d.etiqueta) || 0)
      .y0(y(0))
      .y1((d) => y(d.valor))
      .curve(d3.curveMonotoneX);

    const linea = d3
      .line<PuntoLinea>()
      .x((d) => x(d.etiqueta) || 0)
      .y((d) => y(d.valor))
      .curve(d3.curveMonotoneX);

    g.append("path").datum(datos).attr("d", area).attr("fill", colorLinea).attr("opacity", 0.12);

    const path = g
      .append("path")
      .datum(datos)
      .attr("d", linea)
      .attr("fill", "none")
      .attr("stroke", colorLinea)
      .attr("stroke-width", 2.5);

    const largo = (path.node() as SVGPathElement).getTotalLength();
    path
      .attr("stroke-dasharray", `${largo} ${largo}`)
      .attr("stroke-dashoffset", largo)
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    g.selectAll("circle.punto")
      .data(datos)
      .enter()
      .append("circle")
      .attr("class", "punto")
      .attr("cx", (d) => x(d.etiqueta) || 0)
      .attr("cy", (d) => y(d.valor))
      .attr("r", 3.5)
      .attr("fill", "#0B0E14")
      .attr("stroke", colorLinea)
      .attr("stroke-width", 2);

    // Etiqueta del último punto (saldo actual).
    const ultimo = datos[datos.length - 1];
    g.append("text")
      .attr("x", x(ultimo.etiqueta) || 0)
      .attr("y", y(ultimo.valor) - 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#F3F4F6")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .text(formatearValor(ultimo.valor));

    g.append("g")
      .attr("transform", `translate(0,${altoInterno + 16})`)
      .selectAll("text")
      .data(datos)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.etiqueta) || 0)
      .attr("text-anchor", "middle")
      .attr("fill", "#6B7280")
      .attr("font-size", 10)
      .text((d) => d.etiqueta);
  }, [datos, formatearValor]);

  return <svg ref={svgRef} viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid meet" className="w-full" style={{ height: ALTO }} />;
}
