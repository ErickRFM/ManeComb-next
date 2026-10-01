import type { NextConfig } from "next";

const securityHeaders=[
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"X-Frame-Options",value:"DENY"},
  {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
  {key:"Permissions-Policy",value:"geolocation=(self), microphone=(self), camera=(self)"},
  ...(process.env.NODE_ENV==="production"?[
    {key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"}
  ]:[])
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Keep development tooling from covering the operation bottom navigation in isolated QA.
  ...(process.env.VISUAL_QA==="1"?{devIndicators:false as const}:{}),
  async headers(){
    return [{source:"/:path*",headers:securityHeaders}];
  }
};

export default nextConfig;
