/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["postgres"],
  // Só no modo de teste (npm run dev): permite abrir pelo IP da rede local, para testar no celular.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],
};

export default nextConfig;
