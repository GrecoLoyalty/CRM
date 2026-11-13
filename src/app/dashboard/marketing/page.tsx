import { redirect } from "next/navigation";

// La pantalla intermedia solo repetía los tres enlaces que ahora viven
// directo en el menú (Análisis → Planificar, Guiones, Marcas).
export default function MarketingPage() {
  redirect("/dashboard/marketing/calendario");
}
