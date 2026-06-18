import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import {
  AlertTriangle,
  ExternalLink,
  Printer,
  Shield,
  Flame,
  CheckCircle,
  AlertCircle,
  Link,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Hash,
  MessageSquare,
  Users,
  Calendar,
  Clock,
  Bookmark,
  Layers,
  CheckSquare,
  Inbox,
  Radio,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskLevel, Post, DisposalRecord, TeamRole, FilterPreset } from '@/types'
import { RISK_LABELS, DISPOSAL_LABELS, TEAM_ROLE_LABELS } from '@/types'

const RISK_CONFIG: Record<RiskLevel, {
  color: string
  bg: string
  border: string
  glow: string
  icon: typeof Shield
}> = {
  low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/10', icon: Shield },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-amber-500/10', icon: AlertTriangle },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', glow: 'shadow-orange-500/10', icon: AlertTriangle },
  urgent: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', glow: 'shadow-rose-500/10', icon: Flame },
}

const RISK_DOT_COLORS: Record<RiskLevel, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  urgent: 'bg-rose-500',
}

const ROLE_COLORS: Record<TeamRole, { bg: string; text: string; border: string; dot: string }> = {
  pr: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-500' },
  cs: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  legal: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500' },
}

const URGENCY_COLORS: Record<'high' | 'medium' | 'low', { bg: string; text: string; border: string; label: string }> = {
  high: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', label: '紧急' },
  medium: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', label: '高优' },
  low: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: '中优' },
}

const SLOT_PATTERNS: { slot: string; keywords: string[]; color: string }[] = [
  { slot: '死机', keywords: ['死机', '卡顿', '重启', '崩溃'], color: 'bg-rose-500' },
  { slot: '售后', keywords: ['售后', '推诿', '不处理', '退货', '换货', '保修'], color: 'bg-orange-500' },
  { slot: '发热', keywords: ['发热', '发烫', '高温', '过热'], color: 'bg-amber-500' },
  { slot: '客服', keywords: ['客服', '打不通', '无人响应', '排队'], color: 'bg-purple-500' },
  { slot: '裁员', keywords: ['裁员', '优化', '架构调整', '离职'], color: 'bg-rose-600' },
  { slot: 'WiFi', keywords: ['wifi', '断网', '连不上', '信号差'], color: 'bg-sky-500' },
  { slot: '降噪', keywords: ['降噪', '音质', '耳机'], color: 'bg-violet-500' },
  { slot: '续航', keywords: ['续航', '耗电', '电池', '充电'], color: 'bg-emerald-500' },
  { slot: '定价', keywords: ['定价', '价格', '贵', '背刺', '性价比'], color: 'bg-cyan-500' },
  { slot: 'CEO', keywords: ['ceo', '高管', '发言', '争议'], color: 'bg-pink-500' },
]

interface SlotAnalysis { slot: string; count: number; posts: Post[]; color: string }

