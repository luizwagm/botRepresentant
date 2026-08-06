import Link from "next/link";
import AboutAdmin from "./about-admin";

export const dynamic = "force-dynamic";

export default function ConteudoPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Página &ldquo;Sobre nós&rdquo;</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edite o conteúdo da página institucional. Ela aparece publicamente em{" "}
          <Link href="/sobre" className="text-indigo-600 hover:underline">/sobre</Link>.
        </p>
      </div>
      <AboutAdmin />
    </div>
  );
}
