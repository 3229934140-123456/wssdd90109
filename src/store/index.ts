import { create } from 'zustand'
import type { Keyword, Post, DisposalRecord, DisposalStatus, KeywordCategory, FilterPreset, Sentiment, PostCategory, ReplySpeed, ChangeType, TeamRole, KeywordAdoption, HeatSnapshot, ReputationEvent, EventStatus } from '@/types'
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
  { id: 'preset_aftersales', name: '售后投诉', sentiment: 'negative', category: 'complaint', replySpeed: '', changeType: '', forum: '', board: '', matchKeywords: ['售后', '客服', '投诉', '退换', '12315'], builtIn: true },
  { id: 'preset_competitor', name: '竞品对比', sentiment: '', category: '', replySpeed: '', changeType: '', forum: '', board: '', matchKeywords: ['云帆', '天际', '竞品', '对比', '性价比'], builtIn: true },
  { id: 'preset_ceorisk', name: 'CEO风险', sentiment: 'negative', category: '', replySpeed: '', changeType: 'negative_surge', forum: '', board: '', matchKeywords: ['CEO', '发言', '争议', '站着说话'], builtIn: true },
]

function generateEvents(posts: Post[]): ReputationEvent[] {
  const events: ReputationEvent[] = []

  const findPosts = (keywords: string[]) =>
    posts.filter((p) =>
      keywords.some(
        (k) =>
          p.title.toLowerCase().includes(k.toLowerCase()) ||
          p.summary.toLowerCase().includes(k.toLowerCase()) ||
          p.matchedKeywords.some((mk) => mk.toLowerCase() === k.toLowerCase())
      )
    )

  const ceoPosts = findPosts(['CEO', '发言', '争议'])
  if (ceoPosts.length > 0) {
    events.push({
      id: 'evt_ceo_controversy',
      name: 'CEO发言争议事件',
      description: 'CEO公开发言引发用户不满，被指"站着说话不腰疼"，多平台扩散讨论',
      category: 'brand',
      status: 'peak',
      peakHeat: Math.max(...ceoPosts.map((p) => p.heatScore)),
      postIds: ceoPosts.map((p) => p.id),
      firstSeen: ceoPosts.reduce((a, b) => (new Date(a.createdAt) < new Date(b.createdAt) ? a : b)).createdAt,
      lastUpdated: ceoPosts.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b)).createdAt,
      tags: ['CEO', '品牌声誉', '公关危机'],
    })
  }

  const complaintPosts = findPosts(['死机', '售后', '投诉', '推诿'])
  if (complaintPosts.length > 0) {
    events.push({
      id: 'evt_product_crash',
      name: '星尘Pro死机售后投诉',
      description: '用户反映星尘Pro频繁死机，售后推诿不处理，多地用户跟帖共鸣',
      category: 'product',
      status: 'escalating',
      peakHeat: Math.max(...complaintPosts.map((p) => p.heatScore)),
      postIds: complaintPosts.map((p) => p.id),
      firstSeen: complaintPosts.reduce((a, b) => (new Date(a.createdAt) < new Date(b.createdAt) ? a : b)).createdAt,
      lastUpdated: complaintPosts.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b)).createdAt,
      tags: ['产品质量', '售后', '投诉'],
    })
  }

  const competitorPosts = findPosts(['云帆', '天际', '竞品', '对比'])
  if (competitorPosts.length > 0) {
    events.push({
      id: 'evt_competitor_launch',
      name: '竞品新品发布对比战',
      description: '云帆发布新品正面竞争，定价低于星尘Pro 15%，引发用户"背刺"讨论',
      category: 'competitor',
      status: 'escalating',
      peakHeat: Math.max(...competitorPosts.map((p) => p.heatScore)),
      postIds: competitorPosts.map((p) => p.id),
      firstSeen: competitorPosts.reduce((a, b) => (new Date(a.createdAt) < new Date(b.createdAt) ? a : b)).createdAt,
      lastUpdated: competitorPosts.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b)).createdAt,
      tags: ['竞品', '价格战', '新品发布'],
    })
  }

  const layoffPosts = findPosts(['裁员', '内部人士', '30%'])
  if (layoffPosts.length > 0) {
    events.push({
      id: 'evt_layoff_rumor',
      name: '星辰科技裁员传闻',
      description: '网传星辰科技裁员30%，研发部门受影响最大，用户担忧售后保障',
      category: 'brand',
      status: 'escalating',
      peakHeat: Math.max(...layoffPosts.map((p) => p.heatScore)),
      postIds: layoffPosts.map((p) => p.id),
      firstSeen: layoffPosts.reduce((a, b) => (new Date(a.createdAt) < new Date(b.createdAt) ? a : b)).createdAt,
      lastUpdated: layoffPosts.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b)).createdAt,
      tags: ['裁员', '品牌', '内部消息'],
    })
  }

  const heatPosts = findPosts(['发热', '充电', '安全'])
  if (heatPosts.length > 0) {
    events.push({
      id: 'evt_charging_heat',
      name: '星尘Pro充电发热问题',
      description: '多位用户反馈快充时发热严重，部分超45度，有人担心电池安全',
      category: 'product',
      status: 'emerging',
      peakHeat: Math.max(...heatPosts.map((p) => p.heatScore)),
      postIds: heatPosts.map((p) => p.id),
      firstSeen: heatPosts.reduce((a, b) => (new Date(a.createdAt) < new Date(b.createdAt) ? a : b)).createdAt,
      lastUpdated: heatPosts.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b)).createdAt,
      tags: ['充电', '发热', '安全隐患'],
    })
  }

  return events.sort((a, b) => b.peakHeat - a.peakHeat)
}

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
  events: ReputationEvent[]

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
  getUnassignedDisposals: () => Post[]
  getSortedTasksByRole: (role: TeamRole | 'unassigned') => { post: Post; disposal?: DisposalRecord; isOverdue: boolean; urgency: 'high' | 'medium' | 'low' }[]
  getPostsByKeyword: (keywordText: string) => Post[]
  getKeywordHitCount: (keywordText: string) => number
  getCategoryCoverage: (category: KeywordCategory) => number
  getUnmatchedHighHeatNegative: () => Post[]
  getSuggestedKeywords: () => { text: string; category: KeywordCategory; reason: string; adopted: boolean }[]
  getHeatTimeline: (postId: string) => HeatSnapshot[]
  getPostsByPreset: (preset: FilterPreset | null) => Post[]
  getEventById: (id: string) => ReputationEvent | undefined
  getPostsForEvent: (eventId: string) => Post[]
  getEventPeakTimeline: (eventId: string) => HeatSnapshot[]
  getNewlyMatchedPosts: (keywordText: string) => Post[]
  getTotalCoverage: () => number
}

