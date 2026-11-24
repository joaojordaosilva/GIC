// Lê as variáveis de ambiente de forma "preguiçosa": só quando montarAdmin() roda,
// depois que o dotenv.config() do server.js já carregou o .env.

export function carregarConfig(env = process.env) {
  const jwtSecret = env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). Gere um com:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL ausente. Ex.: postgresql://usuario:senha@host:5432/banco');
  }
  return {
    databaseUrl: env.DATABASE_URL,
    // Supabase/Neon/Render exigem SSL. Use DB_SSL=true nesses casos.
    dbSsl: String(env.DB_SSL || '').toLowerCase() === 'true',
    jwtSecret,
    jwtExpira: env.JWT_EXPIRA || '8h',
    bcryptCusto: 12
  };
}
