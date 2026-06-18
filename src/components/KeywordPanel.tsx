import { useState } from 'react'
import { X, Plus, Tag, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react'
import { useStore } from '@/store'
import { KEYWORD_CATEGORY_LABELS, type KeywordCategory } from '@/types'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

const CATEGORY_COLORS: Record<KeywordCategory, string> = {
  brand: '#f59e0b',
  product: '#10b981',
  typo: '#8b5cf6',
  competitor: '#ef4444',
}

interface KeywordPanelProps {
  open: boolean
  onClose: () => void
}

export default function KeywordPanel({ open, onClose }: KeywordPanelProps) {
  const {
    keywords,
    addKeyword,
    removeKeyword,
    updateKeywordCategory,
    getKeywordHitCount,
    getPostsByKeyword,
  } = useStore()
  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState<KeywordCategory>('brand')
  const [expandedKw, setExpandedKw] = useState<string | null>(null)

  const handleAdd = () => {
    if (!newText.trim()) return
    addKeyword({
      id: `kw_${Date.now()}`,
      text: newText.trim(),
      category: newCategory,
      color: CATEGORY_COLORS[newCategory],
    })
    setNewText('')
  }

  const grouped = keywords.reduce<Record<KeywordCategory, typeof keywords>>(
    (acc, kw) => {
      if (!acc[kw.category]) acc[kw.category] = []
      acc[kw.category].push(kw)
      return acc
    },
    {} as Record<KeywordCategory, typeof keywords>
  )

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 h-screen w-[440px] animate-slide-in-right border-l border-white/5 bg-[#12122a] shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-6">
          <div>
            <h2 className="text-base font-bold text-gray-100">关键词词库</h2>
            <p className="text-[11px] text-gray-600">
              共 {keywords.length} 个关键词 · 数据自动保存
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-white/5 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="输入关键词..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as KeywordCategory)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-gray-300 outline-none"
            >
              {Object.entries(KEYWORD_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key} className="bg-[#12122a]">
                  {label}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="h-[calc(100vh-8rem)] overflow-y-auto p-4 scrollbar-thin">
          {(['brand', 'product', 'typo', 'competitor'] as KeywordCategory[]).map(
            (category) => {
              const items = grouped[category] || []
              if (items.length === 0) return null
              const totalHits = items.reduce((s, kw) => s + getKeywordHitCount(kw.text), 0)
              return (
                <div key={category} className="mb-5">
                  <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <span className="flex items-center gap-2">
                      <Tag className="h-3 w-3" style={{ color: CATEGORY_COLORS[category] }} />
                      {KEYWORD_CATEGORY_LABELS[category]}
                    </span>
                    <span className="font-mono-data text-[10px] text-gray-600">
                      {items.length} 词 · {totalHits} 次命中
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {items.map((kw) => {
                      const hitCount = getKeywordHitCount(kw.text)
                      const hitPosts = getPostsByKeyword(kw.text)
                      const isExpanded = expandedKw === kw.id
                      return (
                        <div
                          key={kw.id}
                          className="overflow-hidden rounded-xl border transition-colors"
                          style={{
                            borderColor: `${kw.color}25`,
                            backgroundColor: `${kw.color}08`,
                          }}
                        >
                          <div
                            className="flex cursor-pointer items-center gap-2 px-3 py-2"
                            onClick={() => setExpandedKw(isExpanded ? null : kw.id)}
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                              style={{ backgroundColor: `${kw.color}20`, color: kw.color }}
                            >
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </span>
                            <span className="flex-1 text-sm font-medium" style={{ color: kw.color }}>
                              {kw.text}
                            </span>
                            <select
                              value={kw.category}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateKeywordCategory(kw.id, e.target.value as KeywordCategory)}
                              className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400 outline-none"
                            >
                              {Object.entries(KEYWORD_CATEGORY_LABELS).map(([key, label]) => (
                                <option key={key} value={key} className="bg-[#12122a]">
                                  {label}
                                </option>
                              ))}
                            </select>
                            <span
                              className="flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono-data text-[10px]"
                              style={{ backgroundColor: `${kw.color}18`, color: kw.color }}
                            >
                              <MessageSquare className="h-2.5 w-2.5" />
                              {hitCount}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeKeyword(kw.id)
                              }}
                              className="ml-0.5 rounded-full p-0.5 text-gray-600 transition-colors hover:bg-white/10 hover:text-rose-400"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>

                          {isExpanded && hitPosts.length > 0 && (
                            <div className="border-t border-white/5 bg-black/20 p-2 animate-fade-in">
                              <p className="mb-2 px-2 text-[10px] uppercase tracking-wider text-gray-600">
                                命中讨论 ({hitPosts.length})
                              </p>
                              <div className="space-y-1.5">
                                {hitPosts.map((post: Post) => (
                                  <div
                                    key={post.id}
                                    className="group flex items-start gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5"
                                  >
                                    <div
                                      className={cn(
                                        'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                                        post.sentiment === 'positive'
                                          ? 'bg-emerald-500'
                                          : post.sentiment === 'negative'
                                          ? 'bg-rose-500'
                                          : 'bg-gray-500'
                                      )}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="line-clamp-2 text-[11px] leading-snug text-gray-400 group-hover:text-gray-300">
                                        {post.title}
                                      </p>
                                      <span className="text-[10px] text-gray-600">
                                        {post.forum} · 热度 {post.heatScore}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }
          )}
        </div>
      </div>
    </>
  )
}
