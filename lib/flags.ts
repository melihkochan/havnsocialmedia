/** ISO 3166-1 alpha-2 → bayrak görseli (Windows Unicode bayrak desteklemez) */

export type FlagItem = { iso: string; emoji: string; name: string }

export const FLAGS: FlagItem[] = [
  { iso: 'tr', emoji: '🇹🇷', name: 'Türkiye' },
  { iso: 'az', emoji: '🇦🇿', name: 'Azerbaycan' },
  { iso: 'de', emoji: '🇩🇪', name: 'Almanya' },
  { iso: 'us', emoji: '🇺🇸', name: 'ABD' },
  { iso: 'gb', emoji: '🇬🇧', name: 'İngiltere' },
  { iso: 'fr', emoji: '🇫🇷', name: 'Fransa' },
  { iso: 'it', emoji: '🇮🇹', name: 'İtalya' },
  { iso: 'es', emoji: '🇪🇸', name: 'İspanya' },
  { iso: 'nl', emoji: '🇳🇱', name: 'Hollanda' },
  { iso: 'be', emoji: '🇧🇪', name: 'Belçika' },
  { iso: 'at', emoji: '🇦🇹', name: 'Avusturya' },
  { iso: 'ch', emoji: '🇨🇭', name: 'İsviçre' },
  { iso: 'pl', emoji: '🇵🇱', name: 'Polonya' },
  { iso: 'ua', emoji: '🇺🇦', name: 'Ukrayna' },
  { iso: 'ru', emoji: '🇷🇺', name: 'Rusya' },
  { iso: 'gr', emoji: '🇬🇷', name: 'Yunanistan' },
  { iso: 'bg', emoji: '🇧🇬', name: 'Bulgaristan' },
  { iso: 'ro', emoji: '🇷🇴', name: 'Romanya' },
  { iso: 'sy', emoji: '🇸🇾', name: 'Suriye' },
  { iso: 'iq', emoji: '🇮🇶', name: 'Irak' },
  { iso: 'ir', emoji: '🇮🇷', name: 'İran' },
  { iso: 'sa', emoji: '🇸🇦', name: 'Suudi Arabistan' },
  { iso: 'ae', emoji: '🇦🇪', name: 'BAE' },
  { iso: 'eg', emoji: '🇪🇬', name: 'Mısır' },
  { iso: 'ma', emoji: '🇲🇦', name: 'Fas' },
  { iso: 'tn', emoji: '🇹🇳', name: 'Tunus' },
  { iso: 'dz', emoji: '🇩🇿', name: 'Cezayir' },
  { iso: 'ly', emoji: '🇱🇾', name: 'Libya' },
  { iso: 'pk', emoji: '🇵🇰', name: 'Pakistan' },
  { iso: 'in', emoji: '🇮🇳', name: 'Hindistan' },
  { iso: 'cn', emoji: '🇨🇳', name: 'Çin' },
  { iso: 'jp', emoji: '🇯🇵', name: 'Japonya' },
  { iso: 'kr', emoji: '🇰🇷', name: 'Kore' },
  { iso: 'br', emoji: '🇧🇷', name: 'Brezilya' },
  { iso: 'ar', emoji: '🇦🇷', name: 'Arjantin' },
  { iso: 'mx', emoji: '🇲🇽', name: 'Meksika' },
  { iso: 'ca', emoji: '🇨🇦', name: 'Kanada' },
  { iso: 'au', emoji: '🇦🇺', name: 'Avustralya' },
  { iso: 'nz', emoji: '🇳🇿', name: 'Yeni Zelanda' },
  { iso: 'za', emoji: '🇿🇦', name: 'G. Afrika' },
  { iso: 'ng', emoji: '🇳🇬', name: 'Nijerya' },
  { iso: 'se', emoji: '🇸🇪', name: 'İsveç' },
  { iso: 'no', emoji: '🇳🇴', name: 'Norveç' },
  { iso: 'dk', emoji: '🇩🇰', name: 'Danimarka' },
  { iso: 'fi', emoji: '🇫🇮', name: 'Finlandiya' },
  { iso: 'ie', emoji: '🇮🇪', name: 'İrlanda' },
  { iso: 'pt', emoji: '🇵🇹', name: 'Portekiz' },
  { iso: 'cz', emoji: '🇨🇿', name: 'Çekya' },
  { iso: 'hu', emoji: '🇭🇺', name: 'Macaristan' },
  { iso: 'hr', emoji: '🇭🇷', name: 'Hırvatistan' },
  { iso: 'rs', emoji: '🇷🇸', name: 'Sırbistan' },
  { iso: 'ba', emoji: '🇧🇦', name: 'Bosna' },
  { iso: 'al', emoji: '🇦🇱', name: 'Arnavutluk' },
  { iso: 'xk', emoji: '🇽🇰', name: 'Kosova' },
  { iso: 'lb', emoji: '🇱🇧', name: 'Lübnan' },
  { iso: 'jo', emoji: '🇯🇴', name: 'Ürdün' },
  { iso: 'il', emoji: '🇮🇱', name: 'İsrail' },
  { iso: 'ps', emoji: '🇵🇸', name: 'Filistin' },
  { iso: 'am', emoji: '🇦🇲', name: 'Ermenistan' },
  { iso: 'ge', emoji: '🇬🇪', name: 'Gürcistan' },
  { iso: 'kz', emoji: '🇰🇿', name: 'Kazakistan' },
  { iso: 'uz', emoji: '🇺🇿', name: 'Özbekistan' },
  { iso: 'tm', emoji: '🇹🇲', name: 'Türkmenistan' },
  { iso: 'kg', emoji: '🇰🇬', name: 'Kırgızistan' },
  { iso: 'tj', emoji: '🇹🇯', name: 'Tacikistan' },
  { iso: 'af', emoji: '🇦🇫', name: 'Afganistan' },
  { iso: 'bd', emoji: '🇧🇩', name: 'Bangladeş' },
  { iso: 'th', emoji: '🇹🇭', name: 'Tayland' },
  { iso: 'vn', emoji: '🇻🇳', name: 'Vietnam' },
  { iso: 'id', emoji: '🇮🇩', name: 'Endonezya' },
  { iso: 'my', emoji: '🇲🇾', name: 'Malezya' },
  { iso: 'sg', emoji: '🇸🇬', name: 'Singapur' },
  { iso: 'ph', emoji: '🇵🇭', name: 'Filipinler' },
  { iso: 'tw', emoji: '🇹🇼', name: 'Tayvan' },
  { iso: 'hk', emoji: '🇭🇰', name: 'Hong Kong' },
  { iso: 'et', emoji: '🇪🇹', name: 'Etiyopya' },
  { iso: 'gh', emoji: '🇬🇭', name: 'Gana' },
  { iso: 'sn', emoji: '🇸🇳', name: 'Senegal' },
  { iso: 'pe', emoji: '🇵🇪', name: 'Peru' },
  { iso: 'cl', emoji: '🇨🇱', name: 'Şili' },
  { iso: 'co', emoji: '🇨🇴', name: 'Kolombiya' },
  { iso: 've', emoji: '🇻🇪', name: 'Venezuela' },
  { iso: 'ec', emoji: '🇪🇨', name: 'Ekvador' },
  { iso: 'cu', emoji: '🇨🇺', name: 'Küba' },
  { iso: 'pr', emoji: '🇵🇷', name: 'Porto Riko' },
  { iso: 'do', emoji: '🇩🇴', name: 'Dominik' },
  { iso: 'pa', emoji: '🇵🇦', name: 'Panama' },
  { iso: 'cr', emoji: '🇨🇷', name: 'Kosta Rika' },
  { iso: 'gt', emoji: '🇬🇹', name: 'Guatemala' },
  { iso: 'is', emoji: '🇮🇸', name: 'İzlanda' },
  { iso: 'ee', emoji: '🇪🇪', name: 'Estonya' },
  { iso: 'lv', emoji: '🇱🇻', name: 'Letonya' },
  { iso: 'lt', emoji: '🇱🇹', name: 'Litvanya' },
  { iso: 'by', emoji: '🇧🇾', name: 'Belarus' },
  { iso: 'md', emoji: '🇲🇩', name: 'Moldova' },
  { iso: 'uy', emoji: '🇺🇾', name: 'Uruguay' },
  { iso: 'py', emoji: '🇵🇾', name: 'Paraguay' },
  { iso: 'bo', emoji: '🇧🇴', name: 'Bolivya' },
  { iso: 'mm', emoji: '🇲🇲', name: 'Myanmar' },
  { iso: 'kh', emoji: '🇰🇭', name: 'Kamboçya' },
  { iso: 'la', emoji: '🇱🇦', name: 'Laos' },
  { iso: 'mn', emoji: '🇲🇳', name: 'Moğolistan' },
  { iso: 'np', emoji: '🇳🇵', name: 'Nepal' },
  { iso: 'lk', emoji: '🇱🇰', name: 'Sri Lanka' },
  { iso: 'cy', emoji: '🇨🇾', name: 'Kıbrıs' },
  { iso: 'mt', emoji: '🇲🇹', name: 'Malta' },
  { iso: 'lu', emoji: '🇱🇺', name: 'Lüksemburg' },
  { iso: 'mk', emoji: '🇲🇰', name: 'Kuzey Makedonya' },
  { iso: 'me', emoji: '🇲🇪', name: 'Karadağ' },
  { iso: 'si', emoji: '🇸🇮', name: 'Slovenya' },
  { iso: 'sk', emoji: '🇸🇰', name: 'Slovakya' },
  { iso: 'ad', emoji: '🇦🇩', name: 'Andorra' },
  { iso: 'mc', emoji: '🇲🇨', name: 'Monako' },
  { iso: 'va', emoji: '🇻🇦', name: 'Vatikan' },
  { iso: 'fo', emoji: '🇫🇴', name: 'Faroe' },
  { iso: 'gl', emoji: '🇬🇱', name: 'Grönland' },
  { iso: 'bn', emoji: '🇧🇳', name: 'Brunei' },
  { iso: 'fj', emoji: '🇫🇯', name: 'Fiji' },
  { iso: 'pg', emoji: '🇵🇬', name: 'Papua Y. G.' },
]

