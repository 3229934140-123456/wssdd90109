export type KeywordCategory = 'brand' | 'product' | 'typo' | 'competitor'

export interface Keyword {
  id: string
  text: string
  category: KeywordCategory
  color: string
}

export type Sentiment = 'positive' | 'neutral' | 'negative'
export type PostCategory = 'complaint' | 'help' | 'vent' | 'recommend'
export type HeatTrend = 'rising' | 'stable' | 'declining'
export type ChangeType = 'new' | 'hot' | 'negative_surge'
export type ReplySpeed = 'fast' | 'medium' | 'slow'

export interface Post {
  id: string
  title: string
  source: string
  forum: string
  board: string
  sentiment: Sentiment
  category: PostCategory
  replyCount: number
  viewCount: number
  heatScore: number
  heatTrend: HeatTrend
  changeType: ChangeType
  summary: string
  originalUrl: string
  replySpeed: ReplySpeed
  createdAt: string
  matchedKeywords: string[]
}

export type DisposalStatus = 'customer_service' | 'legal' | 'observe'
export type TeamRole = 'pr' | 'cs' | 'legal'

export interface DisposalRecord {
  id: string
  postId: string
  status: DisposalStatus
  conclusion: string
  handler: string
  handledAt: string
  assignee?: TeamRole
  deadline?: string
  completed?: boolean
  completedAt?: string
}

export interface KeywordAdoption {
  id: string
  keyword: string
  category: KeywordCategory
  adoptedAt: string
  coverageBefore?: number
  coverageAfter?: number
}

export interface HeatSnapshot {
  postId: string
  timestamp: string
  heatScore: number
  event: 'emerged' | 'heating' | 'peak' | 'disposed' | 'cooling'
  note?: string
}

export interface FilterPreset {
  id: string
  name: string
  sentiment: Sentiment | ''
  category: PostCategory | ''
  replySpeed: ReplySpeed | ''
  changeType: ChangeType | ''
  forum: string
  board: string
  builtIn?: boolean
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'urgent'

export interface DailyReport {
  id: string
  date: string
  topComplaints: { keyword: string; count: number }[]
  typicalPosts: { postId: string; title: string; url: string; riskLevel: RiskLevel }[]
  riskLevel: RiskLevel
  riskDescription: string
}

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  complaint: '投诉',
  help: '求助',
  vent: '吐槽',
  recommend: '推荐',
}

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: '正面',
  neutral: '中性',
  negative: '负面',
}

export const DISPOSAL_LABELS: Record<DisposalStatus, string> = {
  customer_service: '需客服跟进',
  legal: '需法务关注',
  observe: '仅观察',
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  urgent: '紧急',
}

export const KEYWORD_CATEGORY_LABELS: Record<KeywordCategory, string> = {
  brand: '品牌名',
  product: '产品别名',
  typo: '常见错别字',
  competitor: '竞品词',
}

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  pr: '公关团队',
  cs: '客服团队',
  legal: '法务团队',
}

export const HEAT_EVENT_LABELS: Record<'emerged' | 'heating' | 'peak' | 'disposed' | 'cooling', string> = {
  emerged: '初次出现',
  heating: '热度上升',
  peak: '热度峰值',
  disposed: '介入处置',
  cooling: '热度降温',
}
