/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["postgres"],
  // Só no modo de teste (npm run dev): permite abrir pelo IP da rede local, para testar no celular.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],
  // Endereço antigo do painel do próximo ano (antes era fixo em 2027).
  async redirects() {
    return [
      { source: "/admin/2027", destination: "/admin/proximo", permanent: false },
      { source: "/admin/2027/:caminho*", destination: "/admin/proximo/:caminho*", permanent: false },
    ];
  },
};

export default nextConfig;
