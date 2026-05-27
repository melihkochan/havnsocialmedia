export function containsNsfw(text: string): boolean {
  if (!text) return false

  // NSFW/Explicit words in Turkish and English
  const nsfwWords = new Set([
    'porn', 'porno', 'sex', 'seks', 'sik', 'sikiş', 'sikis', 'amcık', 'amcik', 'yarrak', 'yarak',
    'nude', 'göt', 'got', 'vajina', 'penis', 'erotik', 'escort', 'eskort', 'nsfw', 'sokmak',
    'taşşak', 'tassak', 'orospu', 'pezevenk', 'gavat', 'godoş', 'godos', 'ibne', 'fahişe', 'fahise',
    'kaltak', 'şırfıntı', 'sirfinti', 'sluts', 'slut', 'boobs', 'vagina', 'asshole', 'pussy', 'orgasm',
    'orgazm', 'masturbasyon', 'mastürbasyon', 'cinsel', 'amk', 'aq', 'sikem', 'sikeyim', 'götveren',
    'gotveren', 'göte', 'gote'
  ])

  // Normalize Turkish characters to English equivalents for better comparison
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s]/gi, ' ') // replace punctuation with spaces
  }

  const normalizedText = normalize(text)
  const words = normalizedText.split(/\s+/)

  for (const word of words) {
    if (nsfwWords.has(word)) {
      return true
    }
  }

  // Also check for composite keywords or exact substring matches (like "porno izle")
  const substrings = [
    'porno', 'sikiş', 'sikis', 'anal sex', 'oral sex', 'sex izle', 'seks izle', 
    'pornografi', 'nude paylas', 'nude at', 'amcik', 'amcık', 'yarrak', 'yarak'
  ]
  for (const sub of substrings) {
    if (normalizedText.includes(sub)) {
      return true
    }
  }

  return false
}
