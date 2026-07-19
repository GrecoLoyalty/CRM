import { Suspense } from "react";
import LoginForm from "./LoginForm";

// LoginForm usa useSearchParams() (para soportar ?next=... y volver a
// donde estaba el usuario, como el link de invitación a un evento), y
// Next.js exige que cualquier componente con useSearchParams esté
// envuelto en Suspense para poder seguir pre-renderizando la página.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
