import type { NextConfig } from "next";

// BACKEND_URL은 서버사이드 전용 (NEXT_PUBLIC_ 없음) — Vercel에서 설정 필요
// 미설정 시 기본값으로 폴백
const BACKEND_URL = process.env.BACKEND_URL ?? "http://3.35.173.178:8080";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
    ],
  },
  reactCompiler: true,
  async rewrites() {
    return [
      // REST API 프록시: /api/v1/* → 백엔드
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      // socket.io 프록시: WebRTC + 채팅 소켓
      {
        source: "/socket.io/:path*",
        destination: `${BACKEND_URL}/socket.io/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
