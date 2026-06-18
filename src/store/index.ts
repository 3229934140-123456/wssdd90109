import { create } from 'zustand'
import type { Keyword, Post, DisposalRecord, DisposalStatus, KeywordCategory, FilterPreset, Sentiment, PostCategory, ReplySpeed, ChangeType, TeamRole, KeywordAdoption, HeatSnapshot } from '@/types'
import { MOCK_KEYWORDS, MOCK_POSTS } from '@/data/mock'

const STORAGE_KEYS = {
  keywords: 'reputation_keywords_v1',
  disposalRecords: 'reputation_disposals_v1',
  filterPresets: 'reputation_filter_presets_v1',
  keywordAdoptions: 'reputation_kw_adoptions_v1',
}

function generateHeatSnapshots(posts: Post[]): HeatSnapshot[] {
  const snapshots: HeatSnapshot[] = []
  for (const post of posts) {
    if (post.sentiment === 'negative' && post.heatScore >= 50) {
      const created = new Date(post.createdAt)
      snapshots.push({
        postId: post.id,
        timestamp: new Date(created.getTime() - 2 * 3600000).toISOString(),
        heatScore: Math.max(20, Math.floor(post.heatScore * 0.4)),
        event: 'emerged',
      })
      snapshots.push({
        postId: post.id,
        timestamp: new Date(created.getTime() - 1 * 3600000).toISOString(),
        heatScore: Math.max(35, Math.floor(post.heatScore * 0.7)),
        event: 'heating',
      })
      if (post.heatScore >= 70) {
        snapshots.push({
          postId: post.id,
          timestamp: created.toISOString(),
          heatScore: post.heatScore,
          event: 'peak',
        })
      }
      if (post.heatScore < 90) {
        snapshots.push({
          postId: post.id,
          timestamp: new Date(created.getTime() + 1 * 3600000).toISOString(),
          heatScore: Math.max(30, Math.floor(post.heatScore * 0.6)),
          event: 'cooling',
        })
      }
    }
  }
  return snapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

const DEFAULT_PRESETS: FilterPreset[] = [
  { id: 'preset_aftersales', name: '售后投诉', sentiment: 'negative', category: 'complaint', replySpeed: '', changeType: '', forum: '', board: '', builtIn: true },
  { id: 'preset_competitor', name: '竞品对比', sentiment: '', category: '', replySpeed: '', changeType: '', forum: '', board: '', builtIn: true },
  { id: 'preset_ceorisk', name: 'CEO风险', sentiment: 'negative', category: '', replySpeed: '', changeType: 'negative_surge', forum: '', board: '', builtIn: true },
]

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

interface AppState {
  keywords: Keyword[]
  posts: Post[]
  disposalRecords: DisposalRecord[]
  filterPresets: FilterPreset[]
  keywordAdoptions: KeywordAdoption[]
  heatSnapshots: HeatSnapshot[]

  addKeyword: (keyword: Keyword, trackAdoption?: boolean) => void
  removeKeyword: (id: string) => void
  updateKeywordCategory: (id: string, category: KeywordCategory) => void

  addDisposalRecord: (
    postId: string,
    status: DisposalStatus,
    conclusion: string,
    handler: string,
    assignee?: TeamRole,
    deadline?: string
  ) => void
  updateDisposalRecord: (
    postId: string,
    status: DisposalStatus,
    conclusion: string,
    assignee?: TeamRole,
    deadline?: string,
    completed?: boolean
  ) => void

  addFilterPreset: (preset: Omit<FilterPreset, 'id'>) => void
  removeFilterPreset: (id: string) => void

  getDisposalByPostId: (postId: string) => DisposalRecord | undefined
  getDisposalHistoryByPostId: (postId: string) => DisposalRecord[]
  getDisposalsByRole: (role: TeamRole) => DisposalRecord[]
  getPostsByKeyword: (keywordText: string) => Post[]
  getKeywordHitCount: (keywordText: string) => number
  getCategoryCoverage: (category: KeywordCategory) => number
  getUnmatchedHighHeatNegative: () => Post[]
  getSuggestedKeywords: () => { text: string; category: KeywordCategory; reason: string }[]
  getHeatTimeline: (postId: string) => HeatSnapshot[]
}

export const useStore = create<AppState>((set, get) => ({
  keywords: loadFromStorage(STORAGE_KEYS.keywords, [...MOCK_KEYWORDS]),
  posts: [...MOCK_POSTS],
  disposalRecords: loadFromStorage(STORAGE_KEYS.disposalRecords, []),
  filterPresets: loadFromStorage(STORAGE_KEYS.filterPresets, [...DEFAULT_PRESETS]),
  keywordAdoptions: loadFromStorage(STORAGE_KEYS.keywordAdoptions, []),
  heatSnapshots: generateHeatSnapshots(MOCK_POSTS),

  addKeyword: (keyword, trackAdoption = true) =>
    set((state) => {
      const next = [...state.keywords, keyword]
      saveToStorage(STORAGE_KEYS.keywords, next)
      const nextAdoptions = trackAdoption
        ? [
            ...state.keywordAdoptions,
            {
              id: `ad_${Date.now()}`,
              keyword: keyword.text,
              category: keyword.category,
              adoptedAt: new Date().toISOString(),
              coverageBefore: state.getCategoryCoverage(keyword.category),
            },
          ]
        : state.keywordAdoptions
      saveToStorage(STORAGE_KEYS.keywordAdoptions, nextAdoptions)
      return { keywords: next, keywordAdoptions: nextAdoptions }
    }),

  removeKeyword: (id) =>
    set((state) => {
      const next = state.keywords.filter((k) => k.id !== id)
      saveToStorage(STORAGE_KEYS.keywords, next)
      return { keywords: next }
    }),

  updateKeywordCategory: (id, category) =>
    set((state) => {
      const colorMap: Record<KeywordCategory, string> = {
        brand: '#f59e0b',
        product: '#10b981',
        typo: '#8b5cf6',
        competitor: '#ef4444',
      }
      const next = state.keywords.map((k) =>
        k.id === id ? { ...k, category, color: colorMap[category] } : k
      )
      saveToStorage(STORAGE_KEYS.keywords, next)
      return { keywords: next }
    }),

  addDisposalRecord: (postId, status, conclusion, handler, assignee, deadline) =>
    set((state) => {
      const now = new Date().toISOString()
      const next = [
        ...state.disposalRecords,
        {
          id: `dr_${Date.now()}`,
          postId,
          status,
          conclusion,
          handler,
          handledAt: now,
          assignee,
          deadline,
          completed: false,
        },
      ]
      saveToStorage(STORAGE_KEYS.disposalRecords, next)
      const post = state.posts.find((p) => p.id === postId)
      const nextSnapshots = post && post.heatScore >= 50
        ? [
            ...state.heatSnapshots,
            {
              postId,
              timestamp: now,
              heatScore: post.heatScore,
              event: 'disposed' as const,
              note: `${handler} 标记为 ${status}`,
            },
          ]
        : state.heatSnapshots
      return { disposalRecords: next, heatSnapshots: nextSnapshots }
    }),

  updateDisposalRecord: (postId, status, conclusion, assignee, deadline, completed) =>
    set((state) => {
      const existing = state.disposalRecords.find((r) => r.postId === postId)
      const now = new Date().toISOString()
      const next = [
        ...state.disposalRecords,
        {
          id: `dr_${Date.now()}`,
          postId,
          status,
          conclusion,
          handler: existing?.handler || '当前用户',
          handledAt: now,
          assignee: assignee ?? existing?.assignee,
          deadline: deadline ?? existing?.deadline,
          completed: completed ?? false,
          completedAt: completed ? now : undefined,
        },
      ]
      saveToStorage(STORAGE_KEYS.disposalRecords, next)
      const post = state.posts.find((p) => p.id === postId)
      const nextSnapshots = post && completed
        ? [
            ...state.heatSnapshots,
            {
              postId,
              timestamp: now,
              heatScore: Math.max(20, Math.floor((post.heatScore || 0) * 0.5)),
              event: 'cooling' as const,
              note: '处置完成，热度下降',
            },
          ]
        : state.heatSnapshots
      return { disposalRecords: next, heatSnapshots: nextSnapshots }
    }),

  getDisposalByPostId: (postId) =>
    get().disposalRecords
      .filter((r) => r.postId === postId)
      .sort((a, b) => new Date(b.handledAt).getTime() - new Date(a.handledAt).getTime())[0],

  getDisposalHistoryByPostId: (postId) =>
    get().disposalRecords
      .filter((r) => r.postId === postId)
      .sort((a, b) => new Date(b.handledAt).getTime() - new Date(a.handledAt).getTime()),

  getDisposalsByRole: (role) =>
    get().disposalRecords
      .filter((r) => r.assignee === role)
      .sort((a, b) => new Date(b.handledAt).getTime() - new Date(a.handledAt).getTime()),

  getPostsByKeyword: (keywordText) =>
    get().posts.filter(
      (p) =>
        p.title.toLowerCase().includes(keywordText.toLowerCase()) ||
        p.summary.toLowerCase().includes(keywordText.toLowerCase()) ||
        p.matchedKeywords.some((k) => k.toLowerCase() === keywordText.toLowerCase())
    ),

  getKeywordHitCount: (keywordText) =>
    get().posts.filter(
      (p) =>
        p.title.toLowerCase().includes(keywordText.toLowerCase()) ||
        p.summary.toLowerCase().includes(keywordText.toLowerCase()) ||
        p.matchedKeywords.some((k) => k.toLowerCase() === keywordText.toLowerCase())
    ).length,

  addFilterPreset: (preset) =>
    set((state) => {
      const next = [...state.filterPresets, { ...preset, id: `fp_${Date.now()}` }]
      saveToStorage(STORAGE_KEYS.filterPresets, next)
      return { filterPresets: next }
    }),

  removeFilterPreset: (id) =>
    set((state) => {
      const next = state.filterPresets.filter((p) => p.id !== id)
      saveToStorage(STORAGE_KEYS.filterPresets, next)
      return { filterPresets: next }
    }),

  getCategoryCoverage: (category) => {
    const { posts, keywords } = get()
    const categoryKeywords = keywords.filter((k) => k.category === category)
    const negativePosts = posts.filter((p) => p.sentiment === 'negative')
    if (negativePosts.length === 0) return 0
    let hitCount = 0
    for (const post of negativePosts) {
      for (const kw of categoryKeywords) {
        if (
          post.title.toLowerCase().includes(kw.text.toLowerCase()) ||
          post.summary.toLowerCase().includes(kw.text.toLowerCase()) ||
          post.matchedKeywords.some((k) => k.toLowerCase() === kw.text.toLowerCase())
        ) {
          hitCount++
          break
        }
      }
    }
    return Math.round((hitCount / negativePosts.length) * 100)
  },

  getUnmatchedHighHeatNegative: () => {
    const { posts, keywords } = get()
    return posts
      .filter((p) => p.sentiment === 'negative' && p.heatScore >= 50)
      .filter((p) => {
        return !keywords.some((kw) =>
          p.title.toLowerCase().includes(kw.text.toLowerCase()) ||
          p.summary.toLowerCase().includes(kw.text.toLowerCase()) ||
          p.matchedKeywords.some((k) => k.toLowerCase() === kw.text.toLowerCase())
        )
      })
      .sort((a, b) => b.heatScore - a.heatScore)
  },

  getSuggestedKeywords: () => {
    const { posts, keywords } = get()
    const existingTexts = new Set(keywords.map((k) => k.text.toLowerCase()))
    const suggestions: { text: string; category: KeywordCategory; reason: string }[] = []

    const negativePosts = posts.filter((p) => p.sentiment === 'negative')
    for (const post of negativePosts) {
      const text = `${post.title} ${post.summary}`.toLowerCase()
      if (text.includes('售后') && !existingTexts.has('售后')) {
        suggestions.push({ text: '售后', category: 'product', reason: `出现在"${post.title}"` })
        existingTexts.add('售后')
      }
      if ((text.includes('死机') || text.includes('卡顿')) && !existingTexts.has('死机')) {
        suggestions.push({ text: '死机', category: 'product', reason: `出现在"${post.title}"` })
        existingTexts.add('死机')
      }
      if (text.includes('发热') && !existingTexts.has('发热')) {
        suggestions.push({ text: '发热', category: 'product', reason: `出现在"${post.title}"` })
        existingTexts.add('发热')
      }
      if (text.includes('客服') && !existingTexts.has('客服')) {
        suggestions.push({ text: '客服', category: 'brand', reason: `出现在"${post.title}"` })
        existingTexts.add('客服')
      }
      if (text.includes('裁员') && !existingTexts.has('裁员')) {
        suggestions.push({ text: '裁员', category: 'brand', reason: `出现在"${post.title}"` })
        existingTexts.add('裁员')
      }
      if ((text.includes('wifi') || text.includes('wifi断') || text.includes('断网')) && !existingTexts.has('WiFi断连')) {
        suggestions.push({ text: 'WiFi断连', category: 'product', reason: `出现在"${post.title}"` })
        existingTexts.add('wifiduanlian')
      }
      if (text.includes('降噪') && !existingTexts.has('降噪')) {
        suggestions.push({ text: '降噪', category: 'product', reason: `出现在"${post.title}"` })
        existingTexts.add('jiangzao')
      }
    }

    const typoCandidates = [
      { text: '新星', reason: '常见错别字，用户可能将"星尘"误写为"新星"' },
      { text: '兴辰', reason: '常见错别字，用户可能将"星辰"误写为"兴辰"' },
    ]
    for (const t of typoCandidates) {
      if (!existingTexts.has(t.text.toLowerCase())) {
        suggestions.push({ text: t.text, category: 'typo', reason: t.reason })
      }
    }

    const competitorCandidates = [
      { text: '华米', reason: '潜在竞品品牌' },
      { text: '荣耀', reason: '潜在竞品品牌' },
    ]
    for (const c of competitorCandidates) {
      if (!existingTexts.has(c.text.toLowerCase())) {
        suggestions.push({ text: c.text, category: 'competitor', reason: c.reason })
      }
    }

    return suggestions.slice(0, 10)
  },

  getHeatTimeline: (postId) =>
    get().heatSnapshots
      .filter((s) => s.postId === postId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
}))
