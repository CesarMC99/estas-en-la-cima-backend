/*
 * Se ejecuta antes de cada archivo e2e.
 *
 * Carga el .env y cambia el nombre de la base de datos a
 * "<nombre>-test": las pruebas crean y borran datos libremente sin tocar
 * la base de desarrollo. process.env tiene prioridad sobre el .env, así que
 * ConfigModule usará esta URI.
 */
try {
  process.loadEnvFile('.env');
} catch {
  // Sin .env (por ejemplo en CI) se usan las variables del entorno
}

const uri = new URL(
  process.env.DATABASE_URI ?? 'mongodb://localhost:27017/estas-en-la-cima',
);
if (!uri.pathname.endsWith('-test')) {
  uri.pathname = `${uri.pathname}-test`;
}
process.env.DATABASE_URI = uri.toString();

// El correo va al log (nunca se envían correos reales desde las pruebas)
process.env.RESEND_API_KEY = '';
