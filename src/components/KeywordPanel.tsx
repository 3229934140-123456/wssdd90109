import { useState } from 'react'
import { X, Plus, Tag } from 'lucide-react'
import { useStore } from '@/store'
import { KEYWORD_CATEGORY_LABELS, type KeywordCategory } from '@/types'
import { cn } from '@/lib/utils'

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
  const { keywords, addKeyword, removeKeyword } = useStore()
  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState<KeywordCategory>('brand')

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
      <div className="fixed right-0 top-0 z-50 h-screen w-96 animate-slide-in-right border-l border-white/5 bg-[#12122a] shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-6">
          <h2 className="text-base font-bold text-gray-100">关键词管理</h2>
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
              return (
                <div key={category} className="mb-5">
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <Tag className="h-3 w-3" style={{ color: CATEGORY_COLORS[category] }} />
                    {KEYWORD_CATEGORY_LABELS[category]}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((kw) => (
                      <span
                        key={kw.id}
                        className="group flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all"
                        style={{
                          color: kw.color,
                          borderColor: `${kw.color}30`,
                          backgroundColor: `${kw.color}10`,
                        }}
                      >
                        {kw.text}
                        <button
                          onClick={() => removeKeyword(kw.id)}
                          className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
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
