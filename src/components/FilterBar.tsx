import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Sentiment, PostCategory, ReplySpeed, ChangeType, FilterPreset } from '@/types'
import { CATEGORY_LABELS, SENTIMENT_LABELS } from '@/types'
import { Filter, RotateCcw, ListFilter, Bookmark, Plus, X, BookmarkPlus } from 'lucide-react'
import { useStore } from '@/store'

interface FilterBarProps {
  sentiment: Sentiment | ''
  category: PostCategory | ''
  replySpeed: ReplySpeed | ''
  changeType: ChangeType | ''
  forum: string
  board: string
  resultCount: number
  onSentimentChange: (v: Sentiment | '') => void
  onCategoryChange: (v: PostCategory | '') => void
  onReplySpeedChange: (v: ReplySpeed | '') => void
  onChangeTypeChange: (v: ChangeType | '') => void
  onForumChange: (v: string) => void
  onBoardChange: (v: string) => void
  onReset: () => void
  forums: string[]
  boards: string[]
  onApplyPreset: (preset: FilterPreset) => void
}

const PILL_CLASS = 'rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer select-none'

export default function FilterBar({
  sentiment,
  category,
  replySpeed,
  changeType,
  forum,
  board,
  resultCount,
  onSentimentChange,
  onCategoryChange,
  onReplySpeedChange,
  onChangeTypeChange,
  onForumChange,
  onBoardChange,
  onReset,
  forums,
  boards,
  onApplyPreset,
}: FilterBarProps) {
  const { filterPresets, addFilterPreset, removeFilterPreset } = useStore()
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [presetName, setPresetName] = useState('')

  const hasFilters = sentiment || category || replySpeed || changeType || forum || board
  const availableBoards = forum ? boards.filter((_, idx) => {
    const unique = [...new Set(boards)]
    return true
  }) : boards

  const handleSavePreset = () => {
    if (!presetName.trim()) return
    addFilterPreset({
      name: presetName.trim(),
      sentiment,
      category,
      replySpeed,
      changeType,
      forum,
      board,
    })
    setPresetName('')
    setShowSaveInput(false)
  }

  const getPresetMatchCount = (preset: FilterPreset) => {
    let match = 0
    if (preset.sentiment === sentiment) match++
    if (preset.category === category) match++
    if (preset.replySpeed === replySpeed) match++
    if (preset.changeType === changeType) match++
    if (preset.forum === forum) match++
    if (preset.board === board) match++
    return match
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/5 bg-[#12122a] p-4">
      {filterPresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-white/5 pb-3">
          <div className="flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-gray-500" />
            <span className="mr-1 text-[11px] font-medium text-gray-500">筛选方案</span>
          </div>
          {filterPresets.map((preset) => {
            const isActive = getPresetMatchCount(preset) === 6
            return (
              <div
                key={preset.id}
                className={cn(
                  'group flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-all',
                  isActive
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : 'border-white/5 bg-white/[0.03] text-gray-400 hover:border-white/10 hover:text-gray-200'
                )}
              >
                <button
                  onClick={() => onApplyPreset(preset)}
                  className="flex items-center gap-1"
                >
                  {preset.builtIn && <span className="h-1 w-1 rounded-full bg-current opacity-60" />}
                  {preset.name}
                </button>
                {!preset.builtIn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFilterPreset(preset.id)
                    }}
                    className="ml-0.5 rounded-full p-0.5 text-gray-600 opacity-0 transition-all hover:text-rose-400 group-hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )
          })}

          {showSaveInput ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                placeholder="方案名称"
                className="w-24 rounded-full border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 text-[11px] text-amber-300 placeholder-gray-500 outline-none focus:border-amber-500/60"
              />
              <button
                onClick={handleSavePreset}
                className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 hover:bg-amber-500/30"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setShowSaveInput(false)
                  setPresetName('')
                }}
                className="rounded-full p-1 text-gray-500 hover:text-gray-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            hasFilters && (
              <button
                onClick={() => setShowSaveInput(true)}
                className="flex items-center gap-1 rounded-full border border-dashed border-white/10 px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:border-amber-500/30 hover:text-amber-400"
              >
                <BookmarkPlus className="h-3 w-3" />
                保存方案
              </button>
            )
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <Filter className="h-3.5 w-3.5" />
          筛选条件
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <ListFilter className="h-3 w-3" />
            <span className="font-mono-data text-amber-400/70">{resultCount}</span>
            条结果
          </span>
          {hasFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-300"
            >
              <RotateCcw className="h-3 w-3" />
              重置
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        <FilterRow label="情绪倾向">
          <Pill
            active={sentiment === ''}
            onClick={() => onSentimentChange('')}
            activeClass="bg-white/10 text-gray-200 border-white/20"
          >
            全部
          </Pill>
          {(['positive', 'neutral', 'negative'] as Sentiment[]).map((s) => (
            <Pill
              key={s}
              active={sentiment === s}
              onClick={() => onSentimentChange(sentiment === s ? '' : s)}
              activeClass={
                s === 'positive' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' :
                s === 'negative' ? 'bg-rose-500/15 text-rose-400 border-rose-500/40' :
                'bg-gray-500/15 text-gray-300 border-gray-500/40'
              }
            >
              {SENTIMENT_LABELS[s]}
            </Pill>
          ))}
        </FilterRow>

        <FilterRow label="内容分层">
          <Pill
            active={category === ''}
            onClick={() => onCategoryChange('')}
            activeClass="bg-white/10 text-gray-200 border-white/20"
          >
            全部
          </Pill>
          {(['complaint', 'help', 'vent', 'recommend'] as PostCategory[]).map((c) => (
            <Pill
              key={c}
              active={category === c}
              onClick={() => onCategoryChange(category === c ? '' : c)}
              activeClass={
                c === 'complaint' ? 'bg-rose-500/15 text-rose-400 border-rose-500/40' :
                c === 'help' ? 'bg-sky-500/15 text-sky-400 border-sky-500/40' :
                c === 'vent' ? 'bg-amber-500/15 text-amber-400 border-amber-500/40' :
                'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
              }
            >
              {CATEGORY_LABELS[c]}
            </Pill>
          ))}
        </FilterRow>

        <FilterRow label="变化类型">
          <Pill
            active={changeType === ''}
            onClick={() => onChangeTypeChange('')}
            activeClass="bg-white/10 text-gray-200 border-white/20"
          >
            全部
          </Pill>
          <Pill
            active={changeType === 'new'}
            onClick={() => onChangeTypeChange(changeType === 'new' ? '' : 'new')}
            activeClass="bg-sky-500/15 text-sky-400 border-sky-500/40"
          >
            新增讨论
          </Pill>
          <Pill
            active={changeType === 'hot'}
            onClick={() => onChangeTypeChange(changeType === 'hot' ? '' : 'hot')}
            activeClass="bg-amber-500/15 text-amber-400 border-amber-500/40"
          >
            热度上升
          </Pill>
          <Pill
            active={changeType === 'negative_surge'}
            onClick={() => onChangeTypeChange(changeType === 'negative_surge' ? '' : 'negative_surge')}
            activeClass="bg-rose-500/15 text-rose-400 border-rose-500/40"
          >
            负面集中
          </Pill>
        </FilterRow>

        <FilterRow label="回复速度">
          <Pill
            active={replySpeed === ''}
            onClick={() => onReplySpeedChange('')}
            activeClass="bg-white/10 text-gray-200 border-white/20"
          >
            全部
          </Pill>
          {(['fast', 'medium', 'slow'] as ReplySpeed[]).map((r) => (
            <Pill
              key={r}
              active={replySpeed === r}
              onClick={() => onReplySpeedChange(replySpeed === r ? '' : r)}
              activeClass="bg-amber-500/15 text-amber-400 border-amber-500/40"
            >
              {r === 'fast' ? '快速' : r === 'medium' ? '中等' : '缓慢'}
            </Pill>
          ))}
        </FilterRow>

        <FilterRow label="来源吧名">
          <select
            value={forum}
            onChange={(e) => {
              onForumChange(e.target.value)
              onBoardChange('')
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 outline-none transition-colors focus:border-amber-500/40"
          >
            <option value="">全部吧</option>
            {[...new Set(forums)].map((f) => (
              <option key={f} value={f} className="bg-[#12122a]">{f}</option>
            ))}
          </select>
        </FilterRow>

        <FilterRow label="论坛板块">
          <select
            value={board}
            onChange={(e) => onBoardChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 outline-none transition-colors focus:border-amber-500/40 disabled:opacity-50"
            disabled={!forum}
          >
            <option value="">全部板块</option>
            {[...new Set(availableBoards)].map((b) => (
              <option key={b} value={b} className="bg-[#12122a]">{b}</option>
            ))}
          </select>
          {!forum && (
            <span className="text-[11px] text-gray-600">请先选择吧名</span>
          )}
        </FilterRow>
      </div>
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-16 shrink-0 pt-1 text-[11px] text-gray-600">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Pill({
  active,
  onClick,
  activeClass,
  children,
}: {
  active: boolean
  onClick: () => void
  activeClass: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        PILL_CLASS,
        active
          ? activeClass
          : 'border-white/5 bg-transparent text-gray-500 hover:border-white/10 hover:text-gray-400'
      )}
    >
      {children}
    </button>
  )
}
