import { create } from 'zustand'
import type { Keyword, Post, DisposalRecord, DisposalStatus, KeywordCategory } from '@/types'
import { MOCK_KEYWORDS, MOCK_POSTS } from '@/data/mock'

const STORAGE_KEYS = {
  keywords: 'reputation_keywords_v1',
  disposalRecords: 'reputation_disposals_v1',
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

  addKeyword: (keyword: Keyword) => void
  removeKeyword: (id: string) => void
  updateKeywordCategory: (id: string, category: KeywordCategory) => void

  addDisposalRecord: (postId: string, status: DisposalStatus, conclusion: string, handler: string) => void
  updateDisposalRecord: (postId: string, status: DisposalStatus, conclusion: string) => void

  getDisposalByPostId: (postId: string) => DisposalRecord | undefined
  getDisposalHistoryByPostId: (postId: string) => DisposalRecord[]
  getPostsByKeyword: (keywordText: string) => Post[]
  getKeywordHitCount: (keywordText: string) => number
}

export const useStore = create<AppState>((set, get) => ({
  keywords: loadFromStorage(STORAGE_KEYS.keywords, [...MOCK_KEYWORDS]),
  posts: [...MOCK_POSTS],
  disposalRecords: loadFromStorage(STORAGE_KEYS.disposalRecords, []),

  addKeyword: (keyword) =>
    set((state) => {
      const next = [...state.keywords, keyword]
      saveToStorage(STORAGE_KEYS.keywords, next)
      return { keywords: next }
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

  addDisposalRecord: (postId, status, conclusion, handler) =>
    set((state) => {
      const next = [
        ...state.disposalRecords,
        {
          id: `dr_${Date.now()}`,
          postId,
          status,
          conclusion,
          handler,
          handledAt: new Date().toISOString(),
        },
      ]
      saveToStorage(STORAGE_KEYS.disposalRecords, next)
      return { disposalRecords: next }
    }),

  updateDisposalRecord: (postId, status, conclusion) =>
    set((state) => {
      const existing = state.disposalRecords.find((r) => r.postId === postId)
      const next = [
        ...state.disposalRecords,
        {
          id: `dr_${Date.now()}`,
          postId,
          status,
          conclusion,
          handler: existing?.handler || '当前用户',
          handledAt: new Date().toISOString(),
        },
      ]
      saveToStorage(STORAGE_KEYS.disposalRecords, next)
      return { disposalRecords: next }
    }),

  getDisposalByPostId: (postId) =>
    get().disposalRecords
      .filter((r) => r.postId === postId)
      .sort((a, b) => new Date(b.handledAt).getTime() - new Date(a.handledAt).getTime())[0],

  getDisposalHistoryByPostId: (postId) =>
    get().disposalRecords
      .filter((r) => r.postId === postId)
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
}))
