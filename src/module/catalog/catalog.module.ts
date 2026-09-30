import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CATEGORY_REPOSITORY,
  PRODUCT_REPOSITORY,
} from '../../common/constants/injection-tokens.js';
import {
  GetCategoryRankingUseCase,
  GetCimasUseCase,
  ListCategoriesUseCase,
} from './application/catalog.use-cases.js';
import {
  CategoryDocumentModel,
  CategorySchema,
  ProductDocumentModel,
  ProductSchema,
} from './infrastructure/persistence/catalog.schemas.js';
import {
  MongoCategoryRepository,
  MongoProductRepository,
} from './infrastructure/persistence/mongo-catalog.repositories.js';
import { CatalogResolver } from './presentation/catalog.resolver.js';

/**
 * Catálogo y ranking: categorías, productos y quién está en la cima.
 * Exporta el repositorio de productos para que las donaciones (siguiente
 * módulo) puedan sumar a los totales.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CategoryDocumentModel.name, schema: CategorySchema },
      { name: ProductDocumentModel.name, schema: ProductSchema },
    ]),
  ],
  providers: [
    { provide: CATEGORY_REPOSITORY, useClass: MongoCategoryRepository },
    { provide: PRODUCT_REPOSITORY, useClass: MongoProductRepository },
    ListCategoriesUseCase,
    GetCimasUseCase,
    GetCategoryRankingUseCase,
    CatalogResolver,
  ],
  exports: [PRODUCT_REPOSITORY],
})
export class CatalogModule {}
