import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import {
  Flame,
  TrendingUp,
  Gauge,
  CheckCircle,
  Snowflake,
  Sparkle,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Calendar,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { HEAT_EVENT_LABELS, type Post, type DisposalRecord } from '@/types'
import PostDetailModal from '@/components/PostDetailModal'

interface TimelineEvent {
  id: string
  post: Post
  snapshot: { timestamp: string; heatScore: number; event: string; note?: string }
  disposal?: DisposalRecord
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const EVENT_CONFIG: Record<string, {
  icon: typeof Flame
  color: string
  bg: string
  border: string
}> = {
  emerged: { icon: Sparkle, color: 'text-sky-400', bg: 'bg-sky-500/20', border: 'border-sky-500/40' },
  heating: { icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40' },
  peak: { icon: Flame, color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40' },
  disposed: { icon: CheckCircle, color: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/40' },
  cooling: { icon: Snowflake, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
}

export default function Timeline() {
  const { posts, heatSnapshots, getDisposalHistoryByPostId, getDisposalByPostId } = useStore()
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const highRiskPosts = useMemo(() => {
    return posts
      .filter((p) => p.sentiment === 'negative' && p.heatScore >= 50)
      .sort((a, b) => b.heatScore - a.heatScore)
  }, [posts])

  const allEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = []
    for (const snap of heatSnapshots) {
      const post = posts.find((p) => p.id === snap.postId)
      if (!post) continue
      const disposal = snap.event === 'disposed'
        ? getDisposalHistoryByPostId(snap.postId).find(
            (r) => new Date(r.handledAt).getTime() - new Date(snap.timestamp).getTime() < 60000
          ) || getDisposalByPostId(snap.postId)
        : undefined
      events.push({
        id: `${snap.postId}-${snap.event}-${snap.timestamp}`,
        post,
        snapshot: snap,
        disposal,
      })
    }
    return events.sort(
      (a, b) => new Date(b.snapshot.timestamp).getTime() - new Date(a.snapshot.timestamp).getTime()
    )
  }, [heatSnapshots, posts, getDisposalHistoryByPostId, getDisposalByPostId])

  const getPostEvents = (postId: string) =>
    allEvents.filter((e) => e.post.id === postId).reverse()

  const totalPostCount = highRiskPosts.length
  const disposedCount = highRiskPosts.filter((p) => getDisposalByPostId(p.id)?.completed).length
  const inProgressCount = highRiskPosts.filter((p) => {
    const d = getDisposalByPostId(p.id)
    return d && !d.completed
  }).length
  const pendingCount = totalPostCount - disposedCount - inProgressCount

  const maxHeat = Math.max(...highRiskPosts.map((p) => p.heatScore), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">舆情复盘时间线</h1>
          <p className="mt-1 text-sm text-gray-500">
            高风险帖生命周期追踪 · 共 {totalPostCount} 个事件 · {allEvents.length} 个节点
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] px-4 py-2 text-center">
            <div className="font-mono-data text-xl font-bold text-rose-400">{pendingCount}</div>
            <div className="text-[10px] text-gray-600">待处置</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-2 text-center">
            <div className="font-mono-data text-xl font-bold text-amber-400">{inProgressCount}</div>
            <div className="text-[10px] text-gray-600">进行中</div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-2 text-center">
            <div className="font-mono-data text-xl font-bold text-emerald-400">{disposedCount}</div>
            <div className="text-[10px] text-gray-600">已闭环</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto scrollbar-thin pr-1">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <AlertCircle className="mr-1 inline h-3 w-3 text-rose-400" />
            高风险帖列表
          </h3>
          {highRiskPosts.map((post) => {
            const isExpanded = expandedPost === post.id
            const disposal = getDisposalByPostId(post.id)
            const events = getPostEvents(post.id)
            const heatPct = (post.heatScore / maxHeat) * 100
            const heatColor = post.heatScore >= 85 ? 'bg-rose-500' : post.heatScore >= 70 ? 'bg-orange-500' : 'bg-amber-500'
            const statusBadge = disposal?.completed
              ? { text: '已闭环', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
              : disposal
              ? { text: '进行中', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
              : { text: '待处置', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
            return (
              <div
                key={post.id}
                className={cn(
                  'overflow-hidden rounded-xl border transition-colors',
                  isExpanded
                    ? 'border-amber-500/30 bg-amber-500/[0.04]'
                    : 'border-white/5 bg-[#12122a] hover:border-white/10'
                )}
              >
                <div
                  className="cursor-pointer p-3"
                  onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
                    <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-medium', statusBadge.cls)}>
                      {statusBadge.text}
                    </span>
                    <span className="ml-auto flex items-center gap-1 font-mono-data text-[10px] text-gray-600">
                      <Gauge className="h-2.5 w-2.5" />
                      <span className={cn('font-bold', heatColor.replace('bg-', 'text-'))}>{post.heatScore}</span>
                    </span>
                  </div>
                  <p className="mb-2 line-clamp-2 text-[11px] leading-snug text-gray-300">
                    {post.title}
                  </p>
                  <div className="h-1 overflow-hidden rounded-full bg-white/5">
                    <div className={cn('h-full rounded-full transition-all', heatColor)} style={{ width: `${heatPct}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-600">
                    <span>{post.forum}</span>
                    <span>{events.length} 节点</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-white/5 bg-black/20 p-2.5 animate-fade-in">
                    <button
                      onClick={() => setSelectedPost(post)}
                      className="mb-1.5 flex w-full items-center gap-1.5 rounded-lg bg-white/[0.04] px-2 py-1.5 text-[10px] text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-amber-400"
                    >
                      <MessageSquare className="h-3 w-3" />
                      查看详情和处置
                    </button>
                    <div className="space-y-1.5">
                      {events.map((ev) => {
                        const config = EVENT_CONFIG[ev.snapshot.event]
                        const Icon = config.icon
                        return (
                          <div key={ev.id} className="flex items-start gap-1.5 rounded-md bg-white/[0.02] px-1.5 py-1.5">
                            <div className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', config.bg)}>
                              <Icon className={cn('h-2.5 w-2.5', config.color)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className={cn('text-[10px] font-medium', config.color)}>
                                  {HEAT_EVENT_LABELS[ev.snapshot.event as keyof typeof HEAT_EVENT_LABELS]}
                                </span>
                                <span className="ml-auto font-mono-data text-[9px] text-gray-600">
                                  热度 {ev.snapshot.heatScore}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-600">
                                {formatTime(ev.snapshot.timestamp)}
                              </div>
                              {ev.snapshot.note && (
                                <p className="mt-0.5 line-clamp-1 text-[10px] text-gray-500 italic">
                                  {ev.snapshot.note}
                                </p>
                              )}
                              {ev.disposal?.conclusion && (
                                <p className="mt-0.5 line-clamp-1 text-[10px] text-violet-400/80">
                                  结论：{ev.disposal.conclusion}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="col-span-3 rounded-xl border border-white/5 bg-[#12122a] p-5 max-h-[calc(100vh-14rem)] overflow-y-auto scrollbar-thin">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            全局事件时间线
            <span className="ml-auto text-[10px] font-normal text-gray-600">
              {allEvents.length} 个事件节点
            </span>
          </h3>

          <div className="relative pl-8">
            <div className="absolute left-[11px] top-1 bottom-1 w-0.5 bg-gradient-to-b from-sky-500/40 via-rose-500/40 to-emerald-500/40 rounded-full" />

            <div className="space-y-5">
              {allEvents.map((ev) => {
                const config = EVENT_CONFIG[ev.snapshot.event]
                const Icon = config.icon
                const disposal = ev.disposal
                return (
                  <div key={ev.id} className="group relative">
                    <div className={cn(
                      'absolute -left-[27px] top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#12122a] z-10',
                      config.bg,
                      config.border
                    )}>
                      <Icon className={cn('h-3 w-3', config.color)} />
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 transition-all hover:border-white/10 hover:bg-white/[0.04]">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          config.bg,
                          config.border,
                          config.color
                        )}>
                          {HEAT_EVENT_LABELS[ev.snapshot.event as keyof typeof HEAT_EVENT_LABELS]}
                        </span>
                        <span className="flex items-center gap-1 font-mono-data text-[11px] text-gray-500">
                          <Gauge className="h-3 w-3" />
                          热度 <span className="font-bold text-gray-300">{ev.snapshot.heatScore}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(ev.snapshot.timestamp).toLocaleString('zh-CN')}
                        </span>
                        {disposal && disposal.assignee && (
                          <span className="flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] text-violet-400">
                            <Users className="h-2.5 w-2.5" />
                            {disposal.assignee === 'pr' ? '公关' : disposal.assignee === 'cs' ? '客服' : '法务'}
                          </span>
                        )}
                        {disposal?.handler && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-600">
                            <User className="h-2.5 w-2.5" />
                            {disposal.handler}
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-gray-600">
                          {formatTime(ev.snapshot.timestamp)}
                        </span>
                      </div>

                      <div className="mb-2 flex items-start gap-3">
                        <a
                          href={ev.post.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/title min-w-0 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-sm font-medium text-gray-200 group-hover/title:text-amber-400 transition-colors">
                            {ev.post.title}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-600">
                            {ev.post.source} · {ev.post.forum} - {ev.post.board}
                          </p>
                        </a>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setSelectedPost(ev.post)}
                            className="rounded-md border border-white/5 bg-white/5 p-1.5 text-gray-500 transition-colors hover:border-amber-500/30 hover:text-amber-400"
                            title="查看详情"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <a
                            href={ev.post.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-white/5 bg-white/5 p-1.5 text-gray-500 transition-colors hover:border-sky-500/30 hover:text-sky-400"
                            title="跳转原帖"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>

                      {ev.snapshot.note && (
                        <p className="mb-1.5 text-[11px] text-gray-500 italic border-l-2 border-white/10 pl-2.5 py-0.5">
                          {ev.snapshot.note}
                        </p>
                      )}

                      {disposal?.conclusion && (
                        <div className="rounded-lg bg-violet-500/[0.05] border border-violet-500/10 px-3 py-2">
                          <p className="text-[11px] text-violet-300">
                            <span className="font-medium text-violet-400">处置结论：</span>
                            {disposal.conclusion}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          open={!!selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  )
}
