import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

type UserWithAvatar = {
  avatar?: string | null;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.avatar = (user as UserWithAvatar).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as UserWithAvatar).avatar = token.avatar as string | null;
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
        return { id: user.id, name: user.name, avatar: user.avatar };
      },
    }),
  ],
});
