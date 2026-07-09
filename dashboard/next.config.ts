import type { NextConfig } from "next";
import path from "path";

// turbopack.root points to the monorepo root (parent dir) so that Turbopack
// can resolve workspace dependencies (e.g. shared packages) that live outside
// the dashboard directory. Without this, builds fail with module-not-found.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
