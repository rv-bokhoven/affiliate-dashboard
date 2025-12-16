// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  // We gebruiken 'Credentials' (gewoon gebruikersnaam/wachtwoord)
  providers: [
    CredentialsProvider({
      name: "Wachtwoord",
      credentials: {
        username: { label: "Gebruikersnaam", type: "text", placeholder: "admin" },
        password: { label: "Wachtwoord", type: "password" }
      },
      async authorize(credentials) {
        // Hier checken we of het wachtwoord klopt met wat in .env staat
        const isValid = credentials?.password === process.env.ADMIN_PASSWORD;

        if (isValid) {
          // Als het klopt, laten we de gebruiker binnen
          return { id: "1", name: "Admin", email: "admin@local.com" };
        } else {
          // Zo niet: toegang geweigerd
          return null;
        }
      }
    })
  ],
  // Als er iets misgaat of je moet inloggen, ga naar deze pagina:
  pages: {
    signIn: '/auth/signin', // Die gaan we zo maken, staat netter dan de standaard pagina
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };