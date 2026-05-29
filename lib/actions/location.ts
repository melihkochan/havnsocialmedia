'use server'

import { Country, City } from 'country-state-city'
import { TURKISH_COUNTRY_NAMES } from '../country-translations'

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
  const cities = City.getCitiesOfCountry(countryCode) || []
  const uniqueNames = Array.from(new Set(cities.map(c => c.name)))
  return uniqueNames.sort((a, b) => a.localeCompare(b, 'tr'))
}
