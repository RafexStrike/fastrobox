import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { env } from "@/environment";
import { authenticateUser } from "@/lib/users";
import { isUserRole } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username or email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          typeof credentials?.username !== "string" ||
          typeof credentials.password !== "string" ||
          !credentials.username.trim()
        ) {
          return null;
        }

        return authenticateUser(credentials.username, credentials.password);
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        delete token.name;
        delete token.email;
        delete token.picture;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub && isUserRole(token.role)) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
});