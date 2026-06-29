/**
 * Utilitaires de (dé)sérialisation pour les champs JSON stockés en TEXT (SQLite).
 */

/** Parse une chaîne JSON en toute sécurité, avec valeur de repli. */
export function parseJson<T = any>(value: string | null | undefined, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Sérialise une valeur en JSON. Accepte déjà une chaîne. */
export function toJson(value: any): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value ?? null);
}

/**
 * Désérialise les champs JSON d'une entité (TEXT -> objet) pour les réponses API.
 * @param entity   l'entité Prisma
 * @param jsonKeys liste des clés à parser
 */
export function hydrate<T extends Record<string, any>>(
  entity: T,
  jsonKeys: (keyof T)[],
): T {
  if (!entity) return entity;
  const clone: any = { ...entity };
  for (const key of jsonKeys) {
    clone[key] = parseJson(entity[key] as any, undefined);
  }
  return clone;
}
