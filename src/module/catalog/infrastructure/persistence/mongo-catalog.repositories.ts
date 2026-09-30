import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { type Model } from 'mongoose';
import type { Category, Product, ProductStatus } from '../../domain/catalog.js';
import type {
  CategoryPodium,
  CategoryRepository,
  ProductRepository,
} from '../../domain/catalog.repository.js';
import {
  CategoryDocumentModel,
  type CategoryDocument,
  ProductDocumentModel,
} from './catalog.schemas.js';

/** Orden del ranking en MongoDB: el mismo que compareRanking en el dominio */
const RANKING_SORT = { totalCents: -1, totalReachedAt: 1, _id: 1 } as const;

@Injectable()
export class MongoCategoryRepository implements CategoryRepository {
  constructor(
    @InjectModel(CategoryDocumentModel.name)
    private readonly categories: Model<CategoryDocumentModel>,
  ) {}

  async findActive(): Promise<Category[]> {
    const docs = await this.categories
      .find({ active: true })
      .sort({ position: 1, _id: 1 })
      .exec();
    return docs.map(toCategory);
  }

  async findActiveBySlug(slug: string): Promise<Category | null> {
    const doc = await this.categories.findOne({ slug, active: true }).exec();
    return doc ? toCategory(doc) : null;
  }
}

/** Documento "plano" que devuelven las agregaciones (sin métodos de Mongoose) */
interface RawProduct {
  _id: mongoose.Types.ObjectId;
  slug: string;
  name: string;
  company: string;
  categoryId: mongoose.Types.ObjectId;
  imageUrl: string | null;
  status: ProductStatus;
  totalCents: number;
  totalReachedAt: Date;
}

@Injectable()
export class MongoProductRepository implements ProductRepository {
  constructor(
    @InjectModel(ProductDocumentModel.name)
    private readonly products: Model<ProductDocumentModel>,
  ) {}

  async findRankedByCategory(categoryId: string): Promise<Product[]> {
    const docs = await this.products
      .find({
        categoryId: new mongoose.Types.ObjectId(categoryId),
        status: 'APPROVED',
      })
      .sort(RANKING_SORT)
      .lean<RawProduct[]>()
      .exec();
    return docs.map(toProduct);
  }

  async findPodiums(): Promise<CategoryPodium[]> {
    /*
     * Una sola consulta para todas las categorías:
     * 1. solo productos aprobados,
     * 2. ordenados por el ranking,
     * 3. agrupados por categoría quedándose con los 2 primeros ($firstN
     *    respeta el orden del paso 2): líder y segundo.
     */
    const groups = await this.products
      .aggregate<{ _id: mongoose.Types.ObjectId; top: RawProduct[] }>([
        { $match: { status: 'APPROVED' } },
        { $sort: RANKING_SORT },
        {
          $group: {
            _id: '$categoryId',
            top: { $firstN: { n: 2, input: '$$ROOT' } },
          },
        },
      ])
      .exec();

    return groups.flatMap((group) => {
      const [leader, runnerUp] = group.top;
      if (!leader) return [];
      return [
        {
          categoryId: group._id.toString(),
          leader: toProduct(leader),
          runnerUp: runnerUp ? toProduct(runnerUp) : null,
        },
      ];
    });
  }
}

function toCategory(doc: CategoryDocument): Category {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    crownTitle: doc.crownTitle,
    position: doc.position,
    active: doc.active,
  };
}

function toProduct(doc: RawProduct): Product {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    company: doc.company,
    categoryId: doc.categoryId.toString(),
    imageUrl: doc.imageUrl,
    status: doc.status,
    totalCents: doc.totalCents,
    totalReachedAt: doc.totalReachedAt,
  };
}
