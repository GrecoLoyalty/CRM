import { createClient } from "@/lib/supabase/server";
import PizarronEditor from "@/components/pizarron/PizarronEditor";
import type { Pizarron } from "@/lib/pizarron";

export default async function PizarronPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: pizarrones, error }, { data: perfil }] = await Promise.all([
    supabase.from("pizarrones").select("*").order("updated_at", { ascending: false }),
    supabase.from("perfiles").select("role").eq("id", user.id).single(),
  ]);

  if (error) throw new Error("No se pudieron cargar los pizarrones.");

  return (
    <div className="max-w-[1500px] mx-auto">
      <PizarronEditor
        pizarrones={(pizarrones || []) as Pizarron[]}
        userId={user.id}
        puedeAdministrar={perfil?.role === "root" || perfil?.role === "ceo"}
      />
    </div>
  );
}
