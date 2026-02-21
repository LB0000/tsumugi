import { apiFetch } from './index.js';

export interface AutomationStep {
  stepIndex: number;
  delayMinutes: number;
  subject: string;
  htmlBody: string;
  useAiGeneration: boolean;
  aiPurpose?: string;
  aiTopic?: string;
  skipCondition?: string | null;
}

export interface Automation {
  id: string;
  name: string;
  triggerType: string;
  triggerLabel?: string;
  status: string;
  steps: string; // JSON string
  createdAt: string;
  updatedAt: string;
  enrollments?: { total: number; active: number; completed: number };
  totalSent?: number;
}

export interface AutomationDetail extends Automation {
  stats: {
    totalEnrolled: number;
    active: number;
    completed: number;
    stopped: number;
    totalSent: number;
    totalFailed: number;
  };
}

export interface AutomationEnrollment {
  id: string;
  automationId: string;
  customerId: string;
  customerEmail: string | null;
  customerName: string | null;
  currentStepIndex: number;
  status: string;
  nextSendAt: string | null;
  enrolledAt: string;
  completedAt: string | null;
}

export async function getAutomations(): Promise<{ automations: Automation[] }> {
  return apiFetch('/automations');
}

export async function getAutomation(id: string): Promise<AutomationDetail> {
  return apiFetch(`/automations/${id}`);
}

export async function createAutomation(data: {
  name: string;
  triggerType: string;
  steps: AutomationStep[];
}): Promise<Automation> {
  return apiFetch('/automations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAutomation(
  id: string,
  data: { name?: string; triggerType?: string; steps?: AutomationStep[] },
): Promise<Automation> {
  return apiFetch(`/automations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAutomation(id: string): Promise<void> {
  await apiFetch(`/automations/${id}`, { method: 'DELETE' });
}

export async function activateAutomation(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/automations/${id}/activate`, { method: 'POST' });
}

export async function pauseAutomation(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/automations/${id}/pause`, { method: 'POST' });
}

export async function getEnrollments(id: string): Promise<{ enrollments: AutomationEnrollment[] }> {
  return apiFetch(`/automations/${id}/enrollments`);
}

export async function stopEnrollment(automationId: string, enrollmentId: string): Promise<void> {
  await apiFetch(`/automations/${automationId}/enrollments/${enrollmentId}/stop`, { method: 'POST' });
}
