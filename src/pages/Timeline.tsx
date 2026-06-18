import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Gauge,
  CheckCircle,
  Snowflake,
  Sparkles,
  Clock,
  Users,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Calendar,
  User,
  Layers,
  Tag,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { HEAT_EVENT_LABELS, EVENT_STATUS_LABELS, EVENT_CATEGORY_LABELS, type Post, type DisposalRecord, type ReputationEvent, type HeatSnapshot } from '@/types'
import PostDetailModal from '@/components/PostDetailModal'

interface EventNode {
  id: string
  timestamp: string
  type: 'emerged' | 'heating' | 'peak' | 'disposed' | 'cooling'
  heatScore: number
  post?: Post
  snapshot?: HeatSnapshot
  disposal?: DisposalRecord
  description: string
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

function formatDuration(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hours >= 24) return `${Math.floor(hours / 24)}天${hours % 24}小时`
  if (hours > 0) return `${hours}小时${mins}分`
  return `${mins}分钟`
}

const EVENT_NODE_CONFIG: Record<string, {
  icon: typeof Flame
  color: string
  bg: string
  border: string
  dot: string
}> = {
  emerged: { icon: Sparkles, color: 'text-sky-400', bg: 'bg-sky-500/20', border: 'border-sky-500/40', dot: 'bg-sky-500' },
  heating: { icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', dot: 'bg-amber-500' },
  peak: { icon: Flame, color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', dot: 'bg-rose-500' },
  disposed: { icon: CheckCircle, color: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/40', dot: 'bg-violet-500' },
  cooling: { icon: Snowflake, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', dot: 'bg-emerald-500' },
}

const EVENT_STATUS_COLORS: Record<ReputationEvent['status'], { bg: string; text: string; border: string }> = {
  emerging: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
  escalating: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  peak: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  handling: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  cooling: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  resolved: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
}

const CATEGORY_COLORS: Record<ReputationEvent['category'], { bg: string; text: string; border: string }> = {
  product: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  brand: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  competitor: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  service: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
}

export default function Timeline() {
  const { events, getPostsForEvent, getDisposalByPostId, getHeatTimeline, getDisposalHistoryByPostId } = useStore()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(events[0]?.id || null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const selectedEvent = useMemo(() =>
    events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  )

  const eventPosts = useMemo(() =>
    selectedEvent ? getPostsForEvent(selectedEvent.id) : [],
    [selectedEvent, getPostsForEvent]
  )

  const eventTimeline = useMemo<EventNode[]>(() => {
    if (!selectedEvent) return []
    const nodes: EventNode[] = []

    for (const post of eventPosts) {
      const snaps = getHeatTimeline(post.id)
      for (const snap of snaps) {
        nodes.push({
          id: `${post.id}-${snap.event}-${snap.timestamp}`,
          timestamp: snap.timestamp,
          type: snap.event as EventNode['type'],
          heatScore: snap.heatScore,
          post,
          snapshot: snap,
          description: snap.note || '',
        })
      }

      const disposal = getDisposalByPostId(post.id)
      if (disposal) {
        nodes.push({
          id: `${post.id}-disposal-${disposal.handledAt}`,
          timestamp: disposal.handledAt,
          type: 'disposed',
          heatScore: post.heatScore,
          post,
          disposal,
          description: disposal.conclusion || '处置记录',
        })
      }
    }

    return nodes.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [selectedEvent, eventPosts, getHeatTimeline, getDisposalByPostId])

  const stats = useMemo(() => {
    const total = events.length
    const peak = events.filter((e) => e.status === 'peak').length
    const escalating = events.filter((e) => e.status === 'escalating' || e.status === 'emerging').length
    const resolved = events.filter((e) => e.status === 'resolved' || e.status === 'cooling').length
    return { total, peak, escalating, resolved }
  }, [events])

  const peakHeat = selectedEvent ? selectedEvent.peakHeat : 0
  const postCount = eventPosts.length
  const duration = selectedEvent
    ? formatDuration(selectedEvent.firstSeen, selectedEvent.lastUpdated)
    : '-'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">舆情复盘</h1>
          <p className="mt-1 text-sm text-gray-500">
            按事件聚合复盘 · 共 {stats.total} 个事件 · {eventTimeline.length} 个时间节点
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-2 text-center">
            <div className="font-mono-data text-xl font-bold text-amber-400">{stats.escalating}</div>
            <div className="text-[10px] text-gray-600">发酵中</div>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] px-4 py-2 text-center">
            <div className="font-mono-data text-xl font-bold text-rose-400">{stats.peak}</div>
            <div className="text-[10px] text-gray-600">峰值期</div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-2 text-center">
            <div className="font-mono-data text-xl font-bold text-emerald-400">{stats.resolved}</div>
            <div className="text-[10px] text-gray-600">已降温</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto scrollbar-thin pr-1">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <Layers className="mr-1 inline h-3 w-3 text-amber-400" />
            事件列表
          </h3>
          {events.map((event) => {
            const isSelected = selectedEventId === event.id
            const statusCfg = EVENT_STATUS_COLORS[event.status]
            const catCfg = CATEGORY_COLORS[event.category]
            return (
              <button
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                className={cn(
                  'w-full overflow-hidden rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-amber-500/30 bg-amber-500/[0.04] shadow-lg'
                    : 'border-white/5 bg-[#12122a] hover:border-white/10'
                )}
              >
                <div className="p-3">
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-medium', statusCfg.bg, statusCfg.border, statusCfg.text)}>
                      {EVENT_STATUS_LABELS[event.status]}
                    </span>
                    <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px]', catCfg.bg, catCfg.border, catCfg.text)}>
                      {EVENT_CATEGORY_LABELS[event.category]}
                    </span>
                    <span className="ml-auto flex items-center gap-1 font-mono-data text-[10px] text-gray-600">
                      <Flame className="h-2.5 w-2.5 text-rose-400" />
                      <span className="font-bold text-rose-400">{event.peakHeat}</span>
                    </span>
                  </div>
                  <p className="mb-2 text-sm font-medium text-gray-200 leading-snug">
                    {event.name}
                  </p>
                  <p className="mb-2 line-clamp-2 text-[11px] text-gray-500 leading-relaxed">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-600">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {event.postIds.length} 帖
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDuration(event.firstSeen, event.lastUpdated)}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {event.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-gray-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="col-span-3 space-y-4">
          {selectedEvent ? (
            <>
              <div className="rounded-xl border border-white/5 bg-[#12122a] p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        EVENT_STATUS_COLORS[selectedEvent.status].bg,
                        EVENT_STATUS_COLORS[selectedEvent.status].border,
                        EVENT_STATUS_COLORS[selectedEvent.status].text
                      )}>
                        {EVENT_STATUS_LABELS[selectedEvent.status]}
                      </span>
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px]',
                        CATEGORY_COLORS[selectedEvent.category].bg,
                        CATEGORY_COLORS[selectedEvent.category].border,
                        CATEGORY_COLORS[selectedEvent.category].text
                      )}>
                        {EVENT_CATEGORY_LABELS[selectedEvent.category]}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-100">{selectedEvent.name}</h2>
                    <p className="mt-1.5 text-sm text-gray-400 max-w-2xl">{selectedEvent.description}</p>
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {selectedEvent.tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-gray-500">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center min-w-[240px]">
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="font-mono-data text-2xl font-bold text-rose-400">{peakHeat}</div>
                      <div className="text-[10px] text-gray-600">峰值热度</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="font-mono-data text-2xl font-bold text-amber-400">{postCount}</div>
                      <div className="text-[10px] text-gray-600">相关帖子</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="font-mono-data text-2xl font-bold text-sky-400">{duration}</div>
                      <div className="text-[10px] text-gray-600">持续时长</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5">
                  <h4 className="mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    热度趋势
                  </h4>
                  <div className="flex items-end gap-1 h-20 px-2">
                    {eventTimeline.length > 0 ? eventTimeline.map((node, i) => {
                      const maxH = peakHeat || 100
                      const hPct = Math.max(10, (node.heatScore / maxH) * 100)
                      const cfg = EVENT_NODE_CONFIG[node.type]
                      return (
                        <div
                          key={node.id}
                          className="group relative flex-1 min-w-0"
                          title={`${HEAT_EVENT_LABELS[node.type]} · 热度 ${node.heatScore}`}
                        >
                          <div
                            className={cn(
                              'mx-auto w-full rounded-t-sm transition-all group-hover:opacity-80',
                              cfg.dot + '/70'
                            )}
                            style={{ height: `${hPct}%`, minHeight: '8px' }}
                          />
                          <div className={cn(
                            'absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-[#12122a]',
                            cfg.dot
                          )} />
                        </div>
                      )
                    }) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-600">暂无时间节点数据</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#12122a] p-5 max-h-[calc(100vh-30rem)] overflow-y-auto scrollbar-thin">
                <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  事件时间线
                  <span className="ml-auto text-[10px] font-normal text-gray-600">
                    {eventTimeline.length} 个节点
                  </span>
                </h3>

                {eventTimeline.length > 0 ? (
                  <div className="relative pl-8">
                    <div className="absolute left-[11px] top-1 bottom-1 w-0.5 bg-gradient-to-b from-sky-500/40 via-rose-500/40 to-emerald-500/40 rounded-full" />

                    <div className="space-y-5">
                      {eventTimeline.map((node) => {
                        const config = EVENT_NODE_CONFIG[node.type]
                        const Icon = config.icon
                        return (
                          <div key={node.id} className="group relative">
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
                                  {HEAT_EVENT_LABELS[node.type]}
                                </span>
                                <span className="flex items-center gap-1 font-mono-data text-[11px] text-gray-500">
                                  <Gauge className="h-3 w-3" />
                                  热度 <span className="font-bold text-gray-300">{node.heatScore}</span>
                                </span>
                                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(node.timestamp).toLocaleString('zh-CN')}
                                </span>
                                {node.disposal?.assignee && (
                                  <span className="flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] text-violet-400">
                                    <Users className="h-2.5 w-2.5" />
                                    {node.disposal.assignee === 'pr' ? '公关团队' : node.disposal.assignee === 'cs' ? '客服团队' : '法务团队'}
                                  </span>
                                )}
                                {node.disposal?.handler && (
                                  <span className="flex items-center gap-1 text-[10px] text-gray-600">
                                    <User className="h-2.5 w-2.5" />
                                    {node.disposal.handler}
                                  </span>
                                )}
                                <span className="ml-auto text-[10px] text-gray-600">
                                  {formatTime(node.timestamp)}
                                </span>
                              </div>

                              {node.post && (
                                <div className="mb-2 flex items-start gap-3">
                                  <a
                                    href={node.post.originalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group/title min-w-0 flex-1"
                                  >
                                    <p className="text-sm font-medium text-gray-200 group-hover/title:text-amber-400 transition-colors">
                                      {node.post.title}
                                    </p>
                                    <p className="mt-1 text-[11px] text-gray-600">
                                      {node.post.source} · {node.post.forum} - {node.post.board}
                                    </p>
                                  </a>
                                  <div className="flex gap-1 shrink-0">
                                    <button
                                      onClick={() => setSelectedPost(node.post!)}
                                      className="rounded-md border border-white/5 bg-white/5 p-1.5 text-gray-500 transition-colors hover:border-amber-500/30 hover:text-amber-400"
                                      title="查看详情"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                    </button>
                                    <a
                                      href={node.post.originalUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-md border border-white/5 bg-white/5 p-1.5 text-gray-500 transition-colors hover:border-sky-500/30 hover:text-sky-400"
                                      title="跳转原帖"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                </div>
                              )}

                              {node.snapshot?.note && (
                                <p className="mb-1.5 text-[11px] text-gray-500 italic border-l-2 border-white/10 pl-2.5 py-0.5">
                                  {node.snapshot.note}
                                </p>
                              )}

                              {node.disposal?.conclusion && (
                                <div className="rounded-lg bg-violet-500/[0.05] border border-violet-500/10 px-3 py-2">
                                  <p className="text-[11px] text-violet-300">
                                    <span className="font-medium text-violet-400">处置结论：</span>
                                    {node.disposal.conclusion}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-gray-600">
                    该事件暂无时间节点数据
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/5 bg-[#12122a] p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                  相关帖子
                  <span className="ml-auto text-[10px] font-normal text-gray-600">
                    {eventPosts.length} 条
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {eventPosts.map((post) => {
                    const disposal = getDisposalByPostId(post.id)
                    return (
                      <div key={post.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 hover:border-white/10 transition-colors">
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                            post.heatScore >= 85 ? 'bg-rose-500' : post.heatScore >= 70 ? 'bg-orange-500' : 'bg-amber-500'
                          )} />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-[11px] font-medium text-gray-300">{post.title}</p>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-600">
                              <span>{post.forum}</span>
                              <span className="text-amber-400/70">热度 {post.heatScore}</span>
                              {disposal?.completed && (
                                <span className="text-emerald-400">已闭环</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-white/5 bg-[#12122a] p-12 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">请从左侧选择一个事件查看详情</p>
            </div>
          )}
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
