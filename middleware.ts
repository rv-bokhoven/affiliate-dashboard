import { withAuth } from "next-auth/middleware";

// In plaats van het direct te exporteren, roepen we de functie aan
export default withAuth({
  callbacks: {
    // Deze functie bepaalt of iemand door mag. 
    // !!token betekent: "Is er een token? Ja? Dan is het true (ingelogd)."
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    // Beveilig de homepagina
    "/",
    // Beveilig alles onder /offers
    "/offers/:path*",
    // Beveilig de input pagina
    "/input/:path*",
    // Beveilig de statistieken API
    "/api/stats/:path*" 
  ]
};