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

const ROLE_COLORS: Record<TeamRole, { bg: string; text: string; border: string }> = {
  pr: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  cs: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  legal: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
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

function applyPresetScope(posts: Post[], preset: FilterPreset | null): Post[] {
  if (!preset) return posts
  return posts.filter((p) => {
    if (preset.sentiment && p.sentiment !== preset.sentiment) return false
    if (preset.category && p.category !== preset.category) return false
    if (preset.replySpeed && p.replySpeed !== preset.replySpeed) return false
    if (preset.changeType && p.changeType !== preset.changeType) return false
    if (preset.forum && p.forum !== preset.forum) return false
    if (preset.board && p.board !== preset.board) return false
    return true
  })
}

export default function DailyReport() {
  const { posts, getDisposalByPostId, filterPresets } = useStore()
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)
  const [activeRole, setActiveRole] = useState<TeamRole | ''>('')
  const [activePresetId, setActivePresetId] = useState<string>('')

  const activePreset = useMemo(() =>
    filterPresets.find((p) => p.id === activePresetId) || null,
    [filterPresets, activePresetId]
  )

  const scopedPosts = useMemo(() => applyPresetScope(posts, activePreset), [posts, activePreset])

  const negativePosts = useMemo(() => scopedPosts.filter((p) => p.sentiment === 'negative'), [scopedPosts])
  const highRiskNegative = useMemo(() => negativePosts.filter(isHighRisk), [negativePosts])

  const unhandledHighRisk = useMemo(
    () => highRiskNegative.filter((p) => {
      const d = getDisposalByPostId(p.id)
      if (!d) return true
      if (d.completed) return false
      if (activeRole && d.assignee !== activeRole) return false
      return !d.completed
    }),
    [highRiskNegative, getDisposalByPostId, activeRole]
  )

  const handledHighRisk = useMemo(
    () => highRiskNegative.filter((p) => {
      const d = getDisposalByPostId(p.id)
      if (!d || !d.completed) return false
      if (activeRole && d.assignee !== activeRole) return false
      return true
    }),
    [highRiskNegative, getDisposalByPostId, activeRole]
  )

  const inProgressByRole = useMemo(() => {
    const grouped: Record<TeamRole, DisposalRecord[]> = { pr: [], cs: [], legal: [] }
    for (const post of highRiskNegative) {
      const d = getDisposalByPostId(post.id)
      if (!d || d.completed || !d.assignee) continue
      grouped[d.assignee].push(d)
    }
    return grouped
  }, [highRiskNegative, getDisposalByPostId])

  const slotAnalysis = useMemo(() => analyzeComplaintSlots(scopedPosts), [scopedPosts])

  const riskLevel = useMemo<RiskLevel>(() => {
    const urgentCount = unhandledHighRisk.filter((p) => p.heatScore >= 85).length
    const highCount = unhandledHighRisk.length
    if (urgentCount >= 2 || (urgentCount >= 1 && highCount >= 4)) return 'urgent'
    if (urgentCount >= 1 || highCount >= 3) return 'high'
    if (highCount >= 1) return 'medium'
    return 'low'
  }, [unhandledHighRisk])

  const urgentUnhandled = useMemo(() =>
    [...unhandledHighRisk]
      .sort((a, b) => b.heatScore - a.heatScore)
      .map((p) => ({
        post: p,
        record: getDisposalByPostId(p.id),
        risk: (p.heatScore >= 85 ? 'urgent' : 'high') as RiskLevel,
      })),
    [unhandledHighRisk, getDisposalByPostId]
  )

  const handledRiskPosts = useMemo(() =>
    [...handledHighRisk]
      .sort((a, b) => b.heatScore - a.heatScore)
      .map((p) => ({
        post: p,
        record: getDisposalByPostId(p.id) as DisposalRecord,
      })),
    [handledHighRisk, getDisposalByPostId]
  )

  const totalHighRisk = highRiskNegative.length
  const todayClosed = handledHighRisk.length
  const closeRate = totalHighRisk > 0 ? Math.round((todayClosed / totalHighRisk) * 100) : 100

  const riskConfig = RISK_CONFIG[riskLevel]
  const RiskIcon = riskConfig.icon
  const now = new Date()
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  const riskDescription = useMemo(() => {
    const urgentCount = unhandledHighRisk.filter((p) => p.heatScore >= 85).length
    const highCount = unhandledHighRisk.length
    const scopeLabel = activePreset ? `【${activePreset.name}】范围` : '全量'

    switch (riskLevel) {
      case 'urgent':
        return `${scopeLabel}内：紧急级未处理 ${urgentCount} 条（热度≥85），待处理高风险共 ${highCount} 条。建议立即启动响应，${activeRole ? `${TEAM_ROLE_LABELS[activeRole]}需` : '各团队'}同步介入。今日闭环率 ${closeRate}%。`
      case 'high':
        return `${scopeLabel}内：${urgentCount} 条紧急、${highCount} 条高风险未处理。建议公关团队重点跟进，${activePreset ? '需针对该场景' : ''}准备回应话术。闭环率 ${closeRate}%。`
      case 'medium':
        return `${scopeLabel}内：共 ${highCount} 条待处理高风险讨论，建议持续关注趋势，分配专人跟进。闭环率 ${closeRate}%。`
      case 'low':
        return `${scopeLabel}内：仅 ${highCount} 条待处理，无重大风险信号，保持日常监控。闭环率 ${closeRate}%。`
    }
  }, [riskLevel, unhandledHighRisk, activeRole, activePreset, closeRate])

  const handlePrint = () => window.print()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-100">
            日报生成
            {activePreset && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-normal text-amber-400">
                <Bookmark className="h-3 w-3" />
                {activePreset.name} 范围
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{dateStr} 口碑日报 · 覆盖 {scopedPosts.length} 条讨论</p>
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

      <div className="grid grid-cols-3 gap-4">
        <div className={cn('col-span-1 flex flex-col items-center justify-center rounded-xl border p-6 shadow-lg', riskConfig.bg, riskConfig.border, riskConfig.glow)}>
          <RiskIcon className={cn('mb-3 h-8 w-8', riskConfig.color)} />
          <span className={cn('font-mono-data text-3xl font-bold', riskConfig.color)}>{RISK_LABELS[riskLevel]}</span>
          <span className="mt-1 text-xs text-gray-500">整体风险等级</span>
          <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-rose-400" /> 待处理 {unhandledHighRisk.length}</span>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-400" /> 已闭环 {handledHighRisk.length}</span>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3 text-amber-400" /> 闭环率 {closeRate}%</span>
          </div>
          <div className="mt-4 flex gap-1.5">
            {(['low', 'medium', 'high', 'urgent'] as RiskLevel[]).map((level) => (
              <div key={level} className={cn('h-2 w-6 rounded-full transition-all', level === riskLevel ? RISK_DOT_COLORS[level] : level === 'low' ? 'bg-emerald-500/20' : level === 'medium' ? 'bg-amber-500/20' : level === 'high' ? 'bg-orange-500/20' : 'bg-rose-500/20')} />
            ))}
          </div>
        </div>

        <div className="col-span-2 rounded-xl border border-white/5 bg-[#12122a] p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-300">风险研判</h3>
          <p className="text-sm leading-relaxed text-gray-400">{riskDescription}</p>

          <div className="mt-3 mb-4">
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> 今日处置闭环进度</span>
              <span><span className="text-emerald-400 font-medium">{todayClosed}</span>/{totalHighRisk} 已闭环 ({closeRate}%)</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500" style={{ width: `${closeRate}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <TeamStatCard role="pr" records={inProgressByRole.pr} active={activeRole} onClick={() => setActiveRole(activeRole === 'pr' ? '' : 'pr')} />
            <TeamStatCard role="cs" records={inProgressByRole.cs} active={activeRole} onClick={() => setActiveRole(activeRole === 'cs' ? '' : 'cs')} />
            <TeamStatCard role="legal" records={inProgressByRole.legal} active={activeRole} onClick={() => setActiveRole(activeRole === 'legal' ? '' : 'legal')} />
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
              <AlertCircle className="h-4 w-4" />
              待处理高风险帖
              <span className="ml-auto text-[10px] font-normal text-gray-600">热度≥60 负面</span>
              <span className="ml-2 font-mono-data text-[11px] text-rose-400">{unhandledHighRisk.length}</span>
              {activeRole && (
                <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px]" style={ROLE_COLORS[activeRole]}>
                  <Users className="h-2.5 w-2.5" />
                  仅看 {TEAM_ROLE_LABELS[activeRole]}
                </span>
              )}
            </h3>
            <div className="space-y-2">
              {urgentUnhandled.length > 0 ? urgentUnhandled.map(({ post, record, risk }, i) => {
                const overdue = isOverdue(record?.deadline, record?.completed)
                return (
                  <a key={post.id} href={post.originalUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-lg border border-rose-500/10 bg-white/[0.02] p-3 transition-colors hover:border-rose-500/30 hover:bg-rose-500/5">
                    <span className="font-mono-data text-xs text-gray-700">{i + 1}</span>
                    <div className={cn('h-2 w-2 shrink-0 rounded-full animate-pulse', RISK_DOT_COLORS[risk])} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-200 group-hover:text-rose-300">{post.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                        <span>{post.source}</span><span>·</span><span>{post.forum}</span><span>·</span>
                        <span className={cn('font-medium', risk === 'urgent' ? 'text-rose-400' : 'text-orange-400')}>
                          {risk === 'urgent' ? '紧急 ' : '高风险 '}热度 {post.heatScore}
                        </span>
                        {record?.assignee && (
                          <span className={cn('flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px]', ROLE_COLORS[record.assignee].bg, ROLE_COLORS[record.assignee].border, ROLE_COLORS[record.assignee].text)}>
                            <Users className="h-2 w-2" />
                            {TEAM_ROLE_LABELS[record.assignee]}
                          </span>
                        )}
                        {record?.deadline && (
                          <span className={cn('flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px]', overdue ? 'bg-rose-500/10 text-rose-400' : 'bg-gray-500/10 text-gray-500')}>
                            <Calendar className="h-2 w-2" />
                            {overdue ? '已逾期' : new Date(record.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Link className="h-3 w-3" />
                      <span className="max-w-24 truncate">{getDomain(post.originalUrl)}</span>
                      <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </a>
                )
              }) : (
                <div className="flex items-center justify-center rounded-lg bg-white/[0.02] p-6 text-sm text-gray-500">
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  {activeRole ? `${TEAM_ROLE_LABELS[activeRole]}所有高风险帖均已处置闭环` : '所有高风险帖均已处置，无待处理项'}
                </div>
              )}
            </div>
          </div>

          {handledRiskPosts.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                今日已闭环高风险帖
                <span className="ml-auto text-[10px] font-normal text-gray-600">处置完成</span>
                <span className="ml-2 font-mono-data text-[11px] text-emerald-400">{handledRiskPosts.length}</span>
              </h3>
              <div className="space-y-2">
                {handledRiskPosts.map(({ post, record }, i) => (
                  <div key={post.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-start gap-3">
                      <span className="font-mono-data text-xs text-gray-700">{i + 1}</span>
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

function TeamStatCard({
  role, records, active, onClick,
}: { role: TeamRole; records: DisposalRecord[]; active: TeamRole | ''; onClick: () => void }) {
  const colors = ROLE_COLORS[role]
  const total = records.length
  const overdueCount = records.filter((r) => isOverdue(r.deadline, r.completed)).length
  const isActive = active === role

  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg border p-3 text-left transition-all',
        isActive ? `${colors.bg} ${colors.border} shadow-lg` : 'border-white/5 bg-white/[0.02] hover:border-white/10'
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Users className={cn('h-3.5 w-3.5', isActive ? colors.text : 'text-gray-500')} />
        <span className={cn('text-[11px] font-medium', isActive ? colors.text : 'text-gray-500')}>
          {TEAM_ROLE_LABELS[role]}
        </span>
        {overdueCount > 0 && (
          <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500/20 px-1 text-[9px] font-bold text-rose-400">
            {overdueCount}逾期
          </span>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        <span className={cn('font-mono-data text-2xl font-bold', isActive ? colors.text : 'text-gray-400')}>
          {total}
        </span>
        <span className="mb-1 text-[10px] text-gray-600">进行中</span>
      </div>
    </button>
  )
}
