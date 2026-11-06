# Sistema de avaliação das exposições

Circuito Cearense de Exposição. Os produtores avaliam as exposições em que participaram e o sistema gera o ranking pela soma das notas.

Banco: Supabase, projeto **Parcerias**, schema `exposicao_cearense`.

## Rodar na máquina

1. Abra o arquivo `.env.local` e preencha `DATABASE_URL`:
   Supabase > botão **Connect** > **Transaction pooler** (porta 6543). Troque `[YOUR-PASSWORD]` pela senha do banco.
2. No terminal, dentro desta pasta:

   ```bash
   npm install
   npm run dev
   ```

3. Abra:
   - http://localhost:3000/admin : painel do organizador (login de teste no arquivo `admin-teste.txt`)
   - http://localhost:3000/votar : página do produtor

### Administradores

Os logins do painel ficam na tabela `exposicao_cearense.administradores`, com a senha guardada em hash (scrypt).
Para criar outro administrador ou trocar a senha de um existente:

```bash
npm run criar-admin -- maria SenhaForte123 "Maria da Silva"
```

Para desativar um login, marque `ativo = false` na tabela.

## Como testar

1. No `/admin`, clique em **Liberar votação**. Aparece o código do dia com 4 números.
2. Em outra janela (ou aba anônima), abra `/votar`, identifique-se e digite o código do dia.
   - Com documento: use um CPF da tabela `produtores`.
   - Sem documento: aba "Não tenho documento", digite o início do nome e escolha na lista.
3. Avalie as exposições. O painel mostra o progresso, as pendências e o ranking.
4. No `/admin`, clique em **Encerrar votação**.

Para testar pelo celular na mesma rede Wi-Fi, rode `npm run dev -- -H 0.0.0.0` e abra `http://IP-DO-COMPUTADOR:3000/votar`.

## Telas

| Caminho | Quem usa | O que faz |
|---|---|---|
| `/votar` | Produtor | Identificação (documento, ou nome + município) e código do dia |
| `/votar/exposicoes` | Produtor | Lista as exposições em que participou, com o que falta avaliar |
| `/votar/exposicoes/[id]` | Produtor | Questionário de 5 perguntas, notas de 5 a 10 |
| `/admin` | Organizador | Liberar e encerrar a votação, código do dia, ranking, progresso e pendências |
| `/admin/telao` | Organizador | QR Code e código do dia em tela cheia, para o telão |

## Segurança

- A conexão com o banco fica só no servidor (`DATABASE_URL`). O navegador nunca acessa o Supabase direto.
- Ao liberar de novo a votação, um novo código é gerado e as sessões antigas dos produtores deixam de valer.
- Depois de 8 códigos errados em 15 minutos, aquele IP fica bloqueado por um tempo (tabela `tentativas_codigo`).
