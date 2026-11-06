// Записывает в .env адрес и publishable key локального Supabase (из `supabase status`).
// Секретные ключи не записываются: клиенту нужны только EXPO_PUBLIC_*.
// Использование: npm run setup:env (после npm run db:start).
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function status() {
  const output = execSync('npx supabase status -o json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const json = output.slice(output.indexOf('{'));
  return JSON.parse(json);
}

let local;
try {
  local = status();
} catch {
  console.error('Локальный Supabase не запущен. Сначала: npm run db:start (нужен Docker Desktop).');
  process.exit(1);
}

const values = {
  EXPO_PUBLIC_SUPABASE_URL: local.API_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY,
};
if (!values.EXPO_PUBLIC_SUPABASE_URL || !values.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  console.error('supabase status не вернул API_URL / PUBLISHABLE_KEY.');
  process.exit(1);
}

const source = existsSync('.env') ? '.env' : '.env.example';
let text = readFileSync(source, 'utf8');
for (const [key, value] of Object.entries(values)) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
}
writeFileSync('.env', text);
console.log(`.env готов (${source === '.env' ? 'обновлён' : 'создан из .env.example'}).`);
