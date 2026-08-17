// Processos pm2 do servidor. Rode como o usuário `deploy`, nunca como root:
//   pm2 start ecosystem.config.cjs
//   pm2 save
//
// TZ é fixado de propósito: o servidor costuma rodar em UTC, e a janela de
// horário de envio (e o corte do dia no teto diário) precisa ser a do Brasil —
// senão o motor manda mensagem 21h achando que são 18h.
module.exports = {
  apps: [
    {
      name: "atacado",
      cwd: "/var/www/atacado",
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production", TZ: "America/Sao_Paulo" },
      autorestart: true,
      max_restarts: 10,
      // Logs no padrão do pm2 (~/.pm2/logs) — um caminho em /var/log exigiria
      // root pra criar o diretório e o start falharia como usuário `deploy`.
    },
    {
      // Worker da prospecção: mantém a sessão do WhatsApp e roda o motor.
      // Processo separado de propósito — o app web não carrega o Baileys.
      name: "outreach-worker",
      cwd: "/var/www/atacado",
      script: "npm",
      args: "run outreach:worker",
      env: { NODE_ENV: "production", TZ: "America/Sao_Paulo" },
      autorestart: true,
      // Se a sessão do WhatsApp cair de vez (logout no aparelho), o worker sai
      // com erro. Reiniciar em laço não resolve — precisa de QR novo.
      max_restarts: 5,
      min_uptime: "30s",
    },
  ],
};
