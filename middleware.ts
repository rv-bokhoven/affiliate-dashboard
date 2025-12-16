// middleware.ts
export { default } from "next-auth/middleware";

// Hier geef je aan welke pagina's beveiligd moeten zijn.
// Met matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] zeg je eigenlijk:
// "Beveilig ALLES, behalve de API routes en plaatjes"
export const config = { matcher: ["/", "/offers", "/input", "/logs"] };