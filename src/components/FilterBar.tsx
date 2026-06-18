import { cn } from '@/lib/utils'
import type { Sentiment, PostCategory, ReplySpeed, ChangeType } from '@/types'
import { CATEGORY_LABELS, SENTIMENT_LABELS } from '@/types'
import { Filter, RotateCcw, ListFilter } from 'lucide-react'

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
}: FilterBarProps) {
  const hasFilters = sentiment || category || replySpeed || changeType || forum || board
  const availableBoards = forum
    ? boards.filter((_, idx) => {
        const unique = [...new Set(boards)]
        return true
      })
    : boards

  return (
    <div className="space-y-3 rounded-xl border border-white/5 bg-[#12122a] p-4">
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
