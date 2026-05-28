import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.plan = dbUser?.plan;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.plan = token.plan as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Crear workspace por defecto si no existe
        const workspace = await prisma.workspace.findFirst({
          where: { userId: user.id! },
        });
        if (!workspace) {
          await prisma.workspace.create({
            data: {
              userId: user.id!,
              name: `Workspace de ${user.name || user.email}`,
            },
          });
        }
      }
      return true;
    },
  },
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
