import { readFileSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    const raw = readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  // Persist sensitive runtime data with owner-only permissions.
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
  await fs.rename(tempPath, filePath);
  await fs.chmod(filePath, 0o600).catch(() => {
    // Best effort: some environments may not support chmod reliably.
  });
}
