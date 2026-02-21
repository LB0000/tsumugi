import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Setup (vi.hoisted for factory access) ────────────────

const { mockDb, mockSendEmail, mockGenerateEmail, mockCreateAlert, chainable } = vi.hoisted(() => {
  const _chainable = (terminal?: unknown) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'insert', 'update', 'set', 'values', 'delete'];
    for (const m of methods) {
      chain[m] = vi.fn(() => chain);
    }
    chain.get = vi.fn(() => terminal ?? undefined);
    chain.all = vi.fn(() => terminal ?? []);
    chain.run = vi.fn();
    return chain;
  };

  return {
    chainable: _chainable,
    mockDb: {
      select: vi.fn(() => _chainable()),
      insert: vi.fn(() => _chainable()),
      update: vi.fn(() => _chainable()),
      delete: vi.fn(() => _chainable()),
    },
    mockSendEmail: vi.fn(),
    mockGenerateEmail: vi.fn(),
    mockCreateAlert: vi.fn(),
  };
});

vi.mock('../../db/index.js', () => ({ db: mockDb }));
vi.mock('../../db/schema.js', () => ({
  automations: { id: 'automations.id', status: 'automations.status', steps: 'automations.steps', triggerType: 'automations.trigger_type' },
  automationEnrollments: { id: 'ae.id', automationId: 'ae.automation_id', customerId: 'ae.customer_id', status: 'ae.status', nextSendAt: 'ae.next_send_at' },
  customers: { id: 'customers.id', email: 'customers.email', segment: 'customers.segment', registeredAt: 'customers.registered_at', firstPurchaseAt: 'customers.first_purchase_at', lastPurchaseAt: 'customers.last_purchase_at', totalOrders: 'customers.total_orders', marketingOptOutAt: 'customers.marketing_opt_out_at' },
  emailSends: { automationId: 'es.automation_id' },
}));
vi.mock('../../lib/email.js', () => ({ sendMarketingEmail: (...args: unknown[]) => mockSendEmail(...args) }));
vi.mock('../../lib/gemini-text.js', () => ({
  generateEmailContent: (...args: unknown[]) => mockGenerateEmail(...args),
}));
vi.mock('../../lib/alerts.js', () => ({ createAlert: (...args: unknown[]) => mockCreateAlert(...args) }));
vi.mock('nanoid', () => ({ nanoid: () => 'mock-id-123' }));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ['eq', ...args]),
  and: vi.fn((...args: unknown[]) => ['and', ...args]),
  lte: vi.fn((...args: unknown[]) => ['lte', ...args]),
  sql: vi.fn(),
}));

// ─── Import SUT ────────────────────────────────────────────────

import { processAutomationQueue, checkAndEnrollTriggers, enrollCustomer } from '../../lib/automation-engine.js';

// ─── Helpers ───────────────────────────────────────────────────

const STEP_1 = { stepIndex: 0, delayMinutes: 0, subject: 'Welcome', htmlBody: '<p>Hi</p>', useAiGeneration: false };
const STEP_2 = { stepIndex: 1, delayMinutes: 60, subject: 'Follow', htmlBody: '<p>Follow</p>', useAiGeneration: false };

