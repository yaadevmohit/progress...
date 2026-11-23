import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
