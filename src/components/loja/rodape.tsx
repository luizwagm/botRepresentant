// Rodapé da loja = mapa estratégico do site: a última chamada pra ação, todas as
// portas de entrada (categorias, como comprar, institucional) e o atendimento.
// Componente de servidor, zero JavaScript.
import Link from "next/link";
import BrandLogo from "@/components/brand-logo";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { linkWhatsapp, telefoneVisivel } from "@/lib/loja/formato";
import { ROTAS, SITE } from "@/lib/site";
import { APP_VERSION } from "@/lib/version";
import Estrada from "./estrada";
import { BotaoLink, Container } from "./ui";

export default function Rodape({
  logoUrl,
  categorias,
  whatsapp,
}: {
  logoUrl: string | null;
  categorias: { slug: string; label: string }[];
  whatsapp: string | null;
}) {
  const ano = new Date().getFullYear();
  const wa = whatsapp
    ? linkWhatsapp(whatsapp, `Olá! Vim pelo site da ${SITE.nome} e quero atendimento para a minha loja.`)
    : null;

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/[0.06] bg-carvao sm:mt-32">
      {/* Chamada final — a estrada leva de volta pra loja */}
      <section aria-labelledby="rodape-cta" className="relative isolate border-b border-white/[0.06]">
        <Estrada className="absolute inset-x-0 bottom-0 -z-10 h-full w-full opacity-35" intensidade={0.5} />
        <Container className="py-20 text-center sm:py-28">
          <p className="rota-kicker">Próxima parada</p>
          <h2
            id="rodape-cta"
            className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2rem,5vw,3.75rem)] font-medium leading-[1.04] tracking-[-0.03em] text-creme"
          >
            Sua próxima coleção está na <span className="text-cobre">ROTA</span>.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <BotaoLink href={ROTAS.loja} seta>
              Ver todas as peças
            </BotaoLink>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full border border-creme/20 px-6 py-3.5 text-[0.95rem] font-medium text-creme transition-colors hover:border-cobre hover:text-cobre-claro"
              >
                <WhatsAppIcon className="h-[1.1rem] w-[1.1rem]" />
                Falar com um atendente
              </a>
            )}
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="sm:col-span-2 lg:col-span-4">
          <BrandLogo size="lg" logoUrl={logoUrl} />
          <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-creme-2">{SITE.descricao}</p>
          <p className="mt-6 text-[0.75rem] uppercase leading-relaxed tracking-[0.2em] text-nevoa">
            {SITE.polo.join(" · ")}
          </p>
        </div>

        <ColunaLinks titulo="Loja" className="lg:col-span-2">
          <LinkRodape href={ROTAS.loja}>Todas as peças</LinkRodape>
          {categorias.slice(0, 6).map((c) => (
            <LinkRodape key={c.slug} href={ROTAS.categoria(c.slug)}>
              {c.label}
            </LinkRodape>
          ))}
        </ColunaLinks>

        <ColunaLinks titulo="Comprar" className="lg:col-span-2">
          <LinkRodape href="/#como-comprar">Como comprar</LinkRodape>
          <LinkRodape href={ROTAS.carrinho}>Meu pedido</LinkRodape>
          <LinkRodape href="/#perguntas">Perguntas frequentes</LinkRodape>
        </ColunaLinks>

        <ColunaLinks titulo="Institucional" className="lg:col-span-2">
          <LinkRodape href={ROTAS.sobre}>Sobre a ROTA</LinkRodape>
          <LinkRodape href={ROTAS.privacidade}>Política de privacidade</LinkRodape>
          <LinkRodape href={ROTAS.termos}>Termos de uso</LinkRodape>
        </ColunaLinks>

        <div className="lg:col-span-2">
          <h2 className="rota-kicker">Atendimento</h2>
          <address className="mt-5 space-y-3 text-[0.95rem] not-italic text-creme-2">
            {wa && whatsapp && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-creme hover:text-cobre-claro"
              >
                <WhatsAppIcon className="h-4 w-4 text-sinal" />
                <span className="rota-num">{telefoneVisivel(whatsapp)}</span>
              </a>
            )}
            <p>{SITE.regiao}</p>
            <p className="text-nevoa">Atendimento a lojistas de todo o Brasil.</p>
          </address>
        </div>
      </Container>

      <div className="border-t border-white/[0.06]">
        <Container className="flex flex-col gap-3 py-7 text-[0.8rem] text-nevoa sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {ano} {SITE.nome}. {SITE.slogan}.
          </p>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="rota-filete text-[0.68rem] uppercase tracking-[0.3em]">Feito no Agreste</span>
            <Link href="/login" className="hover:text-creme-2">
              Área restrita
            </Link>
            <span title="Versão do site">v{APP_VERSION}</span>
          </p>
        </Container>
      </div>
    </footer>
  );
}

function ColunaLinks({
  titulo,
  className = "",
  children,
}: {
  titulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={titulo} className={className}>
      <h2 className="rota-kicker">{titulo}</h2>
      <ul className="mt-5 space-y-3">{children}</ul>
    </nav>
  );
}

function LinkRodape({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-[0.95rem] text-creme-2 transition-colors hover:text-cobre-claro">
        {children}
      </Link>
    </li>
  );
}
