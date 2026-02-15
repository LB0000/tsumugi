import { Router } from 'express';
import path from 'path';
import { readJsonFile, writeJsonAtomic } from '../lib/persistence.js';
import { isValidEmail } from '../lib/validation.js';

export const contactRouter = Router();

type ContactReason = 'order' | 'product' | 'other';

interface ContactRequestBody {
  reason: ContactReason;
  name: string;
  email: string;
  orderNumber?: string;
  message: string;
}

interface ContactInquiryRecord {
  id: string;
  createdAt: string;
  reason: ContactReason;
  name: string;
  email: string;
  orderNumber?: string;
  message: string;
}

const MAX_INQUIRY_RECORDS = 500;
const CONTACT_STORE_PATH = path.resolve(process.cwd(), 'server', '.data', 'contact-store.json');

interface PersistedContactState {
  version: number;
  inquiries: ContactInquiryRecord[];
}

let persistQueue: Promise<void> = Promise.resolve();
const inquiries: ContactInquiryRecord[] = loadPersistedInquiries();

function isContactInquiryRecord(value: unknown): value is ContactInquiryRecord {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.createdAt === 'string' &&
    (obj.reason === 'order' || obj.reason === 'product' || obj.reason === 'other') &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string' &&
    (obj.orderNumber === undefined || typeof obj.orderNumber === 'string') &&
    typeof obj.message === 'string'
  );
}

function loadPersistedInquiries(): ContactInquiryRecord[] {
  const parsed = readJsonFile<PersistedContactState>(CONTACT_STORE_PATH, {
    version: 1,
    inquiries: [],
  });

  const validInquiries = parsed.inquiries.filter(isContactInquiryRecord);
  return validInquiries.slice(0, MAX_INQUIRY_RECORDS);
}

function persistInquiries(): void {
  const snapshot: PersistedContactState = {
    version: 1,
    inquiries: inquiries.slice(0, MAX_INQUIRY_RECORDS),
  };

  persistQueue = persistQueue
    .then(() => writeJsonAtomic(CONTACT_STORE_PATH, snapshot))
    .catch((error) => {
      console.error('Failed to persist inquiries:', error);
    });
}

function isValidReason(reason: string): reason is ContactReason {
  return reason === 'order' || reason === 'product' || reason === 'other';
}

function generateInquiryId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INQ-${date}-${rand}`;
}

contactRouter.post('/', (req, res) => {
  const body = req.body as Partial<ContactRequestBody>;

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!isValidReason(reason)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_REASON', message: 'お問い合わせ種別が不正です' },
    });
    return;
  }

  if (name.length < 1 || name.length > 80) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_NAME', message: 'お名前を正しく入力してください' },
    });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_EMAIL', message: 'メールアドレスの形式が正しくありません' },
    });
    return;
  }

  if (reason === 'order' && orderNumber.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'ORDER_NUMBER_REQUIRED', message: '注文に関するお問い合わせには注文番号が必要です' },
    });
    return;
  }

  if (message.length < 10 || message.length > 3000) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_MESSAGE', message: 'お問い合わせ内容は10文字以上3000文字以内で入力してください' },
    });
    return;
  }

  const inquiryId = generateInquiryId();
  const record: ContactInquiryRecord = {
    id: inquiryId,
    createdAt: new Date().toISOString(),
    reason,
    name,
    email,
    orderNumber: orderNumber || undefined,
    message,
  };

  inquiries.unshift(record);
  if (inquiries.length > MAX_INQUIRY_RECORDS) {
    inquiries.length = MAX_INQUIRY_RECORDS;
  }
  persistInquiries();

  console.log(`Contact inquiry received: ${inquiryId} (${reason})`);

  res.json({
    success: true,
    inquiryId,
    estimatedReplyBusinessDays: 2,
  });
});
