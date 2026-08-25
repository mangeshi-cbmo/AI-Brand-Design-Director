import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyTOTPToken } from "./totp";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "google-authenticator",
      name: "Google Authenticator TOTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "6-Digit Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const code = credentials?.code?.trim();

        if (!email || !code) {
          throw new Error("Email and 6-digit code are required");
        }

        // Verify with Google Authenticator TOTP
        const isValid = verifyTOTPToken(email, code);
        if (!isValid) {
          throw new Error("Invalid or expired 6-digit code. Please try again.");
        }

        // Return authenticated session user
        return {
          id: `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
          name: email.split("@")[0],
          email: email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/generate`;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "super-secret-nextauth-key-change-in-prod-123456",
};
