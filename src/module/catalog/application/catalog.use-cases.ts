import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  PRODUCT_REPOSITORY,
} from '../../../common/constants/injection-tokens.js';
import type { Category, Product } from '../domain/catalog.js';
import type {
  CategoryRepository,
  ProductRepository,
} from '../domain/catalog.repository.js';
import {
  buildContenders,
  compareRanking,
  type RankedContender,
} from '../domain/ranking.js';

/*
 * Casos de uso de LECTURA del catálogo. Son tres consultas pequeñas y
 * relacionadas, por eso viven juntas en un archivo; los casos de uso que
 * MODIFICAN datos (donar, aprobar productos) tendrán cada uno el suyo.
 */

/** El #1 de una categoría y su perseguidor más cercano */
export interface CimaView {
  category: Category;
  leader: Product;
  runnerUp: Product | null;
}

export interface CategoryRankingView {
  category: Category;
  /** null si la categoría todavía no tiene productos aprobados */
  leader: Product | null;
  runnerUp: Product | null;
  contenders: RankedContender[];
}

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  execute(): Promise<Category[]> {
    return this.categories.findActive();
  }
}

/**
 * "Las cimas": el #1 de cada categoría activa, del que más dinero junta al
 * que menos (con el mismo desempate que el ranking de cada categoría).
 */
@Injectable()
export class GetCimasUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(): Promise<CimaView[]> {
    const [categories, podiums] = await Promise.all([
      this.categories.findActive(),
      this.products.findPodiums(),
    ]);
    const categoriesById = new Map(categories.map((c) => [c.id, c]));

    return (
      podiums
        // Las categorías desactivadas no aparecen aunque tengan productos
        .flatMap((podium) => {
          const category = categoriesById.get(podium.categoryId);
          return category
            ? [{ category, leader: podium.leader, runnerUp: podium.runnerUp }]
            : [];
        })
        .sort((a, b) => compareRanking(a.leader, b.leader))
    );
  }
}

/** Ranking completo de una categoría, o null si no existe o está inactiva */
@Injectable()
export class GetCategoryRankingUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(slug: string): Promise<CategoryRankingView | null> {
    const category = await this.categories.findActiveBySlug(slug);
    if (!category) return null;

    const ranked = await this.products.findRankedByCategory(category.id);
    return {
      category,
      leader: ranked[0] ?? null,
      runnerUp: ranked[1] ?? null,
      contenders: buildContenders(ranked),
    };
  }
}
