import type { NextConfig } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
let apiRemotePattern: { protocol: "http" | "https"; hostname: string; port?: string } | null = null;
try {
  if (apiBase) {
    const u = new URL(apiBase);
    apiRemotePattern = {
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
    };
  }
} catch {
  // ignore malformed URL in build environment
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
      // Proxies /media/<guid> → <API_BASE>/media/api/media/<guid>
      // Allows using mediaUrl(guid) as a same-domain path — works with
      // <img>, <video>, and next/image without extra remotePatterns.
      {
        source: "/media/:guid",
        destination: `${apiBase}/media/api/media/:guid`,
      },
      {
        source: "/media/:guid/:rest*",
        destination: `${apiBase}/media/api/media/:guid/:rest*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      ...(apiRemotePattern ? [apiRemotePattern] : []),
      {
        protocol: "https",
        hostname: "www.bigfootdigital.co.uk",
      },
    ],
  },
};

export default nextConfig;
