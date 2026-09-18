import Kanban from "./kanban";

export const dynamic = "force-dynamic";

export default function FunilPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Funil de vendas</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Arraste os cards entre as colunas pra mover o lead pela jornada. Clique pra abrir.
        </p>
      </div>
      <Kanban />
    </div>
  );
}
