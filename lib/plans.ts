// lib/plans.ts

export type PlanId = 'basic' | 'advanced' | 'premium'

export interface Plan {
  id: PlanId
  name: string
  photoLimit: number
  messageMinutesLimit: number // total video minutes across all messages
  description: string
}

// -1 represents unlimited (fair use).
export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    photoLimit: 50,
    messageMinutesLimit: 10,
    description: 'For getting started',
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    photoLimit: 200,
    messageMinutesLimit: 60,
    description: 'For a fuller story',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    photoLimit: 1000,
    messageMinutesLimit: -1,
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

export function getMessageMinutesLimit(planId: string | null | undefined): number {
  return getPlan(planId).messageMinutesLimit
}

export interface QuotaStatus {
  used: number
  limit: number
  remaining: number
  percent: number
  warning: boolean
  exceeded: boolean
  unlimited: boolean
}

export function getQuotaStatus(used: number, limit: number): QuotaStatus {
  if (limit < 0) {
    return {
      used,
      limit: -1,
      remaining: Infinity,
      percent: 0,
      warning: false,
      exceeded: false,
      unlimited: true,
    }
  }
  const percent = limit > 0 ? (used / limit) * 100 : 0
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    percent,
    warning: percent >= 80 && percent < 100,
    exceeded: used >= limit,
    unlimited: false,
  }
}
