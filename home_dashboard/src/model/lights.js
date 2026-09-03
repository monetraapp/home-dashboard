// Inventarul luminilor din pagina „Iluminat".
//
// Lista e deschisa: pagina isi genereaza selectorul din ea, deci o lumina noua
// inseamna o intrare aici plus sloturile ei, fara nicio atingere in interfata.
//
// Fiecare intrare leaga lampa de masuratorile ei electrice. Sloturile de
// tensiune si curent corespund unor entitati pe care integrarea Shelly le creeaza
// DEZACTIVATE; ele au fost activate manual in Home Assistant.
export const LIGHTS = [
  {
    id: 'led-birou-up',
    nume: 'LED Birou Up',
    slot: 'light.birou_up',
    power: 'power.birou_up',
    energy: 'energy.birou_up',
    voltage: 'volt.birou_up',
    current: 'curent.birou_up',
    istoric: true
  },
  {
    id: 'led-birou-down',
    nume: 'LED Birou Down',
    slot: 'light.birou_down',
    power: 'power.birou_down',
    energy: 'energy.birou_down',
    voltage: 'volt.birou_down',
    current: 'curent.birou_down',
    istoric: true
  }
];

export const LIGHT_BY_ID = LIGHTS.reduce(function (acc, l) { acc[l.id] = l; return acc; }, {});
