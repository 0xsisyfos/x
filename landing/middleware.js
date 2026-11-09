// Vercel Routing Middleware: serve the Markdown version of the landing page
// to clients that ask for it with `Accept: text/markdown`. Browsers keep
// getting HTML. Static files are served before vercel.json rewrites, so the
// negotiation has to happen here.
export const config = {
  matcher: ["/", "/index.html"],
};

export default function middleware(request) {
  const accept = request.headers.get("accept") || "";
  if (accept.toLowerCase().includes("text/markdown")) {
    return new Response(null, {
      headers: { "x-middleware-rewrite": new URL("/index.md", request.url).toString() },
    });
  }
  return new Response(null, { headers: { "x-middleware-next": "1" } });
}
