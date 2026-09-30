import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { type HydratedDocument } from 'mongoose';
import type { ProductStatus } from '../../domain/catalog.js';

/*
 * Forma de categorías y productos en MongoDB. Solo la infraestructura los
 * conoce; el resto del código usa las interfaces de domain/catalog.ts.
 */

@Schema({ collection: 'categories', timestamps: true })
export class CategoryDocumentModel {
  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  crownTitle: string;

  @Prop({ type: Number, required: true, default: 0 })
  position: number;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;
}

export type CategoryDocument = HydratedDocument<CategoryDocumentModel>;
export const CategorySchema = SchemaFactory.createForClass(
  CategoryDocumentModel,
);

@Schema({ collection: 'products', timestamps: true })
export class ProductDocumentModel {
  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  company: string;

  @Prop({ type: mongoose.Types.ObjectId, required: true })
  categoryId: mongoose.Types.ObjectId;

  @Prop({ type: String, default: null })
  imageUrl: string | null;

  @Prop({
    type: String,
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  })
  status: ProductStatus;

  // Entero en céntimos. Lo actualizan las donaciones confirmadas con $inc
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  totalCents: number;

  @Prop({ type: Date, required: true, default: () => new Date() })
  totalReachedAt: Date;
}

export type ProductDocument = HydratedDocument<ProductDocumentModel>;
export const ProductSchema = SchemaFactory.createForClass(ProductDocumentModel);

/*
 * Índice compuesto en el MISMO orden en que se consulta el ranking
 * (categoría + estado, luego total y fecha). Con él MongoDB lee los productos
 * ya ordenados, sin ordenar en memoria aunque haya miles.
 */
ProductSchema.index({
  categoryId: 1,
  status: 1,
  totalCents: -1,
  totalReachedAt: 1,
});
