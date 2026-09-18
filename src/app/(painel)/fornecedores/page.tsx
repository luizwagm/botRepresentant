import FornecedoresAdmin from "./fornecedores-admin";

export const dynamic = "force-dynamic";

export default function FornecedoresPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Fornecedores</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cadastro das fábricas/facções que fornecem as peças. Uso interno — não aparece no catálogo público.
          Vincule o fornecedor a cada produto na tela de <span className="font-medium">Catálogo</span>.
        </p>
      </div>
      <FornecedoresAdmin />
    </div>
  );
}
