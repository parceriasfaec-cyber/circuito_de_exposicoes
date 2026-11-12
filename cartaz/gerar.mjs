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
  .titulo { position: absolute; top: 190px; left: 50%; transform: translateX(-50%); white-space: nowrap;
            background: #e4f2d6; border: 3px solid #fff; border-radius: 999px; padding: 14px 54px;
            font-size: 50px; font-weight: 900; letter-spacing: 1px; color: #155a2c; box-shadow: 0 6px 18px rgba(0,0,0,.12); }
  .sub { position: absolute; top: 290px; left: 0; right: 0; text-align: center; font-size: 34px; font-weight: 600; color: #123d22;
         text-shadow: 0 0 14px #fff, 0 0 6px #fff; }
  .sub b { color: #155a2c; font-weight: 900; }
  .centro { position: absolute; top: 352px; left: ${animal ? 560 : 0}px; right: 0; display: flex; flex-direction: column; align-items: center; gap: 22px; }
  .qr { background: #fff; padding: 22px; border-radius: 26px; border: 5px solid #2e8b3e; box-shadow: 0 10px 30px rgba(0,0,0,.18); }
  .qr svg { display: block; width: 300px; height: 300px; }
  .passo { display: flex; align-items: center; gap: 18px; background: rgba(255,255,255,.93); border-radius: 18px; padding: 14px 28px;
           font-size: 25px; font-weight: 600; line-height: 1.3; box-shadow: 0 4px 14px rgba(0,0,0,.12); }
  .passo .cel { flex: none; width: 44px; height: 64px; border: 4px solid #2e8b3e; border-radius: 9px; position: relative; background: #e4f2d6; }
  .passo .cel::after { content: ""; position: absolute; left: 50%; bottom: 4px; width: 10px; height: 4px; margin-left: -5px; background: #2e8b3e; border-radius: 2px; }
  .passo .sep { width: 3px; align-self: stretch; background: #2e8b3e; border-radius: 2px; }
  .link { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 14px;
          background: #0f4a24; color: #fff; border: 3px solid #7cc24a; border-radius: 999px; padding: 12px 40px; font-size: 30px; font-weight: 800; white-space: nowrap; }
  .link svg { width: 32px; height: 32px; }
  .animal { position: absolute; left: 40px; bottom: 0; height: 640px; filter: drop-shadow(0 12px 20px rgba(0,0,0,.25)); }
  .animal.foto { left: 0; top: 340px; bottom: 0; width: 600px; height: auto; object-fit: cover; object-position: center 30%; filter: none;
                 -webkit-mask-image: radial-gradient(ellipse 50% 54% at 46% 56%, #000 62%, transparent 100%);
                 mask-image: radial-gradient(ellipse 50% 54% at 46% 56%, #000 62%, transparent 100%); }
</style></head><body>
  <div class="topo">
    <img class="sis" src="${sistema}" alt="Sistema FAEC SENAR Ceará Sindicato Rural">
    <span class="div"></span>
    <img class="circ" src="${circuito}" alt="Circuito Cearense de Exposição">
  </div>
  <div class="titulo">CIRCUITO CEARENSE DE EXPOSIÇÃO</div>
  <p class="sub">Avalie as exposições e escolha as <b>2 novas cidades</b> para ${ANO}.</p>
  ${animal ? `<img class="animal${animalSemFundo ? "" : " foto"}" src="${animal}" alt="">` : ""}
  <div class="centro">
    <div class="qr">${qr}</div>
    <div class="passo"><span class="cel"></span><span class="sep"></span>
      <span>Aponte a câmera do celular para o QR Code,<br>avalie as exposições e escolha as 2 novas cidades.</span></div>
  </div>
  <div class="link">
    <svg viewBox="0 0 24 24" fill="none" stroke="#7cc24a" stroke-width="2.6" stroke-linecap="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
    circuitodeexposicoes.vercel.app
  </div>
</body></html>`;

const htmlArq = join(aqui, "cartaz.html");
writeFileSync(htmlArq, html);
const png = join(aqui, "cartaz-qrcode.png");
const edge = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
execFileSync(edge, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  `--window-size=${L},${A}`, `--screenshot=${png}`, pathToFileURL(htmlArq).href], { stdio: "ignore" });
console.log("Cartaz gerado:", png);