function analyzeComplaintSlots(posts: Post[]): SlotAnalysis[] {
  const negativePosts = posts.filter((p) => p.sentiment === 'negative')
  const result: SlotAnalysis[] = []
  for (const pattern of SLOT_PATTERNS) {
    const matched = negativePosts.filter((post) => {
      const text = `${post.title} ${post.summary}`.toLowerCase()
      return pattern.keywords.some((k) => text.includes(k.toLowerCase()))
    })
    if (matched.length > 0) result.push({ slot: pattern.slot, count: matched.length, posts: matched, color: pattern.color })
  }
  return result.sort((a, b) => b.count - a.count)
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function isHighRisk(post: Post): boolean {
  return post.heatScore >= 60
}

function isOverdue(deadline?: string, completed?: boolean): boolean {
  return !!deadline && !completed && new Date(deadline) < new Date()
}

function formatDeadline(deadline?: string): string {
  if (!deadline) return '未设截止'
  const d = new Date(deadline)
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeLeft(deadline?: string): string {
  if (!deadline) return ''
  const now = new Date().getTime()
  const dl = new Date(deadline).getTime()
  const diff = dl - now
  if (diff < 0) return '已逾期'
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hours >= 24) return `${Math.floor(hours / 24)}天${hours % 24}小时`
  if (hours > 0) return `${hours}小时${mins}分`
  return `${mins}分钟`
}

type TeamView = TeamRole | 'unassigned' | 'all'

export default function DailyReport() {
  const { posts, getDisposalByPostId, filterPresets, getSortedTasksByRole, getPostsByPreset, getUnassignedDisposals } = useStore()
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<TeamView>('all')
  const [activePresetId, setActivePresetId] = useState<string>('')

  const activePreset = useMemo(() =>
    filterPresets.find((p) => p.id === activePresetId) || null,
    [filterPresets, activePresetId]
  )

  const scopedPosts = useMemo(() => getPostsByPreset(activePreset), [getPostsByPreset, activePreset])

  const negativePosts = useMemo(() => scopedPosts.filter((p) => p.sentiment === 'negative'), [scopedPosts])
  const highRiskNegative = useMemo(() => negativePosts.filter(isHighRisk), [negativePosts])

  const prTasks = useMemo(() => getSortedTasksByRole('pr').filter((t) => scopedPosts.some((p) => p.id === t.post.id)), [getSortedTasksByRole, scopedPosts])
  const csTasks = useMemo(() => getSortedTasksByRole('cs').filter((t) => scopedPosts.some((p) => p.id === t.post.id)), [getSortedTasksByRole, scopedPosts])
  const legalTasks = useMemo(() => getSortedTasksByRole('legal').filter((t) => scopedPosts.some((p) => p.id === t.post.id)), [getSortedTasksByRole, scopedPosts])
  const unassignedTasks = useMemo(() => getSortedTasksByRole('unassigned').filter((t) => scopedPosts.some((p) => p.id === t.post.id)), [getSortedTasksByRole, scopedPosts])

  const visibleTasks = useMemo(() => {
    if (activeView === 'all') {
      return [...unassignedTasks, ...prTasks, ...csTasks, ...legalTasks].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency]
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
        return b.post.heatScore - a.post.heatScore
      })
    }
    if (activeView === 'unassigned') return unassignedTasks
    if (activeView === 'pr') return prTasks
    if (activeView === 'cs') return csTasks
    if (activeView === 'legal') return legalTasks
    return []
  }, [activeView, prTasks, csTasks, legalTasks, unassignedTasks])

  const handledHighRisk = useMemo(() => {
    const latestByPost = new Map<string, DisposalRecord>()
    for (const post of highRiskNegative) {
      const d = getDisposalByPostId(post.id)
      if (d && d.completed) {
        if (activeView !== 'all' && activeView !== 'unassigned') {
          if (d.assignee !== activeView) continue
        }
        latestByPost.set(post.id, d)
      }
    }
    return highRiskNegative
      .filter((p) => latestByPost.has(p.id))
      .sort((a, b) => b.heatScore - a.heatScore)
      .map((p) => ({ post: p, record: latestByPost.get(p.id)! }))
  }, [highRiskNegative, getDisposalByPostId, activeView])

  const slotAnalysis = useMemo(() => analyzeComplaintSlots(scopedPosts), [scopedPosts])

  const unhandledCount = visibleTasks.length
  const riskLevel = useMemo<RiskLevel>(() => {
    const urgentCount = visibleTasks.filter((t) => t.urgency === 'high').length
    const highCount = visibleTasks.length
    if (urgentCount >= 2 || (urgentCount >= 1 && highCount >= 4)) return 'urgent'
    if (urgentCount >= 1 || highCount >= 3) return 'high'
    if (highCount >= 1) return 'medium'
    return 'low'
  }, [visibleTasks])

  const totalHighRisk = highRiskNegative.length
  const todayClosed = handledHighRisk.length
  const closeRate = totalHighRisk > 0 ? Math.round((todayClosed / totalHighRisk) * 100) : 100

  const riskConfig = RISK_CONFIG[riskLevel]
  const RiskIcon = riskConfig.icon
  const now = new Date()
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  const scopeLabel = activePreset ? `【${activePreset.name}】范围` : '全量'
  const viewLabel = activeView === 'all' ? '全部团队' : activeView === 'unassigned' ? '待分派' : TEAM_ROLE_LABELS[activeView]

  const riskDescription = useMemo(() => {
    const urgentCount = visibleTasks.filter((t) => t.urgency === 'high').length
    const highCount = visibleTasks.length

    switch (riskLevel) {
      case 'urgent':
        return `${scopeLabel}内：${viewLabel}有紧急级任务 ${urgentCount} 条，待处理共 ${highCount} 条。建议立即启动响应，相关团队同步介入。今日整体闭环率 ${closeRate}%。`
      case 'high':
        return `${scopeLabel}内：${viewLabel}有 ${urgentCount} 条紧急、共 ${highCount} 条待处理任务。请按优先级推进，重点关注高热度帖。闭环率 ${closeRate}%。`
      case 'medium':
        return `${scopeLabel}内：${viewLabel}共 ${highCount} 条待处理任务，建议持续关注趋势，按截止时间推进。闭环率 ${closeRate}%。`
      case 'low':
        return `${scopeLabel}内：${viewLabel}仅 ${highCount} 条待处理，无重大风险信号，保持日常监控。闭环率 ${closeRate}%。`
    }
  }, [riskLevel, visibleTasks, scopeLabel, viewLabel, closeRate])

  const handlePrint = () => window.print()

  const totalOverdue = prTasks.filter(t => t.isOverdue).length + csTasks.filter(t => t.isOverdue).length + legalTasks.filter(t => t.isOverdue).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-100">
            预警值班台
            {activePreset && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-normal text-amber-400">
                <Bookmark className="h-3 w-3" />
                {activePreset.name} 范围
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{dateStr} 口碑日报 · 覆盖 {scopedPosts.length} 条讨论 · {viewLabel}视图</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#12122a] p-1">
            <button
              onClick={() => setActivePresetId('')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                activePresetId === ''
                  ? 'bg-white/10 text-gray-200'
                  : 'text-gray-500 hover:text-gray-400'
              )}
            >
              <Layers className="h-3 w-3" />
              全量
            </button>
            {filterPresets.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePresetId(activePresetId === p.id ? '' : p.id)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  activePresetId === p.id
                    ? 'bg-white/10 text-gray-200'
                    : 'text-gray-500 hover:text-gray-400'
                )}
              >
                <Bookmark className="h-3 w-3" />
                {p.name}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#12122a] px-4 py-2 text-sm text-gray-300 transition-colors hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400"
          >
            <Printer className="h-4 w-4" />
            打印/导出
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <TaskQueueCard
          view="unassigned"
          title="待分派"
          icon={Inbox}
          count={unassignedTasks.length}
          overdue={0}
          active={activeView}
          onClick={() => setActiveView(activeView === 'unassigned' ? 'all' : 'unassigned')}
        />
        <TaskQueueCard
          view="pr"
          title="公关团队"
          icon={Radio}
          count={prTasks.length}
          overdue={prTasks.filter(t => t.isOverdue).length}
          active={activeView}
          onClick={() => setActiveView(activeView === 'pr' ? 'all' : 'pr')}
        />
        <TaskQueueCard
          view="cs"
          title="客服团队"
          icon={Users}
          count={csTasks.length}
          overdue={csTasks.filter(t => t.isOverdue).length}
          active={activeView}
          onClick={() => setActiveView(activeView === 'cs' ? 'all' : 'cs')}
        />
        <TaskQueueCard
          view="legal"
          title="法务团队"
          icon={Shield}
          count={legalTasks.length}
          overdue={legalTasks.filter(t => t.isOverdue).length}
          active={activeView}
          onClick={() => setActiveView(activeView === 'legal' ? 'all' : 'legal')}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className={cn('col-span-1 flex flex-col items-center justify-center rounded-xl border p-6 shadow-lg', riskConfig.bg, riskConfig.border, riskConfig.glow)}>
          <RiskIcon className={cn('mb-3 h-8 w-8', riskConfig.color)} />
          <span className={cn('font-mono-data text-3xl font-bold', riskConfig.color)}>{RISK_LABELS[riskLevel]}</span>
          <span className="mt-1 text-xs text-gray-500">当前视图风险</span>
          <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-rose-400" /> 待处理 {unhandledCount}</span>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-400" /> 已闭环 {todayClosed}</span>
          </div>
          <div className="mt-4 flex gap-1.5">
            {(['low', 'medium', 'high', 'urgent'] as RiskLevel[]).map((level) => (
              <div key={level} className={cn('h-2 w-6 rounded-full transition-all', level === riskLevel ? RISK_DOT_COLORS[level] : level === 'low' ? 'bg-emerald-500/20' : level === 'medium' ? 'bg-amber-500/20' : level === 'high' ? 'bg-orange-500/20' : 'bg-rose-500/20')} />
            ))}
          </div>
        </div>

        <div className="col-span-2 rounded-xl border border-white/5 bg-[#12122a] p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-300">处置研判</h3>
          <p className="text-sm leading-relaxed text-gray-400">{riskDescription}</p>

          <div className="mt-3 mb-4">
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> 今日整体闭环进度</span>
              <span><span className="text-emerald-400 font-medium">{todayClosed}</span>/{totalHighRisk} 已闭环 ({closeRate}%)</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500" style={{ width: `${closeRate}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-white/[0.03] p-2">
              <div className="font-mono-data text-lg font-bold text-gray-300">{unassignedTasks.length}</div>
              <div className="text-[9px] text-gray-600">待分派</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2">
              <div className="font-mono-data text-lg font-bold text-violet-400">{prTasks.length}</div>
              <div className="text-[9px] text-gray-600">公关处理中</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2">
              <div className="font-mono-data text-lg font-bold text-amber-400">{csTasks.length}</div>
              <div className="text-[9px] text-gray-600">客服处理中</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2">
              <div className="font-mono-data text-lg font-bold text-rose-400">{totalOverdue}</div>
              <div className="text-[9px] text-gray-600">已逾期</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 rounded-xl border border-white/5 bg-[#12122a] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Hash className="h-4 w-4 text-rose-400" />
            高频槽点归类
            <span className="ml-auto text-[10px] text-gray-600">点击查看对应原帖</span>
          </h3>
          <div className="space-y-2.5">
            {slotAnalysis.length > 0 ? slotAnalysis.map((item, i) => {
              const maxCount = slotAnalysis[0].count
              const widthPct = (item.count / maxCount) * 100
              const isExpanded = expandedSlot === item.slot
              return (
                <div key={item.slot} className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.04]" onClick={() => setExpandedSlot(isExpanded ? null : item.slot)}>
                    <span className="w-5 text-right font-mono-data text-xs text-gray-600">{i + 1}</span>
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
                    <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', item.color)} />
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-200">{item.slot}</span>
                        <span className="flex items-center gap-1 font-mono-data text-[11px] text-gray-500"><MessageSquare className="h-3 w-3" />{item.count} 帖</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className={cn('h-full rounded-full transition-all duration-500', item.color + '/80')} style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-white/5 bg-black/20 p-2.5 animate-fade-in">
                      <p className="mb-2 px-1 text-[10px] uppercase tracking-wider text-gray-600">相关原帖 ({item.posts.length})</p>
                      <div className="space-y-1.5">
                        {item.posts.map((post) => (
                          <a key={post.id} href={post.originalUrl} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 transition-colors hover:bg-white/[0.06]">
                            <div className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', post.heatScore >= 85 ? 'bg-rose-500 animate-pulse' : post.heatScore >= 60 ? 'bg-orange-500' : 'bg-amber-500')} />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-[11px] leading-snug text-gray-400 group-hover:text-gray-200">{post.title}</p>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-600">
                                <span>{post.forum}</span><span>·</span><span className="text-amber-400/70">热度 {post.heatScore}</span>
                              </div>
                            </div>
                            <ExternalLink className="h-3 w-3 shrink-0 text-gray-600 group-hover:text-amber-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            }) : (
              <div className="py-8 text-center text-sm text-gray-600">暂无足够负面数据</div>
            )}
          </div>
        </div>

        <div className="col-span-3 space-y-4">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-rose-400">
              <Zap className="h-4 w-4" />
              待处置队列
              {activeView !== 'all' && (
                <span className={cn(
                  'ml-2 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px]',
                  activeView === 'unassigned' ? 'border-gray-500/30 bg-gray-500/10 text-gray-400'
                    : activeView === 'pr' ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                    : activeView === 'cs' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                )}
                >
                  <Users className="h-2.5 w-2.5" />
                  {viewLabel}
                </span>
              )}
              <span className="ml-auto text-[10px] font-normal text-gray-600">按优先级排序</span>
              <span className="ml-2 font-mono-data text-[11px] text-rose-400">{visibleTasks.length}</span>
            </h3>
            <div className="space-y-2 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
              {visibleTasks.length > 0 ? visibleTasks.map((task, i) => {
                const { post, disposal, isOverdue, urgency } = task
                const urgencyCfg = URGENCY_COLORS[urgency]
                return (
                  <div key={`${post.id}-${i}`} className={cn(
                    'group rounded-lg border bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]',
                    isOverdue ? 'border-rose-500/40' : urgency === 'high' ? 'border-rose-500/20' : 'border-white/5'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className={cn('inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[9px] font-bold', urgencyCfg.bg, urgencyCfg.text, urgencyCfg.border)}>
                          {urgencyCfg.label}
                        </span>
                        <span className="font-mono-data text-[9px] text-gray-600">#{i + 1}</span>
                      </div>

                      <div className={cn('h-2 w-2 shrink-0 rounded-full',
                        urgency === 'high' ? 'bg-rose-500 animate-pulse' :
                        urgency === 'medium' ? 'bg-orange-500' : 'bg-amber-500'
                      )} />

                      <div className="min-w-0 flex-1">
                        <a href={post.originalUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-gray-200 hover:text-rose-300 block">
                          {post.title}
                        </a>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                          <span>{post.source}</span><span>·</span><span>{post.forum}</span><span>·</span>
                          <span className="font-medium text-amber-400/80">热度 {post.heatScore}</span>

                          {disposal?.assignee ? (
                            <span className={cn('flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px]', ROLE_COLORS[disposal.assignee].bg, ROLE_COLORS[disposal.assignee].border, ROLE_COLORS[disposal.assignee].text)}>
                              <Users className="h-2 w-2" />
                              {TEAM_ROLE_LABELS[disposal.assignee]}
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 rounded-full border border-gray-500/30 bg-gray-500/10 px-1.5 py-0.5 text-[9px] text-gray-400">
                              <Inbox className="h-2 w-2" />
                              待分派
                            </span>
                          )}

                          {disposal?.deadline ? (
                            <span className={cn('flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px]',
                              isOverdue ? 'bg-rose-500/10 text-rose-400' : 'bg-gray-500/10 text-gray-500'
                            )}>
                              <Clock className="h-2 w-2" />
                              {isOverdue ? `已逾期 · ${timeLeft(disposal.deadline)}` : `剩 ${timeLeft(disposal.deadline)}`}
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 rounded-full bg-gray-500/10 px-1.5 py-0.5 text-[9px] text-gray-500">
                              <Calendar className="h-2 w-2" />
                              未设截止
                            </span>
                          )}
                        </div>
                        {disposal?.conclusion && (
                          <p className="mt-1 line-clamp-1 text-[10px] text-gray-500">当前进展：{disposal.conclusion}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Link className="h-3 w-3" />
                        <span className="max-w-24 truncate hidden sm:inline">{getDomain(post.originalUrl)}</span>
                        <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div className="flex items-center justify-center rounded-lg bg-white/[0.02] p-6 text-sm text-gray-500">
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  该视图下所有任务均已处置闭环
                </div>
              )}
            </div>
          </div>

          {handledHighRisk.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                今日已闭环
                <span className="ml-auto text-[10px] font-normal text-gray-600">处置完成</span>
                <span className="ml-2 font-mono-data text-[11px] text-emerald-400">{handledHighRisk.length}</span>
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                {handledHighRisk.map(({ post, record }, i) => (
                  <div key={post.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-start gap-3">
                      <span className="font-mono-data text-xs text-gray-700 mt-0.5">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="line-clamp-1 text-sm text-gray-300">{post.title}</p>
                          <span className="shrink-0 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-medium text-orange-400">热度 {post.heatScore}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            record.status === 'customer_service' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            record.status === 'legal' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          )}>
                            {DISPOSAL_LABELS[record.status]}
                          </span>
                          {record.assignee && (
                            <span className={cn('flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px]', ROLE_COLORS[record.assignee].bg, ROLE_COLORS[record.assignee].border, ROLE_COLORS[record.assignee].text)}>
                              <Users className="h-2 w-2" />
                              {TEAM_ROLE_LABELS[record.assignee]}
                            </span>
                          )}
                          <span className="text-gray-600">{record.handler}</span>
                          {record.completedAt && (
                            <span className="text-gray-600">· 完成于 {new Date(record.completedAt).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                        {record.conclusion && (
                          <p className="mt-1 line-clamp-1 text-[11px] text-gray-500">结论：{record.conclusion}</p>
                        )}
                      </div>
                      <a href={post.originalUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded p-1 text-gray-600 transition-colors hover:text-emerald-400">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskQueueCard({
  view, title, icon: Icon, count, overdue, active, onClick,
}: {
  view: TeamView
  title: string
  icon: typeof Inbox
  count: number
  overdue: number
  active: TeamView
  onClick: () => void
}) {
  const isActive = active === view
  const color =
    view === 'unassigned' ? { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', dot: 'bg-gray-500' }
    : view === 'pr' ? ROLE_COLORS.pr
    : view === 'cs' ? ROLE_COLORS.cs
    : ROLE_COLORS.legal

  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 text-left transition-all',
        isActive ? `${color.bg} ${color.border} shadow-lg` : 'border-white/5 bg-white/[0.02] hover:border-white/10'
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', isActive ? color.bg : 'bg-white/5')}>
          <Icon className={cn('h-4 w-4', isActive ? color.text : 'text-gray-500')} />
        </div>
        <span className={cn('text-sm font-medium', isActive ? color.text : 'text-gray-500')}>
          {title}
        </span>
        {overdue > 0 && (
          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500/20 px-1.5 text-[10px] font-bold text-rose-400 animate-pulse">
            {overdue}逾期
          </span>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        <span className={cn('font-mono-data text-3xl font-bold', isActive ? color.text : 'text-gray-300')}>
          {count}
        </span>
        <span className="mb-1 text-[10px] text-gray-600">个任务</span>
      </div>
    </button>
  )
}
