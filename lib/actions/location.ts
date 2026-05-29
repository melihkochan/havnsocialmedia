'use server'

import { Country, State, City } from 'country-state-city'
import { TURKISH_COUNTRY_NAMES } from '../country-translations'

const TURKISH_PROVINCES: Record<string, string> = {
  'Adana': 'Adana', 'Adiyaman': 'Adıyaman', 'Afyonkarahisar': 'Afyonkarahisar', 'Agri': 'Ağrı',
  'Amasya': 'Amasya', 'Ankara': 'Ankara', 'Antalya': 'Antalya', 'Artvin': 'Artvin',
  'Aydin': 'Aydın', 'Balikesir': 'Balıkesir', 'Bilecik': 'Bilecik', 'Bingol': 'Bingöl',
  'Bitlis': 'Bitlis', 'Bolu': 'Bolu', 'Burdur': 'Burdur', 'Bursa': 'Bursa',
  'Canakkale': 'Çanakkale', 'Cankiri': 'Çankırı', 'Corum': 'Çorum', 'Denizli': 'Denizli',
  'Diyarbakir': 'Diyarbakır', 'Edirne': 'Edirne', 'Elazig': 'Elazığ', 'Erzincan': 'Erzincan',
  'Erzurum': 'Erzurum', 'Eskisehir': 'Eskişehir', 'Gaziantep': 'Gaziantep', 'Giresun': 'Giresun',
  'Gumushane': 'Gümüşhane', 'Hakkari': 'Hakkari', 'Hatay': 'Hatay', 'Isparta': 'Isparta',
  'Mersin': 'Mersin', 'Istanbul': 'İstanbul', 'Izmir': 'İzmir', 'Kars': 'Kars',
  'Kastamonu': 'Kastamonu', 'Kayseri': 'Kayseri', 'Kirklareli': 'Kırklareli', 'Kirsehir': 'Kırşehir',
  'Kocaeli': 'Kocaeli', 'Konya': 'Konya', 'Kutahya': 'Kütahya', 'Malatya': 'Malatya',
  'Manisa': 'Manisa', 'Kahramanmaras': 'Kahramanmaraş', 'Mardin': 'Mardin', 'Mugla': 'Muğla',
  'Mus': 'Muş', 'Nevsehir': 'Nevşehir', 'Nigde': 'Niğde', 'Ordu': 'Ordu',
  'Rize': 'Rize', 'Sakarya': 'Sakarya', 'Samsun': 'Samsun', 'Siirt': 'Siirt',
  'Sinop': 'Sinop', 'Sivas': 'Sivas', 'Tekirdag': 'Tekirdağ', 'Tokat': 'Tokat',
  'Trabzon': 'Trabzon', 'Tunceli': 'Tunceli', 'Sanliurfa': 'Şanlıurfa', 'Usak': 'Uşak',
  'Van': 'Van', 'Yozgat': 'Yozgat', 'Zonguldak': 'Zonguldak', 'Aksaray': 'Aksaray',
  'Bayburt': 'Bayburt', 'Karaman': 'Karaman', 'Kirikkale': 'Kırıkkale', 'Batman': 'Batman',
  'Sirnak': 'Şırnak', 'Bartin': 'Bartın', 'Ardahan': 'Ardahan', 'Igdir': 'Iğdır',
  'Yalova': 'Yalova', 'Karabuk': 'Karabük', 'Kilis': 'Kilis', 'Osmaniye': 'Osmaniye',
  'Duzce': 'Düzce'
}

export async function getCountriesAction() {
  const countries = Country.getAllCountries()
  return countries.map(c => {
    const code = c.isoCode
    const name = TURKISH_COUNTRY_NAMES[code] || c.name
    return {
      code,
      name,
      flag: `https://flagcdn.com/w40/${code.toLowerCase()}.png`
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

export async function getCitiesAction(countryCode: string) {
  if (!countryCode) return []
  
  // If Turkey, immediately return the 81 actual provinces to avoid listing lower-level districts (ilçeler)
  if (countryCode === 'TR') {
    return Object.values(TURKISH_PROVINCES).sort((a, b) => a.localeCompare(b, 'tr'))
  }
  
  // Fetch states (provinces) of the country
  const states = State.getStatesOfCountry(countryCode) || []
  if (states.length > 0) {
    const names = states.map(s => {
      return s.name.replace(/\sProvince$/i, '').replace(/\sDistrict$/i, '').replace(/\sRegion$/i, '')
    })
    const uniqueNames = Array.from(new Set(names))
    return uniqueNames.sort((a, b) => a.localeCompare(b, 'tr'))
  }

  // Fallback to cities if states are empty
  const cities = City.getCitiesOfCountry(countryCode) || []
  const uniqueNames = Array.from(new Set(cities.map(c => c.name)))
  return uniqueNames.sort((a, b) => a.localeCompare(b, 'tr'))
}
