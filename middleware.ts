// middleware.ts
export { default } from "next-auth/middleware";

// Hier geef je aan welke pagina's beveiligd moeten zijn.
// Nu staat er: beveilig de homepagina (/) en alles onder /offers en /input
export const config = {
  matcher: [
    "/",
    "/offers/:path*",
    "/input/:path*",
    "/api/stats/:path*" // Ook je API endpoints beschermen
  ]
};