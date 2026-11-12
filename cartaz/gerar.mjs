// Gera o cartaz do QR Code (cartaz/cartaz-qrcode.png).
// Uso: node cartaz/gerar.mjs   (na pasta sistema-votacao)
// Para trocar o animal da esquerda, coloque uma foto sem fundo em cartaz/animal.png.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import QRCode from "qrcode";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "..");
const SITE = "https://circuitodeexposicoes.vercel.app/";
const ANO = 2027;
const L = 1600, A = 1000;

const img = (p) => {
  const ext = p.endsWith(".jpg") ? "jpeg" : "png";
  return `data:image/${ext};base64,${readFileSync(p).toString("base64")}`;
};
const fundo = img(join(raiz, "public/marcas/fundo-foto.jpg"));
const sistema = img(join(raiz, "public/marcas/sistema-cor.png"));
const circuito = img(join(raiz, "public/marcas/logo-circuito-largo.png"));
const animalArq = ["animal.png", "animal.jpg", "animal.jpeg"].map((n) => join(aqui, n)).find(existsSync);
const animal = animalArq ? img(animalArq) : null;
// PNG sem fundo entra recortado; foto com fundo (jpg) entra com as bordas esfumadas no campo.
const animalSemFundo = animalArq?.endsWith(".png");
const qr = await QRCode.toString(SITE, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#123d22", light: "#ffffff" } });

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: ${L}px; height: ${A}px; overflow: hidden; }
  body { font-family: "Segoe UI", Arial, sans-serif; background: #fff url(${fundo}) center / cover no-repeat; position: relative; color: #123d22; }
  .topo { position: absolute; inset: 0 0 auto 0; height: 170px; background: linear-gradient(#fff 70%, rgba(255,255,255,0));
          display: flex; align-items: center; justify-content: center; gap: 48px; padding-top: 10px; }
  .topo img.sis { height: 108px; }
  .topo .div { width: 3px; height: 104px; background: #1f6b3a; border-radius: 2px; }
  .topo img.circ { height: 116px; }
  .faixa { position: absolute; top: 188px; left: 50%; transform: translateX(-50%); width: 1180px; display: flex; align-items: center; gap: 22px;
           background: linear-gradient(#f3faec, #dcefcc); border: 3px solid #fff; border-radius: 999px; padding: 14px 40px 14px 18px; box-shadow: 0 6px 18px rgba(0,0,0,.14); }
  .faixa .ic { flex: none; width: 84px; height: 84px; border-radius: 50%; background: #1d5e2c; display: grid; place-items: center; }
  .faixa .ic svg { width: 50px; height: 50px; }
  .faixa .sep { flex: none; width: 3px; height: 70px; background: #2e8b3e; border-radius: 2px; }
  .faixa p { flex: 1; text-align: center; font-size: 34px; line-height: 1.25; font-weight: 600; color: #123d22; }
  .faixa b { color: #155a2c; font-weight: 900; }
  .centro { position: absolute; top: 340px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 26px; }
  .qr-area { position: relative; }
  .raios { position: absolute; top: 50%; width: 70px; height: 150px; transform: translateY(-50%); }
  .raios.esq { left: -100px; } .raios.dir { right: -100px; transform: translateY(-50%) scaleX(-1); }
  .qr { background: #fff; padding: 22px; border-radius: 26px; border: 6px solid #2e8b3e; box-shadow: 0 10px 30px rgba(0,0,0,.18); }
  .qr svg { display: block; width: 330px; height: 330px; }
  .passo { display: flex; align-items: center; gap: 20px; background: rgba(255,255,255,.95); border: 3px solid #cfe6c2; border-radius: 22px; padding: 14px 30px 14px 16px;
           font-size: 29px; font-weight: 600; line-height: 1.35; box-shadow: 0 4px 14px rgba(0,0,0,.12); }
  .passo .ic { flex: none; width: 74px; height: 74px; border-radius: 50%; background: #1d5e2c; display: grid; place-items: center; }
  .passo .ic svg { width: 40px; height: 40px; }
  .passo .sep { width: 3px; align-self: stretch; background: #2e8b3e; border-radius: 2px; }
  .passo b { color: #155a2c; font-weight: 800; }
  .passo .id { display: inline-block; background: #1d5e2c; color: #fff; font-weight: 800; border-radius: 999px; padding: 0 16px; }
  .animal { position: absolute; left: 40px; bottom: 0; height: 640px; filter: drop-shadow(0 12px 20px rgba(0,0,0,.25)); }
  .animal.foto { left: 0; top: 330px; bottom: 0; width: 520px; height: auto; object-fit: cover; object-position: center 30%; filter: none;
                 -webkit-mask-image: radial-gradient(ellipse 50% 54% at 46% 56%, #000 62%, transparent 100%);
                 mask-image: radial-gradient(ellipse 50% 54% at 46% 56%, #000 62%, transparent 100%); }
</style></head><body>
  <div class="topo">
    <img class="sis" src="${sistema}" alt="Sistema FAEC SENAR Ceará Sindicato Rural">
    <span class="div"></span>
    <img class="circ" src="${circuito}" alt="Circuito Cearense de Exposição">
  </div>
  <div class="faixa">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 10v4h3l7 4V6L6 10z" fill="#fff"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/><path d="M6 14l1.5 5h2.5l-1-4.5"/></svg></span>
    <span class="sep"></span>
    <p>Avalie as exposições e escolha as <b>duas cidades</b><br>para fazerem parte do <b>circuito de ${ANO}.</b></p>
  </div>
  ${animal ? `<img class="animal${animalSemFundo ? "" : " foto"}" src="${animal}" alt="">` : ""}
  <div class="centro">
    <div class="qr-area">
      <svg class="raios esq" viewBox="0 0 70 150" fill="none" stroke="#3fa34d" stroke-width="10" stroke-linecap="round"><path d="M60 20L18 2"/><path d="M60 75H8"/><path d="M60 130L18 148"/></svg>
      <div class="qr">${qr}</div>
      <svg class="raios dir" viewBox="0 0 70 150" fill="none" stroke="#3fa34d" stroke-width="10" stroke-linecap="round"><path d="M60 20L18 2"/><path d="M60 75H8"/><path d="M60 130L18 148"/></svg>
    </div>
    <div class="passo">
      <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3" stroke-linecap="round"/></svg></span>
      <span class="sep"></span>
      <span><b>Escaneie o QR Code</b>, acesse o sistema e<br>informe seu <span class="id">ID de 5 números</span> para registrar sua avaliação.</span>
    </div>
  </div>
</body></html>`;

const htmlArq = join(aqui, "cartaz.html");
writeFileSync(htmlArq, html);
const png = join(aqui, "cartaz-qrcode.png");
const edge = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
execFileSync(edge, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  `--window-size=${L},${A}`, `--screenshot=${png}`, pathToFileURL(htmlArq).href], { stdio: "ignore" });
console.log("Cartaz gerado:", png);
