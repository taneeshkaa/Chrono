import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ExtensionHandshakeClient from './ExtensionHandshakeClient'

export default async function ExtensionAuthPage() {
  const session = await auth()

  if (!session?.user?.id || !session?.user?.email) {
    redirect('/login?callbackUrl=/auth/extension')
  }

  return <ExtensionHandshakeClient email={session.user.email} />
}
