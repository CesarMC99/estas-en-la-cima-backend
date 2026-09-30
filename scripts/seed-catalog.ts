/*
 * Carga las categorías y productos iniciales (los del diseño).
 *
 * Uso:  pnpm seed
 *
 * Es IDEMPOTENTE: se puede correr muchas veces sin duplicar nada. Busca cada
 * categoría y producto por su slug; si existe lo actualiza, si no lo crea.
 *
 * Los totales de demostración solo se ponen al CREAR un producto
 * ($setOnInsert): si el script se vuelve a correr cuando ya hay donaciones
 * reales, nunca pisa esos totales.
 *
 * Se ejecuta con Node directamente (Node 24 entiende TypeScript simple), sin
 * Nest: por eso usa mongoose "a mano" y no los esquemas con decoradores.
 */
import mongoose from 'mongoose';

try {
  process.loadEnvFile('.env');
} catch {
  // Sin .env se usan las variables del entorno
}

const uri = process.env.DATABASE_URI;
if (!uri) throw new Error('Falta DATABASE_URI en el .env');

interface SeedCategory {
  slug: string;
  name: string;
  crownTitle: string;
  /** [nombre, empresa, total de demostración en soles] */
  products: [string, string, number][];
}

const CATALOG: SeedCategory[] = [
  {
    slug: 'gaseosas',
    name: 'Gaseosas',
    crownTitle: 'La mejor gaseosa',
    products: [
      ['Inca Kola', 'Lindley', 41_870],
      ['Kola Real', 'AJE', 38_420],
      ['Coca-Cola', 'Lindley', 30_100],
      ['Guaraná', 'Backus', 14_300],
      ['Concordia', 'Backus', 7_800],
      ['Big Cola', 'AJE', 5_400],
    ],
  },
  {
    slug: 'cervezas',
    name: 'Cervezas',
    crownTitle: 'La mejor cerveza',
    products: [
      ['Pilsen Callao', 'Backus', 48_320],
      ['Cristal', 'Backus', 47_120],
      ['Cusqueña', 'Backus', 39_800],
      ['Arequipeña', 'Backus', 12_400],
      ['Corona', 'Backus', 8_900],
      ['San Juan', 'Backus', 6_200],
    ],
  },
  {
    slug: 'lacteos',
    name: 'Lácteos',
    crownTitle: 'La mejor leche',
    products: [
      ['Leche Gloria', 'Gloria', 22_150],
      ['Laive', 'Laive', 21_260],
      ['Pura Vida', 'Gloria', 11_900],
      ['Bella Holandesa', 'Gloria', 6_300],
      ['Ideal', 'Nestlé', 4_100],
    ],
  },
  {
    slug: 'aguas',
    name: 'Aguas',
    crownTitle: 'La mejor agua',
    products: [
      ['San Luis', 'Lindley', 9_640],
      ['Cielo', 'AJE', 9_230],
      ['San Mateo', 'Backus', 7_850],
      ['Socosani', 'Backus', 2_300],
    ],
  },
];

/** "Leche Gloria" → "leche-gloria" */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
if (!db) throw new Error('No se pudo abrir la base de datos');
console.log(`Base de datos: ${db.databaseName}`);

const categories = db.collection('categories');
const products = db.collection('products');
const now = new Date();

for (const [position, category] of CATALOG.entries()) {
  const { slug, name, crownTitle } = category;
  const saved = await categories.findOneAndUpdate(
    { slug },
    {
      $set: { name, crownTitle, position, active: true, updatedAt: now },
      $setOnInsert: { slug, createdAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (!saved) throw new Error(`No se pudo guardar la categoría ${slug}`);

  for (const [productName, company, demoSoles] of category.products) {
    await products.updateOne(
      { slug: slugify(productName) },
      {
        $set: {
          name: productName,
          company,
          categoryId: saved._id,
          status: 'APPROVED',
          updatedAt: now,
        },
        $setOnInsert: {
          slug: slugify(productName),
          imageUrl: null,
          // TEMPORAL: total de demostración (en céntimos) hasta que existan
          // las donaciones reales
          totalCents: demoSoles * 100,
          totalReachedAt: now,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }
  console.log(`✓ ${name}: ${category.products.length} productos`);
}

await mongoose.disconnect();
console.log('Listo.');
