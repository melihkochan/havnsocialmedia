import { requireHQAccess } from '@/lib/actions/hq-auth'
import HQGateClient from './HQGateClient'

export const dynamic = 'force-dynamic'

export default async function HQGatePage() {
  // Ensure the user is a logged-in founder/admin.
  // We bypass the sudo check here (second parameter = true) because they are on the gate page
  // trying to unlock it. If they are a normal member, requireHQAccess redirects to 404.
  await requireHQAccess(true)

  return <HQGateClient />
}
