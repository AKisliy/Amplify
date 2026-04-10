import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`,
      },
      // Proxies /media/<guid> → <API_BASE>/media/api/media/<guid>
      // Allows using mediaUrl(guid) as a same-domain path — works with
      // <img>, <video>, and next/image without extra remotePatterns.
      {
        source: "/media/:guid",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/media/api/media/:guid`,
      },
      {
        source: "/media/:guid/:rest*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/media/api/media/:guid/:rest*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.bigfootdigital.co.uk",
      },
    ],
  },
};

export default nextConfig;
