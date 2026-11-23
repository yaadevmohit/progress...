export const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

export function contentSecurityPolicy(nonce: string, supabaseUrl: string | undefined, development = false) {
  const connections = ["'self'"];
  if (supabaseUrl) {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" && !(development && url.protocol === "http:")) {
      throw new Error("Supabase must use HTTPS in production.");
    }
    connections.push(url.origin, url.origin.replace(/^http/u, "ws"));
  }
  // Only local development needs eval and hot-reload WebSockets.
  if (development) connections.push("ws:", "http:");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${development ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // Charts and theme controls use React style attributes; scripts stay strict.
    "style-src-attr 'unsafe-inline'",
    `connect-src ${connections.join(" ")}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    ...(!development ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
