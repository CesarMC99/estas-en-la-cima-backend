import type { Category, Product } from './catalog.js';

/** Puerto de lectura de categorías */
export interface CategoryRepository {
  /** Categorías activas, en el orden de la navegación */
  findActive(): Promise<Category[]>;
  findActiveBySlug(slug: string): Promise<Category | null>;
}

/** El primero y el segundo de una categoría (lo que necesita "Las cimas") */
export interface CategoryPodium {
  categoryId: string;
  leader: Product;
  runnerUp: Product | null;
}

/** Puerto de lectura de productos para el ranking */
export interface ProductRepository {
  /**
   * Productos APROBADOS de una categoría, ya ordenados por el ranking
   * (ver compareRanking). La base ordena: es más rápido que traer todo y
   * ordenar en memoria.
   */
  findRankedByCategory(categoryId: string): Promise<Product[]>;
  /** Líder y segundo de CADA categoría, en una sola consulta */
  findPodiums(): Promise<CategoryPodium[]>;
}
