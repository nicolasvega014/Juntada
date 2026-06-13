import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

type UserWithAvatar = {
  avatar?: string | null;
  alias?: string | null;
  name?: string | null;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.avatar = (user as UserWithAvatar).avatar;
        token.alias = (user as UserWithAvatar).alias;
      }
      if (trigger === "update" && session?.user) {
        token.name = (session.user as UserWithAvatar).name ?? token.name;
        token.avatar = (session.user as UserWithAvatar).avatar ?? token.avatar;
        token.alias = (session.user as UserWithAvatar).alias ?? token.alias;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        (session.user as UserWithAvatar).avatar = token.avatar as string | null;
        (session.user as UserWithAvatar).alias = token.alias as string | null;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        name: { label: "Nombre" },
        password: { label: "Contrase�a", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.name || !credentials?.password) return null;
        const { prisma } = await import("./prisma");
        const user = await prisma.user.findUnique({
          where: { name: credentials.name as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;
        return { id: user.id, name: user.name, avatar: user.avatar, alias: user.alias };
      },
    }),
  ],
});
