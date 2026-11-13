import { redirect } from "next/navigation";

// Había dos implementaciones de la Vista de Águila. Se queda una sola
// (/dashboard/ceo, que ya ajusta lo que ve cada rol); esta ruta solo
// redirige para no romper enlaces o favoritos antiguos.
export default function VistaAguilaPage() {
  redirect("/dashboard/ceo");
}