export const useStore = create<AppState>((set, get) => ({
  keywords: loadFromStorage(STORAGE_KEYS.keywords, [...MOCK_KEYWORDS]),
  posts: [...MOCK_POSTS],
  disposalRecords: loadFromStorage(STORAGE_KEYS.disposalRecords, []),
  filterPresets: loadFromStorage(STORAGE_KEYS.filterPresets, [...DEFAULT_PRESETS]),
  keywordAdoptions: loadFromStorage(STORAGE_KEYS.keywordAdoptions, []),
  heatSnapshots: generateHeatSnapshots(MOCK_POSTS),
  events: generateEvents(MOCK_POSTS),

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
    const suggestions: { text: string; category: KeywordCategory; reason: string; adopted: boolean }[] = []

    const negativePosts = posts.filter((p) => p.sentiment === 'negative')
    const rawSuggestions: { text: string; category: KeywordCategory; reason: string }[] = []

    for (const post of negativePosts) {
      const text = `${post.title} ${post.summary}`.toLowerCase()
      if (text.includes('售后') && !rawSuggestions.some((s) => s.text === '售后')) {
        rawSuggestions.push({ text: '售后', category: 'product', reason: `出现在"${post.title}"` })
      }
      if ((text.includes('死机') || text.includes('卡顿')) && !rawSuggestions.some((s) => s.text === '死机')) {
        rawSuggestions.push({ text: '死机', category: 'product', reason: `出现在"${post.title}"` })
      }
      if (text.includes('发热') && !rawSuggestions.some((s) => s.text === '发热')) {
        rawSuggestions.push({ text: '发热', category: 'product', reason: `出现在"${post.title}"` })
      }
      if (text.includes('客服') && !rawSuggestions.some((s) => s.text === '客服')) {
        rawSuggestions.push({ text: '客服', category: 'brand', reason: `出现在"${post.title}"` })
      }
      if (text.includes('裁员') && !rawSuggestions.some((s) => s.text === '裁员')) {
        rawSuggestions.push({ text: '裁员', category: 'brand', reason: `出现在"${post.title}"` })
      }
      if ((text.includes('wifi') || text.includes('wifi断') || text.includes('断网')) && !rawSuggestions.some((s) => s.text === 'WiFi断连')) {
        rawSuggestions.push({ text: 'WiFi断连', category: 'product', reason: `出现在"${post.title}"` })
      }
      if (text.includes('降噪') && !rawSuggestions.some((s) => s.text === '降噪')) {
        rawSuggestions.push({ text: '降噪', category: 'product', reason: `出现在"${post.title}"` })
      }
    }

    const typoCandidates = [
      { text: '新星', reason: '常见错别字，用户可能将"星尘"误写为"新星"' },
      { text: '兴辰', reason: '常见错别字，用户可能将"星辰"误写为"兴辰"' },
    ]
    for (const t of typoCandidates) {
      if (!rawSuggestions.some((s) => s.text === t.text)) {
        rawSuggestions.push({ text: t.text, category: 'typo', reason: t.reason })
      }
    }

    const competitorCandidates = [
      { text: '华米', reason: '潜在竞品品牌' },
      { text: '荣耀', reason: '潜在竞品品牌' },
    ]
    for (const c of competitorCandidates) {
      if (!rawSuggestions.some((s) => s.text === c.text)) {
        rawSuggestions.push({ text: c.text, category: 'competitor', reason: c.reason })
      }
    }

    for (const s of rawSuggestions) {
      suggestions.push({
        ...s,
        adopted: existingTexts.has(s.text.toLowerCase()),
      })
    }

    return suggestions.slice(0, 10)
  },

  getHeatTimeline: (postId) =>
    get().heatSnapshots
      .filter((s) => s.postId === postId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),

  getUnassignedDisposals: () => {
    const { posts, disposalRecords } = get()
    const assignedPostIds = new Set(disposalRecords.filter((r) => r.assignee).map((r) => r.postId))
    return posts.filter((p) => p.sentiment === 'negative' && p.heatScore >= 70 && !assignedPostIds.has(p.id))
  },

  getSortedTasksByRole: (role) => {
    const { posts, disposalRecords } = get()
    const now = new Date()
    const tasks: { post: Post; disposal?: DisposalRecord; isOverdue: boolean; urgency: 'high' | 'medium' | 'low' }[] = []

    if (role === 'unassigned') {
      const assignedPostIds = new Set(disposalRecords.filter((r) => r.assignee).map((r) => r.postId))
      const unassigned = posts.filter((p) => p.sentiment === 'negative' && p.heatScore >= 70 && !assignedPostIds.has(p.id))
      for (const post of unassigned) {
        tasks.push({
          post,
          isOverdue: false,
          urgency: post.heatScore >= 90 ? 'high' : post.heatScore >= 80 ? 'medium' : 'low',
        })
      }
    } else {
      const roleRecords = disposalRecords.filter((r) => r.assignee === role && !r.completed)
      const latestByPost = new Map<string, DisposalRecord>()
      for (const r of roleRecords) {
        const existing = latestByPost.get(r.postId)
        if (!existing || new Date(r.handledAt) > new Date(existing.handledAt)) {
          latestByPost.set(r.postId, r)
        }
      }
      for (const [postId, disposal] of latestByPost) {
        const post = posts.find((p) => p.id === postId)
        if (!post) continue
        const isOverdue = disposal.deadline ? new Date(disposal.deadline) < now : false
        const urgency = post.heatScore >= 90 ? 'high' : post.heatScore >= 80 ? 'medium' : 'low'
        tasks.push({ post, disposal, isOverdue, urgency })
      }
    }

    return tasks.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 }
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      }
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
      if (a.disposal?.deadline && b.disposal?.deadline) {
        return new Date(a.disposal.deadline).getTime() - new Date(b.disposal.deadline).getTime()
      }
      return b.post.heatScore - a.post.heatScore
    })
  },

  getPostsByPreset: (preset) => {
    const { posts } = get()
    if (!preset) return posts
    return posts.filter((p) => {
      if (preset.sentiment && p.sentiment !== preset.sentiment) return false
      if (preset.category && p.category !== preset.category) return false
      if (preset.replySpeed && p.replySpeed !== preset.replySpeed) return false
      if (preset.changeType && p.changeType !== preset.changeType) return false
      if (preset.forum && !p.forum.includes(preset.forum)) return false
      if (preset.board && !p.board.includes(preset.board)) return false
      if (preset.matchKeywords && preset.matchKeywords.length > 0) {
        const hasMatch = preset.matchKeywords.some(
          (kw) =>
            p.title.toLowerCase().includes(kw.toLowerCase()) ||
            p.summary.toLowerCase().includes(kw.toLowerCase()) ||
            p.matchedKeywords.some((k) => k.toLowerCase() === kw.toLowerCase())
        )
        if (!hasMatch) return false
      }
      return true
    })
  },

  getEventById: (id) => get().events.find((e) => e.id === id),

  getPostsForEvent: (eventId) => {
    const event = get().events.find((e) => e.id === eventId)
    if (!event) return []
    return get().posts.filter((p) => event.postIds.includes(p.id))
  },

  getEventPeakTimeline: (eventId) => {
    const event = get().events.find((e) => e.id === eventId)
    if (!event) return []
    return get()
      .heatSnapshots.filter((s) => event.postIds.includes(s.postId))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  },

  getNewlyMatchedPosts: (keywordText) => {
    const { posts, keywords } = get()
    const otherKeywords = keywords.filter((k) => k.text.toLowerCase() !== keywordText.toLowerCase())
    return posts.filter((p) => {
      const matchesThisKw =
        p.title.toLowerCase().includes(keywordText.toLowerCase()) ||
        p.summary.toLowerCase().includes(keywordText.toLowerCase()) ||
        p.matchedKeywords.some((k) => k.toLowerCase() === keywordText.toLowerCase())
      const matchesOtherKw = otherKeywords.some(
        (kw) =>
          p.title.toLowerCase().includes(kw.text.toLowerCase()) ||
          p.summary.toLowerCase().includes(kw.text.toLowerCase()) ||
          p.matchedKeywords.some((k) => k.toLowerCase() === kw.text.toLowerCase())
      )
      return matchesThisKw && !matchesOtherKw
    })
  },

  getTotalCoverage: () => {
    const { posts, keywords } = get()
    const negativePosts = posts.filter((p) => p.sentiment === 'negative')
    if (negativePosts.length === 0) return 100
    let hitCount = 0
    for (const post of negativePosts) {
      for (const kw of keywords) {
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
}))
