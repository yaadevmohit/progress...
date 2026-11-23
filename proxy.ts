import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "./security/headers";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
  const policy = contentSecurityPolicy(nonce, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  // Overwrite incoming values so clients cannot choose the script nonce.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|wav|mp3|woff2?|ttf)$).*)"],
};
