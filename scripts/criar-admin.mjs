// Cria ou atualiza um administrador do painel.
// Uso: npm run criar-admin -- <usuario> <senha> "<Nome completo>"
import { randomBytes, scryptSync } from "crypto";
import { readFileSync } from "fs";
import postgres from "postgres";

const [usuario, senha, ...resto] = process.argv.slice(2);
const nome = resto.join(" ") || usuario;
if (!usuario || !senha) {
  console.error('Uso: npm run criar-admin -- <usuario> <senha> "<Nome completo>"');
  process.exit(1);
}
if (senha.length < 8) {
  console.error("A senha precisa ter pelo menos 8 caracteres.");
  process.exit(1);
}

let url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!url) {
  try {
    const linhas = readFileSync(".env.local", "utf8").split(/\r?\n/);
    for (const chave of ["DATABASE_URL=", "SUPABASE_DB_URL="]) {
      const linha = linhas.find((l) => l.startsWith(chave));
      const v = linha?.slice(chave.length).trim().replace(/^["']|["']$/g, "");
      if (v) { url = v; break; }
    }
  } catch {}
}
if (!url) {
  console.error("Preencha DATABASE_URL no .env.local antes.");
  process.exit(1);
}

const sal = randomBytes(16);
const hash = `scrypt$${sal.toString("base64")}$${scryptSync(senha, sal, 64).toString("base64")}`;

const sql = postgres(url, { prepare: false, max: 1 });
const [r] = await sql`
  insert into exposicao_cearense.administradores (usuario, nome, senha_hash)
  values (${usuario}, ${nome}, ${hash})
  on conflict (lower(usuario)) do update set senha_hash = excluded.senha_hash, nome = excluded.nome, ativo = true
  returning usuario, nome`;
await sql.end();
console.log(`Administrador pronto: ${r.usuario} (${r.nome})`);
