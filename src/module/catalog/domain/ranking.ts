import type { Product } from './catalog.js';

/*
 * Reglas del ranking, como funciones puras (sin base de datos): se pueden
 * probar solas y el orden es siempre el mismo, lo pida quien lo pida.
 */

/**
 * Orden del ranking: más dinero primero; con el mismo total, el que llegó
 * antes a ese monto; y como último desempate el id, para que el orden sea
 * idéntico en cada consulta (nunca "bailan" dos productos empatados).
 */
export function compareRanking(a: Product, b: Product): number {
  return (
    b.totalCents - a.totalCents ||
    a.totalReachedAt.getTime() - b.totalReachedAt.getTime() ||
    a.id.localeCompare(b.id)
  );
}

/**
 * Cuánto le falta a un producto para QUITARLE la cima al líder: la
 * diferencia más S/ 1 (100 céntimos), porque igualarlo no alcanza.
 */
export function missingToLead(
  leaderTotalCents: number,
  totalCents: number,
): number {
  return Math.max(leaderTotalCents - totalCents, 0) + 100;
}

export interface RankedContender {
  position: number;
  product: Product;
  missingCents: number;
}

/**
 * Dado el ranking ya ordenado de una categoría, arma "la cola para la cima":
 * todos menos el líder, con su puesto y lo que les falta.
 */
export function buildContenders(sorted: Product[]): RankedContender[] {
  const [leader, ...rest] = sorted;
  if (!leader) return [];
  return rest.map((product, index) => ({
    position: index + 2,
    product,
    missingCents: missingToLead(leader.totalCents, product.totalCents),
  }));
}
