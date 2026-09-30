import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

/*
 * Tipos GraphQL del ranking. Los montos son enteros en CÉNTIMOS (Int de
 * GraphQL = hasta 2.147 millones de céntimos, unos S/ 21 millones por
 * producto: de sobra para este proyecto).
 */

@ObjectType('Category')
export class CategoryType {
  @Field(() => ID)
  id: string;

  @Field({ description: 'Para la URL: /categoria/cervezas' })
  slug: string;

  @Field({ description: 'Nombre corto: "Cervezas"' })
  name: string;

  @Field({ description: 'Título de la corona de su #1: "La mejor cerveza"' })
  crownTitle: string;
}

@ObjectType('Product')
export class ProductType {
  @Field(() => ID)
  id: string;

  @Field()
  slug: string;

  @Field()
  name: string;

  @Field({ description: 'Empresa dueña (solo informativa)' })
  company: string;

  @Field(() => String, { nullable: true })
  imageUrl: string | null;
}

@ObjectType('Rival')
export class RivalType {
  @Field({ description: 'Nombre del segundo de la categoría' })
  name: string;

  @Field(() => Int, { description: 'Distancia con el #1, en céntimos' })
  gapCents: number;
}

export enum DonorMediaKind {
  VIDEO = 'VIDEO',
  PHOTO = 'PHOTO',
}
registerEnumType(DonorMediaKind, { name: 'DonorMediaKind' });

@ObjectType('DonorMedia')
export class DonorMediaType {
  @Field(() => DonorMediaKind)
  kind: DonorMediaKind;

  @Field(() => String, { nullable: true })
  url: string | null;

  @Field(() => Int, { nullable: true })
  durationSeconds: number | null;
}

@ObjectType('DonorComment', {
  description:
    'Comentario de uno de los 3 mayores donantes (se completa en el módulo de comentarios)',
})
export class DonorCommentType {
  @Field(() => ID)
  id: string;

  @Field()
  username: string;

  @Field(() => Int, { description: '1 = mayor donante; 2 y 3 los siguientes' })
  rank: number;

  @Field(() => Int)
  amountCents: number;

  @Field()
  text: string;

  @Field(() => DonorMediaType, {
    nullable: true,
    description: 'Solo el mayor donante',
  })
  media: DonorMediaType | null;
}

@ObjectType('Cima', { description: 'El #1 de una categoría' })
export class CimaType {
  @Field(() => CategoryType)
  category: CategoryType;

  @Field(() => ProductType)
  product: ProductType;

  @Field(() => Int, { description: 'Total acumulado en céntimos' })
  totalCents: number;

  @Field(() => RivalType, {
    nullable: true,
    description: 'null si compite solo',
  })
  rival: RivalType | null;

  @Field(() => [DonorCommentType])
  comments: DonorCommentType[];
}

@ObjectType('Contender', {
  description: 'Un producto de "la cola para la cima"',
})
export class ContenderType {
  @Field(() => Int)
  position: number;

  @Field(() => ProductType)
  product: ProductType;

  @Field(() => Int)
  totalCents: number;

  @Field(() => Int, {
    description: 'Lo que le falta para superar al #1 (diferencia + S/ 1)',
  })
  missingCents: number;
}

@ObjectType('CategoryRanking')
export class CategoryRankingType {
  @Field(() => CategoryType)
  category: CategoryType;

  @Field(() => CimaType, {
    nullable: true,
    description: 'null si la categoría aún no tiene productos',
  })
  leader: CimaType | null;

  @Field(() => [ContenderType])
  contenders: ContenderType[];
}
