import { paths } from './paths'

export const PLEXON_FEDERATION_CONTRACT_VERSION = paths.plexonFederationContractVersion
export const PLEXON_CONTRACT_VERSION_HEADER = 'X-Plexon-Contract-Version'
export const PLEXON_SERVICE_SECRET_HEADER = 'X-Service-Secret'

export function getPlexonContractHeaders(secret?: string): HeadersInit {
  return {
    [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
    ...(secret ? { [PLEXON_SERVICE_SECRET_HEADER]: secret } : {}),
  }
}

export function isProvisioningAuthorized(request: Request, expectedSecret: string): boolean {
  const requestSecret = request.headers.get(PLEXON_SERVICE_SECRET_HEADER)?.trim()
  const contractVersion = request.headers.get(PLEXON_CONTRACT_VERSION_HEADER)?.trim()
  return Boolean(
    expectedSecret &&
      requestSecret &&
      requestSecret === expectedSecret &&
      contractVersion === PLEXON_FEDERATION_CONTRACT_VERSION,
  )
}
