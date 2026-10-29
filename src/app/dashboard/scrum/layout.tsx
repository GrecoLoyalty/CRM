import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubNavScrum from "@/components/scrum/SubNavScrum";

export default async function ScrumLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: esMiembro } = await supabase.rpc("fn_scrum_es_miembro");

  if (!esMiembro) {
    return (
      <div className="max-w-xl mx-auto card p-8 text-center space-y-2">
        <h1 className="text-xl font-display font-semibold">Scrum de Tecnología & Soluciones</h1>
        <p className="text-sm text-gray-400">
          Todavía no formas parte del equipo Scrum. Pídele a Root o al CTO que te agregue en
          Scrum → Sprints y equipo.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Scrum</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tecnología & Soluciones: sprints de 2 semanas, backlog único y la Definición de “Terminado”.
        </p>
      </div>
      <SubNavScrum />
      {children}
    </div>
  );
}
