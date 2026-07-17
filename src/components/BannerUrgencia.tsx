"use client";

import clsx from "clsx";

const ESTILOS: Record<string, string> = {
  informativo: "bg-signal-info/15 text-signal-info border-signal-info/30",
  importante: "bg-signal-warn/15 text-signal-warn border-signal-warn/30",
  urgente: "bg-signal-urgent/15 text-signal-urgent border-signal-urgent/30",
};

export default function BannerUrgencia({ banners }: { banners: any[] }) {
  return (
    <div className="flex flex-col">
      {banners.map((b) => (
        <div
          key={b.id}
          className={clsx("px-6 py-2 text-sm border-b flex items-center gap-2", ESTILOS[b.nivel])}
        >
          <span className="font-semibold uppercase text-xs tracking-wide">{b.nivel}</span>
          <span className="opacity-90">{b.mensaje}</span>
        </div>
      ))}
    </div>
  );
}
