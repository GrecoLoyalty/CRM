"use client";

import { useRouter } from "next/navigation";

export default function BotonVolver() {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} className="text-xs text-gray-500 hover:text-gray-300">
      ← Volver
    </button>
  );
}
