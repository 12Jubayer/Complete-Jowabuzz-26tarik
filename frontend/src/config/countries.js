export const countries = [
  {
    id: 'bd',
    name: 'Bangladesh',
    flag: '/images/flags/bangladesh.svg',
    active: true,
    currency: 'BDT',
    locale: 'en-BD',
  },
  {
    id: 'in',
    name: 'India',
    flag: '/images/flags/india.svg',
    active: false,
    currency: 'INR',
    locale: 'en-IN',
  },
  {
    id: 'pk',
    name: 'Pakistan',
    flag: '/images/flags/pakistan.svg',
    active: false,
    currency: 'PKR',
    locale: 'en-PK',
  },
  {
    id: 'np',
    name: 'Nepal',
    flag: '/images/flags/nepal.svg',
    active: false,
    currency: 'NPR',
    locale: 'en-NP',
  },
];

export const defaultCountry = countries.find((country) => country.id === 'bd') || countries[0];

export function getCountryById(id) {
  return countries.find((country) => country.id === id) || defaultCountry;
}
