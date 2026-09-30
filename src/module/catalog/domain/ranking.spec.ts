import type { Product } from './catalog.js';
import { buildContenders, compareRanking, missingToLead } from './ranking.js';

function product(
  id: string,
  totalCents: number,
  reachedAt = '2026-01-01',
): Product {
  return {
    id,
    slug: id,
    name: id,
    company: 'Empresa',
    categoryId: 'cervezas',
    imageUrl: null,
    status: 'APPROVED',
    totalCents,
    totalReachedAt: new Date(reachedAt),
  };
}

describe('compareRanking', () => {
  it('ordena de más dinero a menos', () => {
    const sorted = [product('b', 100), product('a', 500)].sort(compareRanking);
    expect(sorted.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('en un empate queda arriba el que llegó primero al monto', () => {
    const early = product('tarde', 300, '2026-03-02');
    const late = product('temprano', 300, '2026-03-01');
    expect([early, late].sort(compareRanking).map((p) => p.id)).toEqual([
      'temprano',
      'tarde',
    ]);
  });
});

describe('missingToLead', () => {
  it('pide un sol más que la diferencia (igualar no alcanza)', () => {
    expect(missingToLead(48_320_00, 47_120_00)).toBe(1_201_00);
  });

  it('con un empate le falta exactamente S/ 1', () => {
    expect(missingToLead(500, 500)).toBe(100);
  });
});

describe('buildContenders', () => {
  it('excluye al líder y numera desde el puesto 2', () => {
    const contenders = buildContenders([
      product('lider', 900),
      product('segundo', 600),
      product('tercero', 100),
    ]);
    expect(contenders).toEqual([
      expect.objectContaining({ position: 2, missingCents: 400 }),
      expect.objectContaining({ position: 3, missingCents: 900 }),
    ]);
  });

  it('sin productos no hay cola', () => {
    expect(buildContenders([])).toEqual([]);
  });
});
