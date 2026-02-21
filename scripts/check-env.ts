/**
 * Environment variable checker
 * Usage:
 *   npx tsx scripts/check-env.ts          # Check local .env files
 *   npx tsx scripts/check-env.ts --production  # Check production-required vars only
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const isProductionCheck = process.argv.includes('--production');

// --- Variable definitions ---

interface EnvVar {
  name: string;
  required: 'production' | 'always' | 'optional';
  category: string;
}

const MAIN_VARS: EnvVar[] = [
  // Core
  { name: 'GEMINI_API_KEY', required: 'production', category: 'AI' },
  { name: 'FRONTEND_URL', required: 'production', category: 'Deploy' },
  { name: 'SESSION_SECRET', required: 'production', category: 'Auth' },
  { name: 'NODE_ENV', required: 'optional', category: 'Deploy' },
  { name: 'PORT', required: 'optional', category: 'Deploy' },
  { name: 'TRUST_PROXY', required: 'optional', category: 'Deploy' },
  // Square
  { name: 'SQUARE_ACCESS_TOKEN', required: 'production', category: 'Payment' },
  { name: 'SQUARE_LOCATION_ID', required: 'production', category: 'Payment' },
  { name: 'SQUARE_ENVIRONMENT', required: 'production', category: 'Payment' },
  { name: 'SQUARE_WEBHOOK_SIGNATURE_KEY', required: 'optional', category: 'Payment' },
  { name: 'SQUARE_WEBHOOK_NOTIFICATION_URL', required: 'optional', category: 'Payment' },
  // Square (Frontend)
  { name: 'VITE_API_URL', required: 'production', category: 'Frontend' },
  { name: 'VITE_SQUARE_APPLICATION_ID', required: 'production', category: 'Frontend' },
  { name: 'VITE_SQUARE_LOCATION_ID', required: 'production', category: 'Frontend' },
  { name: 'VITE_SQUARE_ENVIRONMENT', required: 'optional', category: 'Frontend' },
  // Auth
  { name: 'GOOGLE_CLIENT_ID', required: 'optional', category: 'Auth' },
  { name: 'VITE_GOOGLE_CLIENT_ID', required: 'optional', category: 'Frontend' },
  // Email
  { name: 'RESEND_API_KEY', required: 'production', category: 'Email' },
  { name: 'FROM_EMAIL', required: 'production', category: 'Email' },
  // Analytics
  { name: 'VITE_GTM_ID', required: 'optional', category: 'Analytics' },
  { name: 'VITE_META_PIXEL_ID', required: 'optional', category: 'Analytics' },
  { name: 'META_CONVERSIONS_API_TOKEN', required: 'optional', category: 'Analytics' },
  { name: 'META_PIXEL_ID', required: 'optional', category: 'Analytics' },
  // Supabase
  { name: 'SUPABASE_URL', required: 'production', category: 'Database' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: 'production', category: 'Database' },
  // Sentry
  { name: 'SENTRY_DSN', required: 'optional', category: 'Monitoring' },
  { name: 'VITE_SENTRY_DSN', required: 'optional', category: 'Monitoring' },
  // Admin integration
  { name: 'INTERNAL_API_KEY', required: 'production', category: 'Integration' },
  { name: 'TSUMUGI_ADMIN_API_URL', required: 'optional', category: 'Integration' },
  // LYLY
  { name: 'LYLY_API_URL', required: 'optional', category: 'Integration' },
  { name: 'LYLY_AUTH_TOKEN', required: 'optional', category: 'Integration' },
  // Test
  { name: 'TEST_USER_IDS', required: 'optional', category: 'Test' },
  { name: 'TEST_USER_EMAILS', required: 'optional', category: 'Test' },
  { name: 'TEST_LOGIN_KEY', required: 'optional', category: 'Test' },
  { name: 'ALLOW_MOCK_GENERATION', required: 'optional', category: 'Test' },
];

const ADMIN_VARS: EnvVar[] = [
  { name: 'ADMIN_PASSWORD', required: 'always', category: 'Auth' },
  { name: 'FRONTEND_URL', required: 'production', category: 'Deploy' },
  { name: 'NODE_ENV', required: 'optional', category: 'Deploy' },
  { name: 'PORT', required: 'optional', category: 'Deploy' },
  { name: 'DATABASE_URL', required: 'optional', category: 'Database' },
  { name: 'GEMINI_API_KEY', required: 'production', category: 'AI' },
  { name: 'SQUARE_ACCESS_TOKEN', required: 'optional', category: 'Payment' },
  { name: 'SQUARE_LOCATION_ID', required: 'optional', category: 'Payment' },
  { name: 'SQUARE_ENVIRONMENT', required: 'optional', category: 'Payment' },
  { name: 'TSUMUGI_API_URL', required: 'production', category: 'Integration' },
  { name: 'INTERNAL_API_KEY', required: 'production', category: 'Integration' },
  { name: 'RESEND_API_KEY', required: 'production', category: 'Email' },
  { name: 'FROM_EMAIL', required: 'optional', category: 'Email' },
  { name: 'MARKETING_UNSUBSCRIBE_SECRET', required: 'optional', category: 'Email' },
  { name: 'MARKETING_UNSUBSCRIBE_BASE_URL', required: 'optional', category: 'Email' },
  { name: 'TSUMUGI_ADMIN_API_URL', required: 'optional', category: 'Integration' },
  { name: 'VITE_API_URL', required: 'optional', category: 'Frontend' },
];

// --- Helpers ---

const PLACEHOLDER_PATTERNS = [
  /^your_/i,
  /^xxx/i,
  /^placeholder/i,
  /^change_me/i,
  /^TODO/i,
  /^sandbox-sq0idb-xxxxx$/,
];

function parseEnvFile(filePath: string): Map<string, string> {
  const vars = new Map<string, string>();
  if (!existsSync(filePath)) return vars;

  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    let key = trimmed.slice(0, eqIndex).trim();
    // Handle `export VAR=value`
    if (key.startsWith('export ')) {
      key = key.slice(7).trim();
    }
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars.set(key, value);
  }
  return vars;
}

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

function checkProject(
  label: string,
  envPath: string,
  vars: EnvVar[],
): { ok: number; warn: number; skip: number } {
  const envVars = parseEnvFile(envPath);
  const fileExists = existsSync(envPath);
  const counts = { ok: 0, warn: 0, skip: 0 };

  console.log(`\n=== ${label} ===`);
  if (!fileExists) {
    console.log(`  .env ファイルなし: ${envPath}`);
  }

  const filtered = isProductionCheck
    ? vars.filter((v) => v.required === 'production' || v.required === 'always')
    : vars;

  let lastCategory = '';
  for (const v of filtered) {
    if (v.category !== lastCategory) {
      console.log(`  [${v.category}]`);
      lastCategory = v.category;
    }

    const value = envVars.get(v.name);
    const hasValue = value !== undefined && value !== '';
    const isPlaceholderValue = hasValue && isPlaceholder(value);
    const reqLabel =
      v.required === 'always' ? '必須' : v.required === 'production' ? '本番必須' : '任意';

    if (hasValue && !isPlaceholderValue) {
      // Mask sensitive values
      const display = v.name.includes('KEY') || v.name.includes('SECRET') || v.name.includes('TOKEN') || v.name.includes('PASSWORD') || v.name.includes('DSN')
        ? '***'
        : value.length > 30 ? `${value.slice(0, 10)}...` : value;
      console.log(`    \u2705 ${v.name.padEnd(38)} ${display}`);
      counts.ok++;
    } else if (isPlaceholderValue) {
      console.log(`    \u26a0\ufe0f  ${v.name.padEnd(38)} placeholder\u5024\uff08${reqLabel}\uff09`);
      counts.warn++;
    } else if (v.required === 'optional' && !isProductionCheck) {
      console.log(`    \u2500  ${v.name.padEnd(38)} \u672a\u8a2d\u5b9a\uff08${reqLabel}\uff09`);
      counts.skip++;
    } else {
      console.log(`    \u26a0\ufe0f  ${v.name.padEnd(38)} \u672a\u8a2d\u5b9a\uff08${reqLabel}\uff09`);
      counts.warn++;
    }
  }

  return counts;
}

// --- Main ---

console.log(`\nTSUMUGI \u74b0\u5883\u5909\u6570\u30c1\u30a7\u30c3\u30af ${isProductionCheck ? '(\u672c\u756a\u30e2\u30fc\u30c9)' : '(\u5168\u9805\u76ee)'}`);
console.log('='.repeat(60));

const mainResult = checkProject(
  'TSUMUGI \u672c\u4f53',
  resolve(ROOT, '.env'),
  MAIN_VARS,
);

const adminResult = checkProject(
  'tsumugi-admin',
  resolve(ROOT, 'tsumugi-admin', '.env'),
  ADMIN_VARS,
);

// Summary
const totalOk = mainResult.ok + adminResult.ok;
const totalWarn = mainResult.warn + adminResult.warn;
const totalSkip = mainResult.skip + adminResult.skip;

console.log('\n' + '='.repeat(60));
console.log(`\u5408\u8a08: \u2705 ${totalOk} \u8a2d\u5b9a\u6e08\u307f / \u26a0\ufe0f  ${totalWarn} \u8981\u78ba\u8a8d / \u2500 ${totalSkip} \u4efb\u610f`);

if (totalWarn > 0) {
  process.exit(1);
}
