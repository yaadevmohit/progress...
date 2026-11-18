import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/skills-tracker/:path*",
        destination: "/growth-board/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
