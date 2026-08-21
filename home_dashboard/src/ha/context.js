// Contextul HA, separat de componenta HaProvider.
//
// Motivul separarii: React Fast Refresh cere ca un modul de componenta sa
// exporte doar componente. Cand contextul si hook-ul stateau in HaProvider.jsx,
// fiecare editare invalida modulul si consumatorii ramaneau cu un context null
// ("useHa() folosit in afara <HaProvider>") pana la reincarcarea paginii.
import { createContext, useContext } from 'react';

export const HaContext = createContext(null);

export function useHa() {
  const ctx = useContext(HaContext);
  if (!ctx) throw new Error('useHa() folosit în afara <HaProvider>');
  return ctx;
}
