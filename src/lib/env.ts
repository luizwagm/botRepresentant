import dotenv from "dotenv";

// override:true porque o Claude Code pode injetar ANTHROPIC_API_KEY vazio no
// ambiente, e queremos que o valor real do .env prevaleca. Mesma "pegadinha"
// que o lead_hunter_br ja tratou.
dotenv.config({ override: true });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  googlePlacesApiKey: required("GOOGLE_PLACES_API_KEY"),
  claudeModel: optional("CLAUDE_MODEL", "claude-sonnet-4-6"),
  luizWhatsapp: optional("LUIZ_WHATSAPP", ""),
  brandName: optional("BRAND_NAME", "Jeans Direto do Agreste"),
  // URL base publica (pra preview de link/og:image). Em producao: https://atacado.luizaugust.me
  publicBaseUrl: optional("PUBLIC_BASE_URL", "http://localhost:3030"),
  authSecret: required("AUTH_SECRET"),
  adminEmail: required("ADMIN_EMAIL"),
  adminPassword: required("ADMIN_PASSWORD"),
};
