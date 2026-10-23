/* Principati that have a page on vtesitaly.com (src/data/cities.ts there):
 * only these get a link back. A city outside the list (an event in a town
 * with no principato yet) shows its name without one. */
export const PRINCIPATI = new Set([
  'barga',
  'bologna',
  'elba',
  'firenze',
  'genova',
  'massa',
  'milano',
  'modena',
  'parma',
  'pordenone',
  'prato',
  'roma',
  'torino',
  'trento',
  'treviso',
  'verona',
]);
