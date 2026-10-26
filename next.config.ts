import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Los pedidos de Zona Sur llevan la foto del comprobante. Vercel corta en 4,5 MB, así que 4 MB es el máximo útil.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
