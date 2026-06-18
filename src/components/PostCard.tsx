import { cn } from '@/lib/utils'
import type { Post, PostCategory, Sentiment, DisposalRecord } from '@/types'
import { CATEGORY_LABELS, SENTIMENT_LABELS } from '@/types'
import { MessageCircle, Eye, TrendingUp, TrendingDown, Minus, Clock, CheckCircle2 } from 'lucide-react'

interface PostCardProps {
  post: Post
  onClick: () => void
  disposalRecord?: DisposalRecord
}

const SENTIMENT_STYLES: Record<Sentiment, { bar: string; badge: string; text: string }> = {
  positive: { bar: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', text: '正面' },
  neutral: { bar: 'bg-gray-500', badge: 'bg-gray-500/15 text-gray-400 border-gray-500/20', text: '中性' },
  negative: { bar: 'bg-rose-500', badge: 'bg-rose-500/15 text-rose-400 border-rose-500/20', text: '负面' },
}

const CATEGORY_STYLES: Record<PostCategory, string> = {
  complaint: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  help: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  vent: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  recommend: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const TREND_ICON = {
  rising: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
}

const DISPOSAL_BADGES: Record<string, { bg: string; text: string }> = {
  customer_service: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  legal: { bg: 'bg-rose-500/15', text: 'text-rose-400' },
  observe: { bg: 'bg-sky-500/15', text: 'text-sky-400' },
}

const DISPOSAL_NAMES: Record<string, string> = {
  customer_service: '客服跟进',
  legal: '法务关注',
  observe: '仅观察',
}

export default function PostCard({ post, onClick, disposalRecord }: PostCardProps) {
  const sentimentStyle = SENTIMENT_STYLES[post.sentiment]
  const TrendIcon = TREND_ICON[post.heatTrend]
  const timeAgo = getTimeAgo(post.createdAt)
  const disposalTime = disposalRecord ? getTimeAgo(disposalRecord.handledAt) : null

  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/5 bg-[#16162e] transition-all duration-200 hover:border-white/10 hover:bg-[#1a1a36] hover:shadow-lg hover:shadow-black/20"
    >
      <div className="flex">
        <div className={cn('w-1 shrink-0', sentimentStyle.bar)} />

        <div className="flex-1 p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-gray-200 transition-colors group-hover:text-white">
              {post.title}
            </h3>
            {disposalRecord && (
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  DISPOSAL_BADGES[disposalRecord.status]?.bg,
                  DISPOSAL_BADGES[disposalRecord.status]?.text
                )}
              >
                {DISPOSAL_NAMES[disposalRecord.status]}
              </span>
            )}
          </div>

          <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-500">
            {post.summary}
          </p>

          <div className="flex items-center gap-3 text-[11px] text-gray-600">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {post.replyCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.viewCount}
            </span>
            <span className={cn('flex items-center gap-0.5', post.heatTrend === 'rising' ? 'text-amber-500' : '')}>
              <TrendIcon className="h-3 w-3" />
              {post.heatScore}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
            <span className="text-gray-700">|</span>
            <span>{post.source}</span>
            <span className="text-gray-700">·</span>
            <span>{post.forum}</span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                sentimentStyle.badge
              )}
            >
              {SENTIMENT_LABELS[post.sentiment]}
            </span>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                CATEGORY_STYLES[post.category]
              )}
            >
              {CATEGORY_LABELS[post.category]}
            </span>
            {post.matchedKeywords.slice(0, 3).map((kw) => (
              <span
                key={kw}
                className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-gray-500"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {disposalRecord && disposalRecord.conclusion && (
        <div className="border-t border-white/5 bg-black/20 px-4 py-2.5">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <span className="text-emerald-400/80">已处置 · {disposalRecord.handler}</span>
                <span>·</span>
                <span>{disposalTime}</span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">
                {disposalRecord.conclusion}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}
