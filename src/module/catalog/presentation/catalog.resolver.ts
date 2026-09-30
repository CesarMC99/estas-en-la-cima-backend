import { Args, Query, Resolver } from '@nestjs/graphql';
import type { Category, Product } from '../domain/catalog.js';
import {
  GetCategoryRankingUseCase,
  GetCimasUseCase,
  ListCategoriesUseCase,
} from '../application/catalog.use-cases.js';
import {
  CategoryRankingType,
  CategoryType,
  CimaType,
  ProductType,
} from './catalog.types.js';

/**
 * Consultas PÚBLICAS del ranking: no piden sesión, cualquiera puede ver quién
 * está en la cima. Solo traducen el resultado de los casos de uso a los
 * tipos GraphQL.
 */
@Resolver()
export class CatalogResolver {
  constructor(
    private readonly listCategories: ListCategoriesUseCase,
    private readonly getCimas: GetCimasUseCase,
    private readonly getCategoryRanking: GetCategoryRankingUseCase,
  ) {}

  @Query(() => [CategoryType], {
    description: 'Categorías activas, en orden de navegación',
  })
  async categories(): Promise<CategoryType[]> {
    return (await this.listCategories.execute()).map(toCategoryType);
  }

  @Query(() => [CimaType], {
    description: 'El #1 de cada categoría, del que más junta al que menos',
  })
  async cimas(): Promise<CimaType[]> {
    const cimas = await this.getCimas.execute();
    return cimas.map(({ category, leader, runnerUp }) =>
      toCimaType(category, leader, runnerUp),
    );
  }

  @Query(() => CategoryRankingType, {
    nullable: true,
    description: 'Ranking de una categoría; null si no existe',
  })
  async categoryRanking(
    @Args('slug') slug: string,
  ): Promise<CategoryRankingType | null> {
    const ranking = await this.getCategoryRanking.execute(slug);
    if (!ranking) return null;

    return {
      category: toCategoryType(ranking.category),
      leader: ranking.leader
        ? toCimaType(ranking.category, ranking.leader, ranking.runnerUp)
        : null,
      contenders: ranking.contenders.map(
        ({ position, product, missingCents }) => ({
          position,
          product: toProductType(product),
          totalCents: product.totalCents,
          missingCents,
        }),
      ),
    };
  }
}

function toCategoryType(category: Category): CategoryType {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    crownTitle: category.crownTitle,
  };
}

/** Solo los datos públicos: el estado interno y las fechas no salen a la API */
function toProductType(product: Product): ProductType {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    company: product.company,
    imageUrl: product.imageUrl,
  };
}

function toCimaType(
  category: Category,
  leader: Product,
  runnerUp: Product | null,
): CimaType {
  return {
    category: toCategoryType(category),
    product: toProductType(leader),
    totalCents: leader.totalCents,
    rival: runnerUp
      ? {
          name: runnerUp.name,
          gapCents: leader.totalCents - runnerUp.totalCents,
        }
      : null,
    // Los comentarios de los mayores donantes llegan con su propio módulo
    comments: [],
  };
}
