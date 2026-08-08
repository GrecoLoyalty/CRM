"use client";

import Icon, { type IconName } from "@/components/ui/Icon";
import clsx from "clsx";

const NIVEL: Record<string, { clase: string; icono: IconName }> = {
  informativo: { clase: "banner-informativo", icono: "info" },
  importante: { clase: "banner-importante", icono: "alerta" },
  urgente: { clase: "banner-urgente", icono: "alerta" },
};

export default function BannerUrgencia({ banners }: { banners: any[] }) {
  return (
    <div className="flex flex-col gap-2 pb-1">
      {banners.map((b) => {
        const cfg = NIVEL[b.nivel] ?? NIVEL.informativo;
        return (
          <div key={b.id} className={clsx("banner-float", cfg.clase)} role="status">
            <div className="flex items-start gap-2.5">
              <Icon
                name={cfg.icono}
                className={clsx(
                  "w-[18px] h-[18px] shrink-0 mt-px",
                  b.nivel === "urgente" && "animate-pulse-glow"
                )}
              />
              <div className="min-w-0 flex-1">
                <span className="font-semibold uppercase text-[10px] tracking-[0.1em] opacity-90">
                  {b.nivel}
                </span>
                <p className="text-sm text-gray-100 mt-0.5 leading-snug">{b.mensaje}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
