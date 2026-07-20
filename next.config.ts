import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the ZK wasm packages out of the bundler so their internal wasm-file
  // path resolution works at runtime (server-side Poseidon + proof verify).
  serverExternalPackages: ["@aztec/bb.js", "@noir-lang/noir_js"],
};

export default nextConfig;
