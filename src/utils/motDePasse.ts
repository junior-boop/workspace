function versHex(octets: ArrayBuffer | Uint8Array) {
  return Array.from(octets instanceof Uint8Array ? octets : new Uint8Array(octets))
    .map((octet) => octet.toString(16).padStart(2, '0'))
    .join('')
}

export async function hasherMotDePasse(motDePasse: string) {
  const sel = versHex(crypto.getRandomValues(new Uint8Array(16)))
  const empreinte = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sel + motDePasse))
  return `${sel}:${versHex(empreinte)}`
}

export async function verifierMotDePasse(motDePasse: string, hashStocke: string) {
  const [sel, empreinteAttendue] = hashStocke.split(':')
  const empreinte = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sel + motDePasse))
  return versHex(empreinte) === empreinteAttendue
}
