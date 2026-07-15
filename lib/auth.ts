import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const ALLOWED_GOOGLE_DOMAIN = "roipartners.com.br";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          select: { id: true, email: true, password: true, role: true, collaboratorId: true },
        });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          collaboratorId: user.collaboratorId,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      const email = profile?.email?.toLowerCase().trim();
      if (!email || !email.endsWith(`@${ALLOWED_GOOGLE_DOMAIN}`)) {
        return "/admin/login?error=domain";
      }

      // Mesmo com o domínio certo, a pessoa precisa já estar cadastrada
      // como AdminUser — login com Google não cria acesso novo sozinho.
      const existing = await prisma.adminUser.findUnique({ where: { email } });
      if (!existing) {
        return "/admin/login?error=not_registered";
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const adminUser = await prisma.adminUser.findUnique({
          where: { email: token.email.toLowerCase().trim() },
          select: { id: true, role: true, collaboratorId: true },
        });
        if (adminUser) {
          token.id = adminUser.id;
          token.role = adminUser.role;
          token.collaboratorId = adminUser.collaboratorId;
        }
        return token;
      }

      if (user) {
        token.id = user.id;
        token.role = user.role ?? "admin";
        token.collaboratorId = user.collaboratorId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.role = (token.role as "admin" | "operator") ?? "admin";
        session.user.collaboratorId = token.collaboratorId as string | undefined;
      }
      return session;
    },
  },
};
