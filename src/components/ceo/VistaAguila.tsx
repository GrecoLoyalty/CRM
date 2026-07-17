"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Props {
  conteoPorDepto: Record<string, number>;
  cuellosBotella: Record<string, number>;
}

const NODOS = [
  { id: "ventas", label: "Ventas", x: 90, y: 200 },
  { id: "analisis", label: "Análisis", x: 320, y: 200 },
  { id: "estetica", label: "Estética Visual", x: 560, y: 90 },
  { id: "desarrollo", label: "Desarrollo", x: 560, y: 310 },
];

const ENLACES = [
  ["ventas", "analisis"],
  ["analisis", "estetica"],
  ["analisis", "desarrollo"],
];

export default function VistaAguila({ conteoPorDepto, cuellosBotella }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Enlaces (tuberías de flujo)
    ENLACES.forEach(([origenId, destinoId]) => {
      const origen = NODOS.find((n) => n.id === origenId)!;
      const destino = NODOS.find((n) => n.id === destinoId)!;

      g.append("line")
        .attr("x1", origen.x)
        .attr("y1", origen.y)
        .attr("x2", destino.x)
        .attr("y2", destino.y)
        .attr("stroke", "#232B3F")
        .attr("stroke-width", 3);

      // Partículas animadas que viajan del origen al destino, representan clientes fluyendo
      const numParticulas = Math.min(4, Math.max(1, conteoPorDepto[destinoId] || 1));
      for (let i = 0; i < numParticulas; i++) {
        const particula = g
          .append("circle")
          .attr("r", 3)
          .attr("fill", "#3AA7A1")
          .attr("opacity", 0.85);

        const duracion = 2800;
        const retraso = (duracion / numParticulas) * i;

        function animar() {
          particula
            .attr("cx", origen.x)
            .attr("cy", origen.y)
            .transition()
            .delay(retraso)
            .duration(duracion)
            .ease(d3.easeLinear)
            .attr("cx", destino.x)
            .attr("cy", destino.y)
            .on("end", animar);
        }
        animar();
      }
    });

    // Nodos
    const nodo = g
      .selectAll("g.nodo")
      .data(NODOS)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodo
      .append("circle")
      .attr("r", 42)
      .attr("fill", "#12161F")
      .attr("stroke", (d) => (cuellosBotella[d.id] > 0 ? "#EF4444" : "#3AA7A1"))
      .attr("stroke-width", 2);

    nodo
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", -2)
      .attr("fill", "#F3F4F6")
      .attr("font-family", "Space Grotesk, sans-serif")
      .attr("font-size", 22)
      .attr("font-weight", 600)
      .text((d) => conteoPorDepto[d.id] ?? 0);

    nodo
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 16)
      .attr("fill", "#6B7280")
      .attr("font-size", 9)
      .text("clientes");

    nodo
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 62)
      .attr("fill", "#D1D5DB")
      .attr("font-size", 12)
      .attr("font-weight", 500)
      .text((d) => d.label);

    // Indicador de cuello de botella
    nodo
      .filter((d) => cuellosBotella[d.id] > 0)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 78)
      .attr("fill", "#EF4444")
      .attr("font-size", 10)
      .text((d) => `⚠ ${cuellosBotella[d.id]} vencida(s)`);
  }, [conteoPorDepto, cuellosBotella]);

  return (
    <div className="card p-6 overflow-x-auto">
      <svg ref={svgRef} viewBox="0 0 680 400" className="w-full min-w-[600px] h-[380px]" />
    </div>
  );
}
