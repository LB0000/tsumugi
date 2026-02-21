import type { StrategicGoal, GoalWithAutoKpi, AdSpend, CacSummary, FunnelSnapshot, FunnelConversionRates, ActionPlan } from '../types/strategy';
import { apiFetch } from './index';

export async function getGoals(): Promise<{ goals: GoalWithAutoKpi[] }> {
  return apiFetch('/strategy/goals');
}

export async function createGoal(data: {
  name: string; category: string; targetValue: number; unit: string; deadline: string;
}): Promise<StrategicGoal> {
  return apiFetch('/strategy/goals', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateGoal(id: string, data: Partial<StrategicGoal>): Promise<StrategicGoal> {
  return apiFetch(`/strategy/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteGoal(id: string): Promise<void> {
  await apiFetch(`/strategy/goals/${id}`, { method: 'DELETE' });
}

export async function updateGoalProgress(id: string, currentValue: number): Promise<StrategicGoal> {
  return apiFetch(`/strategy/goals/${id}/progress`, { method: 'PATCH', body: JSON.stringify({ currentValue }) });
}

export async function getAdSpends(period?: string): Promise<{ spends: AdSpend[]; summary: CacSummary }> {
  const qs = period ? `?period=${period}` : '';
  return apiFetch(`/cac/spends${qs}`);
}

export async function createAdSpend(data: {
  channel: string; amount: number; period: string;
  impressions?: number; clicks?: number; conversions?: number; revenue?: number; note?: string;
}): Promise<AdSpend> {
  return apiFetch('/cac/spends', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteAdSpend(id: string): Promise<void> {
  await apiFetch(`/cac/spends/${id}`, { method: 'DELETE' });
}

export async function getFunnelSnapshots(startDate?: string, endDate?: string): Promise<{
  snapshots: FunnelSnapshot[]; conversionRates: FunnelConversionRates;
}> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiFetch(`/funnel/snapshots${qs ? `?${qs}` : ''}`);
}

export async function createFunnelSnapshot(data: {
  date: string; visitors?: number; freeGenerations?: number;
  charges?: number; physicalPurchases?: number; revenue?: number;
}): Promise<FunnelSnapshot> {
  return apiFetch('/funnel/snapshots', { method: 'POST', body: JSON.stringify(data) });
}

// --- Action Plans ---

export async function getActionPlans(goalId?: string): Promise<{ actions: ActionPlan[] }> {
  const qs = goalId ? `?goalId=${goalId}` : '';
  return apiFetch(`/actions${qs}`);
}

export async function createActionPlan(data: {
  goalId: string; title: string; description?: string;
  actionType: string; priority?: string; dueDate?: string; config?: string;
}): Promise<ActionPlan> {
  return apiFetch('/actions', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateActionPlan(id: string, data: Partial<ActionPlan>): Promise<ActionPlan> {
  return apiFetch(`/actions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteActionPlan(id: string): Promise<void> {
  await apiFetch(`/actions/${id}`, { method: 'DELETE' });
}

export async function executeActionPlan(id: string): Promise<ActionPlan> {
  return apiFetch(`/actions/${id}/execute`, { method: 'POST' });
}
