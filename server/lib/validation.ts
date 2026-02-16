export function isValidEmail(value: string): boolean {
  // RFC 5321 準拠: local@domain.tld（連続ドット禁止、TLD 2文字以上）
  return value.length <= 254 && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(value) && !value.includes('..');
}
