/*
 * Entidades del catálogo: categorías y productos. Son datos simples (sin
 * comportamiento propio), así que se modelan como interfaces de solo lectura.
 * Las reglas del ranking viven en ranking.ts.
 */

export interface Category {
  id: string;
  /** Para la URL: /categoria/cervezas */
  slug: string;
  /** Nombre corto para la navegación: "Cervezas" */
  name: string;
  /** Título de la corona de su #1: "La mejor cerveza" */
  crownTitle: string;
  /** Orden en los chips de navegación (menor = primero) */
  position: number;
  /** Una categoría desactivada no se muestra en ninguna parte */
  active: boolean;
}

/**
 * Estado de un producto. Los fans los proponen (PENDING) y el admin decide.
 * Solo los APPROVED aparecen en el ranking.
 */
export type ProductStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Solo una etiqueta: se rankean productos, no empresas */
  company: string;
  categoryId: string;
  imageUrl: string | null;
  status: ProductStatus;
  /** Suma de donaciones confirmadas, en céntimos */
  totalCents: number;
  /**
   * Cuándo llegó a su total actual. Desempata: con el mismo total queda
   * arriba el que llegó primero (el que quiere la cima tiene que SUPERARLO).
   */
  totalReachedAt: Date;
}
