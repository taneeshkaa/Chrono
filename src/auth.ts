import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './lib/prisma'
import type { Session, User, Account } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/calendar',
          ].join(' '),
        },
      },
    }),
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user || !user.password) {
            // No user found or signed up via Google (no password set)
            return null
          }

          const { verifyPassword } = await import('./lib/password')
          const isValid = await verifyPassword(password, user.password)

          if (!isValid) return null

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({
      token,
      user,
      account,
    }: {
      token: JWT
      user?: User
      account?: Account | null
    }) {
      // On initial sign-in, user and account are available
      if (user && account) {
        token.id = user.id!
        token.name = user.name
        token.email = user.email
        token.picture = user.image

        // Store Google tokens so we can use them for Gmail/Calendar
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      // For credentials sign-in, account may not have Google tokens
      if (user && !account) {
        token.id = user.id!
        token.name = user.name
        token.email = user.email
        token.picture = user.image
      }

      // Fallback: if token.id is missing, look up user by email
      if (!token.id && token.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        })

        if (existingUser) {
          token.id = existingUser.id
        }
      }

      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/error-auth',
  },
})
