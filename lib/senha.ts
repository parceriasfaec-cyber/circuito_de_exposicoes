import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tam: number) => Promise<Buffer>;

/** Formato guardado no banco: scrypt$<sal base64>$<hash base64> */
export async function gerarHash(senha: string) {
  const sal = randomBytes(16);
  const hash = await scrypt(senha, sal, 64);
  return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
}

export async function conferirSenha(senha: string, guardado: string) {
  const [alg, salB64, hashB64] = guardado.split("$");
  if (alg !== "scrypt" || !salB64 || !hashB64) return false;
  const esperado = Buffer.from(hashB64, "base64");
  const calculado = await scrypt(senha, Buffer.from(salB64, "base64"), esperado.length);
  return timingSafeEqual(esperado, calculado);
}
