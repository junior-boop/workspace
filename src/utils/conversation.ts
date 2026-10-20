export const ID_ANNONCES = 'annonces'
export const ID_GROUPE = 'groupe'

export function idConversationPrivee(idA: string, idB: string) {
  return [idA, idB].sort().join('_')
}
