import type { CommitmentImpactLevel, ConsequenceAnalysis } from '@/types/simulation'

// ---------------------------------------------------------------------------
// Sub-category classification
// ---------------------------------------------------------------------------

type SubCategory = 'career' | 'academic' | 'meetings' | 'finance' | 'personal'

/**
 * Keyword dictionaries for sub-category classification.
 * Checked against lowercase title + description.
 * Order matters: career and academic are checked before meetings,
 * so "onboarding" in a CAREER commitment correctly falls to meetings.
 */
const KEYWORD_MAP: Record<SubCategory, string[]> = {
  career: [
    'internship', 'interview', 'resume', 'job', 'placement',
    'application', 'hiring', 'recruiter', 'offer', 'career',
  ],
  academic: [
    'assignment', 'project', 'exam', 'presentation', 'report',
    'submission', 'thesis', 'lecture', 'coursework', 'grade',
  ],
  meetings: [
    'meeting', 'call', 'discussion', 'briefing', 'onboarding',
    'standup', 'sync', 'huddle', 'review', 'demo',
  ],
  finance: [
    'payment', 'invoice', 'tax', 'budget', 'salary',
    'bill', 'loan', 'insurance', 'refund', 'expense',
  ],
  personal: [
    'shopping', 'groceries', 'exercise', 'cleaning', 'laundry',
    'cooking', 'appointment', 'errand', 'workout', 'travel',
  ],
}

// ---------------------------------------------------------------------------
// Consequence templates
// ---------------------------------------------------------------------------

const CONSEQUENCES: Record<SubCategory, string[]> = {
  career: [
    'Missed career opportunity',
    'Reduced interview chances',
    'Delayed professional growth',
  ],
  academic: [
    'Reduced academic performance',
    'Potential grade impact',
    'Delayed project progress',
  ],
  meetings: [
    'Missed information',
    'Communication breakdown',
    'Delayed coordination',
  ],
  finance: [
    'Financial penalty risk',
    'Budget disruption',
    'Delayed financial goals',
  ],
  personal: [
    'Minor personal inconvenience',
    'Task accumulation',
    'Reduced personal organization',
  ],
}

// ---------------------------------------------------------------------------
// Stakeholder impact templates
// ---------------------------------------------------------------------------

const STAKEHOLDER_IMPACT: Record<SubCategory, string> = {
  career: 'Employers, recruiters, or professional contacts may be affected',
  academic: 'Professors, teammates, or academic advisors may be impacted',
  meetings: 'Team members and collaborators may miss critical updates',
  finance: 'Financial institutions or dependents may be affected',
  personal: 'Primarily affects personal productivity and well-being',
}

// ---------------------------------------------------------------------------
// Base impact level per sub-category
// ---------------------------------------------------------------------------

const BASE_IMPACT: Record<SubCategory, CommitmentImpactLevel> = {
  career: 'CRITICAL',
  academic: 'HIGH',
  meetings: 'MEDIUM',
  finance: 'HIGH',
  personal: 'LOW',
}

// ---------------------------------------------------------------------------
// Impact level ordering for boost comparisons
// ---------------------------------------------------------------------------

const IMPACT_ORDER: Record<CommitmentImpactLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
}

function maxImpact(
  a: CommitmentImpactLevel,
  b: CommitmentImpactLevel
): CommitmentImpactLevel {
  return IMPACT_ORDER[a] >= IMPACT_ORDER[b] ? a : b
}

// ---------------------------------------------------------------------------
// Category-to-default sub-category fallback
// ---------------------------------------------------------------------------

const CATEGORY_FALLBACK: Record<string, SubCategory> = {
  CAREER: 'career',
  ACADEMIC: 'academic',
  FINANCE: 'finance',
  PERSONAL: 'personal',
}

// ---------------------------------------------------------------------------
// Public API — ConsequenceMappingService
// ---------------------------------------------------------------------------

/**
 * Detect sub-category by scanning title + description for keywords.
 * Falls back to the Prisma `Category` enum value.
 */
function detectSubCategory(
  category: string,
  title: string,
  description: string | null
): SubCategory {
  const text = `${title} ${description ?? ''}`.toLowerCase()

  // Check keyword dictionaries in priority order
  const checkOrder: SubCategory[] = ['career', 'academic', 'finance', 'meetings', 'personal']

  for (const sub of checkOrder) {
    for (const keyword of KEYWORD_MAP[sub]) {
      if (text.includes(keyword)) {
        return sub
      }
    }
  }

  // Fallback to Prisma category
  return CATEGORY_FALLBACK[category] ?? 'personal'
}

/**
 * Calculate the impact level for a commitment.
 *
 * Uses the sub-category's base impact, then applies a priority boost:
 *  - CRITICAL priority → at least HIGH
 *  - HIGH priority     → at least MEDIUM
 */
export function calculateImpactLevel(
  category: string,
  priority: string,
  subCategory: SubCategory
): CommitmentImpactLevel {
  let impact = BASE_IMPACT[subCategory]

  // Priority boost
  if (priority === 'CRITICAL') {
    impact = maxImpact(impact, 'HIGH')
  } else if (priority === 'HIGH') {
    impact = maxImpact(impact, 'MEDIUM')
  }

  return impact
}

/**
 * Get the consequence strings for a sub-category and impact level.
 * Higher impact levels get an extra urgency consequence appended.
 */
export function generateConsequences(
  subCategory: SubCategory,
  impactLevel: CommitmentImpactLevel
): string[] {
  const base = [...CONSEQUENCES[subCategory]]

  if (impactLevel === 'CRITICAL') {
    base.push('Immediate action required to prevent lasting damage')
  } else if (impactLevel === 'HIGH') {
    base.push('Significant follow-up effort may be needed')
  }

  return base
}

/**
 * Get the stakeholder impact description for a sub-category.
 */
export function generateStakeholderImpact(
  subCategory: SubCategory,
  _impactLevel: CommitmentImpactLevel
): string {
  return STAKEHOLDER_IMPACT[subCategory]
}

/**
 * Build a human-readable explanation sentence.
 */
function buildExplanation(
  title: string,
  impactLevel: CommitmentImpactLevel,
  consequences: string[]
): string {
  const levelLabel = impactLevel.toLowerCase()
  const topConsequence = consequences[0]?.toLowerCase() ?? 'potential issues'

  return `"${title}" has ${levelLabel} impact. Failing this commitment may lead to ${topConsequence}.`
}

/**
 * Analyze a single commitment and produce a full ConsequenceAnalysis.
 *
 * This is the main entry point of the ConsequenceMappingService.
 */
export function analyzeCommitment(
  category: string,
  priority: string,
  title: string,
  description: string | null
): ConsequenceAnalysis {
  const subCategory = detectSubCategory(category, title, description)
  const impactLevel = calculateImpactLevel(category, priority, subCategory)
  const consequences = generateConsequences(subCategory, impactLevel)
  const stakeholderImpact = generateStakeholderImpact(subCategory, impactLevel)
  const explanation = buildExplanation(title, impactLevel, consequences)

  return {
    impactLevel,
    consequences,
    stakeholderImpact,
    explanation,
  }
}
