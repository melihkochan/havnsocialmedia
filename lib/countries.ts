import { TURKISH_COUNTRY_NAMES } from './country-translations'

export interface Country {
  code: string
  name: string
  flag: string
  cities: string[]
}

export const COUNTRIES: Country[] = [
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷', cities: ['İstanbul', 'Ankara', 'İzmir', 'Kocaeli', 'Bursa', 'Antalya', 'Adana', 'Trabzon', 'Eskişehir', 'Muğla'] },
  { code: 'AZ', name: 'Azerbaycan', flag: '🇦🇿', cities: ['Bakü', 'Gence', 'Sumgayıt', 'Şeki', 'Nahçıvan'] },
  { code: 'US', name: 'Amerika Birleşik Devletleri', flag: '🇺🇸', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Seattle', 'Boston'] },
  { code: 'DE', name: 'Almanya', flag: '🇩🇪', cities: ['Berlin', 'Münih', 'Hamburg', 'Frankfurt', 'Köln', 'Stuttgart', 'Düsseldorf'] },
  { code: 'GB', name: 'Birleşik Krallık', flag: '🇬🇧', cities: ['Londra', 'Manchester', 'Birmingham', 'Edinburgh', 'Liverpool', 'Bristol'] },
  { code: 'NL', name: 'Hollanda', flag: '🇳🇱', cities: ['Amsterdam', 'Rotterdam', 'Lahey', 'Utrecht', 'Eindhoven'] }
]

export function getCountryFlag(code: string | null) {
  if (!code) return ''
  const country = COUNTRIES.find(c => c.code.toUpperCase() === code.toUpperCase())
  return country ? country.flag : '🏳️'
}

export function getCountryName(code: string | null) {
  if (!code) return ''
  return TURKISH_COUNTRY_NAMES[code.toUpperCase()] || code
}

export function getCountryFlagUrl(code: string | null) {
  if (!code) return ''
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`
}

