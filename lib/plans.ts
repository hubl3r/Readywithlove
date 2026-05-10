// lib/plans.ts

export type PlanId = 'basic' | 'advanced' | 'premium'

export interface Plan {
  id: PlanId
  name: string
  photoLimit: number
  description: string
}

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    photoLimit: 50,
    description: 'For getting started',
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    photoLimit: 200,
    description: 'For a fuller story',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    photoLimit: 1000,
    description: 'A complete archive',
  },
}

export function getPlan(planId: string | null | undefined): Plan {
  if (planId && planId in PLANS) return PLANS[planId as PlanId]
  return PLANS.basic
}

export function getPhotoLimit(planId: string | null | undefined): number {
  return getPlan(planId).photoLimit
}

export interface QuotaStatus {
  used: number
  limit: number
  remaining: number
  percent: number
  warning: boolean // true at 80%+
  exceeded: boolean // true at 100%+
}

export function getQuotaStatus(used: number, limit: number): QuotaStatus {
  const percent = limit > 0 ? (used / limit) * 100 : 0
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    percent,
    warning: percent >= 80 && percent < 100,
    exceeded: used >= limit,
  }
}
