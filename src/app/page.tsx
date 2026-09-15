import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <Image
          src="/logo-mark.png"
          alt="Christian Gómez"
          width={335}
          height={257}
          priority
          className="mb-8 h-16 w-auto"
        />
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted">
          Neiva · Huila
        </p>
        <h1 className="font-display max-w-md text-4xl italic leading-tight sm:text-5xl">
          Christian Gómez
          <span className="block not-italic text-lg font-sans font-medium tracking-[0.2em] text-muted mt-3">
            PELUQUERÍA · ASESOR DE IMAGEN
          </span>
        </h1>

        <p className="mt-8 max-w-sm text-sm leading-relaxed text-muted">
          Cortes, color, alisados e hidratación con Christian, Fernando, Diany y
          Linci. Reserva tu cita en segundos.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <ButtonLink href="/reservar">Reservar cita</ButtonLink>
          <ButtonLink href="/staff/login" variant="secondary">
            Acceso staff
          </ButtonLink>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted">
        Carrera 19 # 8 -28, Barrio Cálixto, Neiva-Huila
      </footer>
    </div>
  );
}