function makeAutomation(overrides = {}) {
  return {
    id: 'auto-1',
    name: 'Test Auto',
    triggerType: 'welcome',
    status: 'active',
    steps: JSON.stringify([STEP_1, STEP_2]),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCustomer(overrides = {}) {
  return {
    id: 'cust-1',
    tsumugiUserId: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    authProvider: 'email',
    registeredAt: '2026-01-01T00:00:00.000Z',
    firstPurchaseAt: null,
    lastPurchaseAt: null,
    totalOrders: 0,
    totalSpent: 0,
    segment: 'new',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    marketingOptOutAt: null,
    ...overrides,
  };
}

function makeEnrollment(overrides = {}) {
  return {
    id: 'enr-1',
    automationId: 'auto-1',
    customerId: 'cust-1',
    currentStepIndex: 0,
    status: 'active',
    nextSendAt: '2026-01-01T00:00:00.000Z',
    enrolledAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Configure mock DB to return specific values for sequential select calls */
function setupSelectSequence(results: unknown[]) {
  let callIndex = 0;
  mockDb.select.mockImplementation(() => {
    const result = results[callIndex] ?? undefined;
    callIndex++;
    const chain = chainable(result);
    return chain as ReturnType<typeof mockDb.select>;
  });
}

// ─── Tests: processAutomationQueue ─────────────────────────────

describe('processAutomationQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zeros when no due enrollments', async () => {
    setupSelectSequence([[]]);
    const result = await processAutomationQueue();
    expect(result).toEqual({ processed: 0, sent: 0, skipped: 0, failed: 0, completed: 0 });
  });

  it('sends email and advances step for active enrollment', async () => {
    const enrollment = makeEnrollment();
    const automation = makeAutomation();
    const customer = makeCustomer();

    setupSelectSequence([
      [enrollment],  // due enrollments
      automation,    // automation lookup
      customer,      // customer lookup
    ]);

    mockSendEmail.mockResolvedValueOnce({ success: true });

    const result = await processAutomationQueue();

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Welcome',
      htmlBody: '<p>Hi</p>',
    });
    // insert emailSends + update enrollment
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('stops enrollment and records failed when email send fails', async () => {
    const enrollment = makeEnrollment();
    const automation = makeAutomation();
    const customer = makeCustomer();

    setupSelectSequence([
      [enrollment],
      automation,
      customer,
    ]);

    mockSendEmail.mockResolvedValueOnce({ success: false });

    const result = await processAutomationQueue();

    expect(result.failed).toBe(1);
    expect(mockDb.insert).toHaveBeenCalled(); // emailSends with status 'failed'
    expect(mockDb.update).toHaveBeenCalled(); // stop enrollment
  });

  it('skips opt-out customer and stops enrollment', async () => {
    const enrollment = makeEnrollment();
    const automation = makeAutomation();
    const customer = makeCustomer({ marketingOptOutAt: '2026-01-01T00:00:00.000Z' });

    setupSelectSequence([
      [enrollment],
      automation,
      customer,
    ]);

    const result = await processAutomationQueue();

    expect(result.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled(); // stop enrollment
  });

  it('completes enrollment when current step index exceeds steps', async () => {
    const enrollment = makeEnrollment({ currentStepIndex: 2 }); // step 2 doesn't exist (only 0, 1)
    const automation = makeAutomation();
    const customer = makeCustomer();

    setupSelectSequence([
      [enrollment],
      automation,
      customer,
    ]);

    const result = await processAutomationQueue();

    expect(result.completed).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('uses AI-generated content when useAiGeneration is true', async () => {
    const aiStep = { stepIndex: 0, delayMinutes: 0, subject: '', htmlBody: '', useAiGeneration: true, aiTopic: 'Welcome' };
    const automation = makeAutomation({ steps: JSON.stringify([aiStep]) });
    const enrollment = makeEnrollment();
    const customer = makeCustomer();

    setupSelectSequence([
      [enrollment],
      automation,
      customer,
    ]);

    mockGenerateEmail.mockResolvedValueOnce({ subject: 'AI Subject', body: '<p>AI Body</p>' });
    mockSendEmail.mockResolvedValueOnce({ success: true });

    await processAutomationQueue();

    expect(mockGenerateEmail).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'AI Subject',
      htmlBody: '<p>AI Body</p>',
    });
  });

  it('falls back to static content when AI generation fails', async () => {
    const aiStep = {
      stepIndex: 0, delayMinutes: 0,
      subject: 'Fallback Subject', htmlBody: '<p>Fallback</p>',
      useAiGeneration: true, aiTopic: 'test',
    };
    const automation = makeAutomation({ steps: JSON.stringify([aiStep]) });
    const enrollment = makeEnrollment();
    const customer = makeCustomer();

    setupSelectSequence([
      [enrollment],
      automation,
      customer,
    ]);

    mockGenerateEmail.mockRejectedValueOnce(new Error('AI error'));
    mockSendEmail.mockResolvedValueOnce({ success: true });

    await processAutomationQueue();

    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Fallback Subject',
      htmlBody: '<p>Fallback</p>',
    });
  });

  it('stops enrollment when AI fails and no static fallback', async () => {
    const aiStep = {
      stepIndex: 0, delayMinutes: 0,
      subject: '', htmlBody: '',
      useAiGeneration: true, aiTopic: 'test',
    };
    const automation = makeAutomation({ steps: JSON.stringify([aiStep]) });
    const enrollment = makeEnrollment();
    const customer = makeCustomer();

    setupSelectSequence([
      [enrollment],
      automation,
      customer,
    ]);

    mockGenerateEmail.mockRejectedValueOnce(new Error('AI error'));

    const result = await processAutomationQueue();

    expect(result.failed).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled(); // stopEnrollment
  });

  it('skips step when purchased_since_trigger and customer has recent purchase', async () => {
    const stepWithSkip = {
      stepIndex: 0, delayMinutes: 0,
      subject: 'test', htmlBody: '<p>test</p>',
      useAiGeneration: false,
      skipCondition: 'purchased_since_trigger',
    };
    const automation = makeAutomation({ steps: JSON.stringify([stepWithSkip, STEP_2]) });
    const enrollment = makeEnrollment({ enrolledAt: '2026-01-01T00:00:00.000Z' });
    const customer = makeCustomer({ lastPurchaseAt: '2026-01-02T00:00:00.000Z' });

    setupSelectSequence([
      [enrollment],
      automation,
      customer,
    ]);

    const result = await processAutomationQueue();

    expect(result.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('does not skip step when purchased_since_trigger but no recent purchase', async () => {
    const stepWithSkip = {
      stepIndex: 0, delayMinutes: 0,
      subject: 'test', htmlBody: '<p>test</p>',
      useAiGeneration: false,
      skipCondition: 'purchased_since_trigger',
    };
    const automation = makeAutomation({ steps: JSON.stringify([stepWithSkip, STEP_2]) });
    const enrollment = makeEnrollment({ enrolledAt: '2026-01-02T00:00:00.000Z' });
    const customer = makeCustomer({ lastPurchaseAt: '2026-01-01T00:00:00.000Z' });

    setupSelectSequence([
      [enrollment],
      automation,
      customer,
    ]);
    mockSendEmail.mockResolvedValueOnce({ success: true });

    const result = await processAutomationQueue();

    expect(result.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('skips step when became_active and customer is active', async () => {
    const stepWithSkip = {
      stepIndex: 0, delayMinutes: 0,
      subject: 'test', htmlBody: '<p>test</p>',
      useAiGeneration: false,
      skipCondition: 'became_active',
    };
    const automation = makeAutomation({ steps: JSON.stringify([stepWithSkip, STEP_2]) });
    const enrollment = makeEnrollment();
    const customer = makeCustomer({ segment: 'active' });

    setupSelectSequence([
      [enrollment],
      automation,
      customer,
    ]);

    const result = await processAutomationQueue();

    expect(result.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('calls createAlert when 3+ failures occur', async () => {
    const enrollments = [
      makeEnrollment({ id: 'e1' }),
      makeEnrollment({ id: 'e2' }),
      makeEnrollment({ id: 'e3' }),
    ];

    // For each enrollment: automation lookup returns active, customer returns valid
    const automation = makeAutomation();
    const customer = makeCustomer();

    let callIndex = 0;
    const responses = [
      enrollments,     // due enrollments
      automation, customer,  // enrollment 1
      automation, customer,  // enrollment 2
      automation, customer,  // enrollment 3
    ];
    mockDb.select.mockImplementation(() => {
      const result = responses[callIndex] ?? undefined;
      callIndex++;
      return chainable(result) as ReturnType<typeof mockDb.select>;
    });

    mockSendEmail.mockResolvedValue({ success: false });

    await processAutomationQueue();

    expect(mockCreateAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sync_failure',
        severity: 'warning',
      }),
    );
  });

  it('does not call createAlert when fewer than 3 failures', async () => {
    const enrollments = [makeEnrollment({ id: 'e1' }), makeEnrollment({ id: 'e2' })];
    const automation = makeAutomation();
    const customer = makeCustomer();

    let callIndex = 0;
    const responses = [enrollments, automation, customer, automation, customer];
    mockDb.select.mockImplementation(() => {
      const result = responses[callIndex] ?? undefined;
      callIndex++;
      return chainable(result) as ReturnType<typeof mockDb.select>;
    });

    mockSendEmail.mockResolvedValue({ success: false });

    await processAutomationQueue();

    expect(mockCreateAlert).not.toHaveBeenCalled();
  });

  it('returns null outcome for inactive automation', async () => {
    const enrollment = makeEnrollment();
    const automation = makeAutomation({ status: 'paused' });

    setupSelectSequence([
      [enrollment],
      automation,
    ]);

    const result = await processAutomationQueue();

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('stops enrollment when customer not found', async () => {
    const enrollment = makeEnrollment();
    const automation = makeAutomation();

    setupSelectSequence([
      [enrollment],
      automation,
      undefined, // customer not found
    ]);

    const result = await processAutomationQueue();

    expect(result.processed).toBe(1);
    expect(mockDb.update).toHaveBeenCalled(); // stopEnrollment
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

// ─── Tests: checkAndEnrollTriggers ─────────────────────────────

describe('checkAndEnrollTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when no active automations', () => {
    setupSelectSequence([[]]);
    checkAndEnrollTriggers();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('enrolls candidate customer for welcome automation', () => {
    const automation = makeAutomation({ triggerType: 'welcome' });
    const candidate = makeCustomer({ segment: 'new' });

    let callIndex = 0;
    const responses: unknown[] = [
      [automation],    // active automations
      [candidate],     // findCandidates
      undefined,       // existing enrollment check (none found)
    ];
    mockDb.select.mockImplementation(() => {
      const result = responses[callIndex] ?? undefined;
      callIndex++;
      return chainable(result) as ReturnType<typeof mockDb.select>;
    });

    checkAndEnrollTriggers();

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('skips enrollment when customer already enrolled', () => {
    const automation = makeAutomation({ triggerType: 'welcome' });
    const candidate = makeCustomer({ segment: 'new' });
    const existingEnrollment = { id: 'existing-enr' };

    let callIndex = 0;
    const responses: unknown[] = [
      [automation],
      [candidate],
      existingEnrollment, // already enrolled
    ];
    mockDb.select.mockImplementation(() => {
      const result = responses[callIndex] ?? undefined;
      callIndex++;
      return chainable(result) as ReturnType<typeof mockDb.select>;
    });

    checkAndEnrollTriggers();

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('skips automation with empty steps', () => {
    const automation = makeAutomation({ steps: '[]' });

    setupSelectSequence([[automation]]);

    checkAndEnrollTriggers();

    // Should not call findCandidates (only 1 select call for active automations)
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });

  it('skips automation with invalid steps JSON', () => {
    const automation = makeAutomation({ steps: 'not-json' });

    setupSelectSequence([[automation]]);

    checkAndEnrollTriggers();

    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });
});

// ─── Tests: enrollCustomer ─────────────────────────────────────

describe('enrollCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts enrollment with correct nextSendAt', () => {
    enrollCustomer('auto-1', 'cust-1', [STEP_1, STEP_2]);

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('does nothing when steps array is empty', () => {
    enrollCustomer('auto-1', 'cust-1', []);

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('silently handles UNIQUE constraint violation', () => {
    const insertChain = chainable();
    (insertChain.run as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('UNIQUE constraint failed');
    });
    mockDb.insert.mockReturnValue(insertChain as ReturnType<typeof mockDb.insert>);

    expect(() => enrollCustomer('auto-1', 'cust-1', [STEP_1])).not.toThrow();
  });

  it('loads steps from DB when not provided', () => {
    const automation = makeAutomation();
    setupSelectSequence([automation]);

    enrollCustomer('auto-1', 'cust-1');

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('does nothing when automation not found and steps not provided', () => {
    setupSelectSequence([undefined]);

    enrollCustomer('auto-1', 'cust-1');

    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
