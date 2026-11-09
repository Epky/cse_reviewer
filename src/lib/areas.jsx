import {
  Calculator,
  FolderCog,
  Landmark,
  MessageSquareText,
  Puzzle,
} from 'lucide-react'

export const AREA_ALIASES = {
  'Verbal Ability': 'English',
  'Numerical Ability': 'Math',
  'Analytical Ability': 'Logic & Reasoning',
  'Clerical Ability': 'Clerical',
  'General Information': 'General Knowledge (GK)',
}

export function canonicalArea(area) {
  if (!area) return ''
  return AREA_ALIASES[area] || area
}

export const AREA_META = {
  English: {
    short: 'English',
    icon: MessageSquareText,
    color: '#7c3aed',
    soft: '#f3e8ff',
    description: 'Grammar, vocabulary, reading comprehension, analogy',
  },
  Math: {
    short: 'Math',
    icon: Calculator,
    color: '#0284c7',
    soft: '#e0f2fe',
    description: 'Basic operations, word problems, number series',
  },
  'Logic & Reasoning': {
    short: 'Logic & Reasoning',
    icon: Puzzle,
    color: '#d97706',
    soft: '#fef3c7',
    description: 'Abstract reasoning, logic, data interpretation',
  },
  Clerical: {
    short: 'Clerical',
    icon: FolderCog,
    color: '#db2777',
    soft: '#fce7f3',
    description: 'Filing, spelling, error detection, clerical operations',
  },
  'General Knowledge (GK)': {
    short: 'GK',
    icon: Landmark,
    color: '#059669',
    soft: '#d1fae5',
    description: 'Constitution, history, labor code, environment, current events',
  },
}

export function areaMeta(area) {
  const canonical = canonicalArea(area)
  return (
    AREA_META[canonical] ||
    AREA_META[area] || {
      short: area || 'Study',
      icon: Landmark,
      color: '#475569',
      soft: '#e2e8f0',
      description: 'Study materials',
    }
  )
}