const FLAG_EMOJI_REGEX = /(?:\uD83C[\uDDE6-\uDDFF]){2}/g

export function getFlagImageUrl(iso: string, width = 40): string {
  return `https://flagcdn.com/w${width}/${iso.toLowerCase()}.png`
}

export function flagEmojiToIso(emoji: string): string | null {
  const cps = [...emoji].map(c => c.codePointAt(0)!)
  if (cps.length !== 2) return null
  if (cps[0]! < 0x1f1e6 || cps[0]! > 0x1f1ff || cps[1]! < 0x1f1e6 || cps[1]! > 0x1f1ff) return null
  const a = String.fromCharCode(cps[0]! - 0x1f1e6 + 65)
  const b = String.fromCharCode(cps[1]! - 0x1f1e6 + 65)
  return (a + b).toLowerCase()
}

export type MessagePart =
  | { type: 'text'; value: string }
  | { type: 'flag'; iso: string; emoji: string }

export function splitMessageParts(text: string): MessagePart[] {
  if (!text) return [{ type: 'text', value: '' }]

  const parts: MessagePart[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const re = new RegExp(FLAG_EMOJI_REGEX.source, 'g')
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    const emoji = match[0]
    const iso = flagEmojiToIso(emoji)
    if (iso) {
      parts.push({ type: 'flag', iso, emoji })
    } else {
      parts.push({ type: 'text', value: emoji })
    }
    lastIndex = match.index + emoji.length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text }]
}
