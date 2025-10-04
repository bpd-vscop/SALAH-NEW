// filepath: apps/web/app/api/auth/[...nextauth].ts
// NextAuth.js configuration for authentication without Prisma

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import bcrypt from 'bcryptjs';

import {
  connectMongo,
  getClient,
  authRepository,
} from '@automotive/database';

const clientPromise = (async () => {
  await connectMongo();
  return getClient();
})();

const handler = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const customer = await authRepository.customers.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!customer) {
            return null;
          }

          if (customer.isActive === false) {
            throw new Error('Account is deactivated');
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            customer.passwordHash,
          );

          if (!isPasswordValid) {
            return null;
          }

          await authRepository.customers.update({
            where: { id: customer.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: customer.id,
            email: customer.email,
            name: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim(),
            role: 'CUSTOMER',
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).role = (user as any).role ?? 'CUSTOMER';
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub!;
        (session.user as any).role = (token as any).role ?? 'CUSTOMER';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
