import { create } from 'zustand'
import type { Keyword, Post, DisposalRecord, DisposalStatus } from '@/types'
import { MOCK_KEYWORDS, MOCK_POSTS } from '@/data/mock'

interface AppState {
  keywords: Keyword[]
  posts: Post[]
  disposalRecords: DisposalRecord[]

  addKeyword: (keyword: Keyword) => void
  removeKeyword: (id: string) => void

  addDisposalRecord: (postId: string, status: DisposalStatus, conclusion: string, handler: string) => void
  updateDisposalRecord: (postId: string, status: DisposalStatus, conclusion: string) => void

  getDisposalByPostId: (postId: string) => DisposalRecord | undefined
}

export const useStore = create<AppState>((set, get) => ({
  keywords: [...MOCK_KEYWORDS],
  posts: [...MOCK_POSTS],
  disposalRecords: [],

  addKeyword: (keyword) =>
    set((state) => ({ keywords: [...state.keywords, keyword] })),

  removeKeyword: (id) =>
    set((state) => ({ keywords: state.keywords.filter((k) => k.id !== id) })),

  addDisposalRecord: (postId, status, conclusion, handler) =>
    set((state) => ({
      disposalRecords: [
        ...state.disposalRecords,
        {
          id: `dr_${Date.now()}`,
          postId,
          status,
          conclusion,
          handler,
          handledAt: new Date().toISOString(),
        },
      ],
    })),

  updateDisposalRecord: (postId, status, conclusion) =>
    set((state) => ({
      disposalRecords: state.disposalRecords.map((r) =>
        r.postId === postId
          ? { ...r, status, conclusion, handledAt: new Date().toISOString() }
          : r
      ),
    })),

  getDisposalByPostId: (postId) =>
    get().disposalRecords.find((r) => r.postId === postId),
}))
