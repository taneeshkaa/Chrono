'use server'

import { signIn, signOut, auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

export async function handleSignIn() {
  await signIn('google', { redirectTo: '/dashboard' })
}

export async function handleSignOut() {
  await signOut({ redirectTo: '/login' })
}

export async function handleEmailSignIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  await signIn('credentials', {
    email,
    password,
    redirectTo: '/dashboard',
  })
}

export async function handleEmailSignUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string | null

  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error('An account with this email already exists. Please sign in instead.')
  }

  // Create user with hashed password
  const hashedPassword = await hashPassword(password)

  await prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      password: hashedPassword,
    },
  })

  // Sign in the newly created user
  await signIn('credentials', {
    email,
    password,
    redirectTo: '/dashboard',
  })
}

export async function saveUserSettings(timezone: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { timezone },
  })

  return { success: true }
}
