import {
  maskEmail,
  normalizePeruMobile,
  parseLoginIdentifier,
} from './contact.js';

describe('normalizePeruMobile', () => {
  it.each([
    ['987654321', '+51987654321'],
    ['987 654 321', '+51987654321'],
    ['+51 987654321', '+51987654321'],
    ['51987654321', '+51987654321'],
    ['987-654-321', '+51987654321'],
  ])('acepta "%s" y lo deja como %s', (input, expected) => {
    expect(normalizePeruMobile(input)).toBe(expected);
  });

  it.each(['812345678', '98765432', '9876543210', 'abc'])(
    'rechaza "%s"',
    (input) => {
      expect(normalizePeruMobile(input)).toBeNull();
    },
  );
});

describe('parseLoginIdentifier', () => {
  it('reconoce un correo y lo pasa a minúsculas', () => {
    expect(parseLoginIdentifier('  Cesar@Gmail.com ')).toEqual({
      kind: 'email',
      value: 'cesar@gmail.com',
    });
  });

  it('reconoce un celular y lo normaliza', () => {
    expect(parseLoginIdentifier('987 654 321')).toEqual({
      kind: 'phone',
      value: '+51987654321',
    });
  });

  it('devuelve null si no es ni correo ni celular', () => {
    expect(parseLoginIdentifier('hola')).toBeNull();
  });
});

describe('maskEmail', () => {
  it('oculta el centro del nombre', () => {
    expect(maskEmail('cesar@gmail.com')).toBe('c***r@gmail.com');
  });
});
