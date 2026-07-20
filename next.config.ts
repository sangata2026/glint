import type { NextConfig } from "next";

// When BACKEND_URL is set (e.g. the Vercel frontend deployment), all `/api/*`
// requests are proxied to the standalone backend (the Render deployment) so the
// UI stays stateless and secrets live only on the backend. When it is unset
// (the Render deployment itself, or local dev) the app serves its own API.
const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Keep the ZK wasm packages out of the bundler so their internal wasm-file
  // path resolution works at runtime (server-side Poseidon + proof verify).
  serverExternalPackages: ["@aztec/bb.js", "@noir-lang/noir_js"],

  async rewrites() {
    if (!backendUrl) return [];
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
