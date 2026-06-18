import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { STOP_WORDS } from '@/data/mock'
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
  Target,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskLevel, Post, DisposalRecord } from '@/types'
import { RISK_LABELS, DISPOSAL_LABELS } from '@/types'

const RISK_CONFIG: Record<RiskLevel, {
  color: string
  bg: string
  border: string
  glow: string
  ring: string
  icon: typeof Shield
}> = {
  low: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
    ring: 'ring-emerald-500/20',
    icon: Shield,
  },
  medium: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/10',
    ring: 'ring-amber-500/20',
    icon: AlertTriangle,
  },
  high: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-500/10',
    ring: 'ring-orange-500/20',
    icon: AlertTriangle,
  },
  urgent: {
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/10',
    ring: 'ring-rose-500/20',
    icon: Flame,
  },
}

const RISK_DOT_COLORS: Record<RiskLevel, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  urgent: 'bg-rose-500',
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

interface SlotAnalysis {
  slot: string
  count: number
  posts: Post[]
  color: string
}

function analyzeComplaintSlots(posts: Post[]): SlotAnalysis[] {
  const negativePosts = posts.filter((p) => p.sentiment === 'negative')
  const result: SlotAnalysis[] = []

  for (const pattern of SLOT_PATTERNS) {
    const matched = negativePosts.filter((post) => {
      const text = `${post.title} ${post.summary}`.toLowerCase()
      return pattern.keywords.some((k) => text.includes(k.toLowerCase()))
    })
    if (matched.length > 0) {
      result.push({ slot: pattern.slot, count: matched.length, posts: matched, color: pattern.color })
    }
  }

  return result.sort((a, b) => b.count - a.count)
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function isHighRisk(post: Post): boolean {
  return post.heatScore >= 60
}

export default function DailyReport() {
  const { posts, getDisposalByPostId } = useStore()
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)

  const negativePosts = useMemo(
    () => posts.filter((p) => p.sentiment === 'negative'),
    [posts]
  )

  const highRiskNegative = useMemo(
    () => negativePosts.filter(isHighRisk),
    [negativePosts]
  )

  const unhandledHighRisk = useMemo(
    () => highRiskNegative.filter((p) => !getDisposalByPostId(p.id)),
    [highRiskNegative, getDisposalByPostId]
  )

  const handledHighRisk = useMemo(
    () => highRiskNegative.filter((p) => getDisposalByPostId(p.id)),
    [highRiskNegative, getDisposalByPostId]
  )

  const slotAnalysis = useMemo(() => analyzeComplaintSlots(posts), [posts])

  const riskLevel = useMemo<RiskLevel>(() => {
    const urgentCount = unhandledHighRisk.filter((p) => p.heatScore >= 85).length
    const highCount = unhandledHighRisk.filter((p) => p.heatScore >= 60).length
    const totalUnhandled = unhandledHighRisk.length

    if (urgentCount >= 2 || (urgentCount >= 1 && totalUnhandled >= 4)) return 'urgent'
    if (urgentCount >= 1 || highCount >= 3 || (highCount >= 1 && totalUnhandled >= 5)) return 'high'
    if (highCount >= 1 || totalUnhandled >= 3) return 'medium'
    return 'low'
  }, [unhandledHighRisk])

  const urgentUnhandled = useMemo(() => {
    return [...unhandledHighRisk]
      .sort((a, b) => b.heatScore - a.heatScore)
      .map((p) => ({
        post: p,
        risk: (p.heatScore >= 85 ? 'urgent' : 'high') as RiskLevel,
      }))
  }, [unhandledHighRisk])

  const handledRiskPosts = useMemo(() => {
    return [...handledHighRisk]
      .sort((a, b) => b.heatScore - a.heatScore)
      .map((p) => ({
        post: p,
        record: getDisposalByPostId(p.id) as DisposalRecord,
      }))
  }, [handledHighRisk, getDisposalByPostId])

  const riskConfig = RISK_CONFIG[riskLevel]
  const RiskIcon = riskConfig.icon

  const now = new Date()
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  const riskDescription = useMemo(() => {
    const urgentCount = unhandledHighRisk.filter((p) => p.heatScore >= 85).length
    const highCount = unhandledHighRisk.filter((p) => p.heatScore >= 60).length
    const totalUnhandled = unhandledHighRisk.length

    switch (riskLevel) {
      case 'urgent':
        return `当前存在 ${urgentCount} 条紧急级未处理高风险帖（热度≥85），高风险待处理 ${highCount} 条，共 ${totalUnhandled} 条高热负面帖。涉及CEO发言争议、产品质量等核心议题，建议立即启动危机响应流程，法务与客服团队同步介入。`
      case 'high':
        return `存在 ${highCount} 条高热未处理负面讨论，主要集中在产品售后和竞品对比方面。共 ${totalUnhandled} 条待处理，建议公关团队今日重点跟进，准备回应话术。`
      case 'medium':
        return `有 ${totalUnhandled} 条中等热度未处理负面讨论，建议持续关注发展趋势，分配专人跟进，做好回应准备。`
      case 'low':
        return `今日高风险负面讨论热度较低，仅 ${totalUnhandled} 条待处理，无重大风险信号，保持日常监控即可。`
    }
  }, [riskLevel, unhandledHighRisk])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">日报生成</h1>
          <p className="mt-1 text-sm text-gray-500">{dateStr} 口碑日报</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400"
        >
          <Printer className="h-4 w-4" />
          打印/导出
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className={cn(
          'col-span-1 flex flex-col items-center justify-center rounded-xl border p-6 shadow-lg',
          riskConfig.bg,
          riskConfig.border,
          riskConfig.glow
        )}>
          <RiskIcon className={cn('mb-3 h-8 w-8', riskConfig.color)} />
          <span className={cn('font-mono-data text-3xl font-bold', riskConfig.color)}>
            {RISK_LABELS[riskLevel]}
          </span>
          <span className="mt-1 text-xs text-gray-500">整体风险等级</span>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-600">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-rose-400" />
              待处理高风险 {unhandledHighRisk.length}
            </span>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-400" />
              已处置高风险 {handledHighRisk.length}
            </span>
          </div>
          <div className="mt-4 flex gap-1.5">
            {(['low', 'medium', 'high', 'urgent'] as RiskLevel[]).map((level) => (
              <div
                key={level}
                className={cn(
                  'h-2 w-6 rounded-full transition-all',
                  level === riskLevel
                    ? RISK_DOT_COLORS[level]
                    : level === 'low'
                    ? 'bg-emerald-500/20'
                    : level === 'medium'
                    ? 'bg-amber-500/20'
                    : level === 'high'
                    ? 'bg-orange-500/20'
                    : 'bg-rose-500/20'
                )}
              />
            ))}
          </div>
        </div>

        <div className="col-span-2 rounded-xl border border-white/5 bg-[#12122a] p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-300">风险研判</h3>
          <p className="text-sm leading-relaxed text-gray-400">{riskDescription}</p>
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="rounded-lg bg-white/[0.03] p-3 text-center">
              <div className="font-mono-data text-2xl font-bold text-rose-400">{negativePosts.length}</div>
              <div className="mt-1 text-[11px] text-gray-600">负面讨论</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3 text-center">
              <div className="font-mono-data text-2xl font-bold text-orange-400">{unhandledHighRisk.length}</div>
              <div className="mt-1 text-[11px] text-gray-600">待处理高风险</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3 text-center">
              <div className="font-mono-data text-2xl font-bold text-amber-400">
                {posts.filter((p) => p.heatTrend === 'rising').length}
              </div>
              <div className="mt-1 text-[11px] text-gray-600">热度上升</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3 text-center">
              <div className="font-mono-data text-2xl font-bold text-emerald-400">{handledHighRisk.length}</div>
              <div className="mt-1 text-[11px] text-gray-600">已处置高风险</div>
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
            {slotAnalysis.length > 0 ? (
              slotAnalysis.map((item, i) => {
                const maxCount = slotAnalysis[0].count
                const widthPct = (item.count / maxCount) * 100
                const isExpanded = expandedSlot === item.slot
                return (
                  <div key={item.slot} className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
                    <div
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
                      onClick={() => setExpandedSlot(isExpanded ? null : item.slot)}
                    >
                      <span className="w-5 text-right font-mono-data text-xs text-gray-600">
                        {i + 1}
                      </span>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
                      <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', item.color)} />
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-200">{item.slot}</span>
                          <span className="flex items-center gap-1 font-mono-data text-[11px] text-gray-500">
                            <MessageSquare className="h-3 w-3" />
                            {item.count} 帖
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', item.color + '/80')}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-white/5 bg-black/20 p-2.5 animate-fade-in">
                        <p className="mb-2 px-1 text-[10px] uppercase tracking-wider text-gray-600">
                          相关原帖 ({item.posts.length})
                        </p>
                        <div className="space-y-1.5">
                          {item.posts.map((post) => (
                            <a
                              key={post.id}
                              href={post.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-start gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 transition-colors hover:bg-white/[0.06]"
                            >
                              <div className={cn(
                                'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                                post.heatScore >= 85 ? 'bg-rose-500 animate-pulse' :
                                post.heatScore >= 60 ? 'bg-orange-500' : 'bg-amber-500'
                              )} />
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 text-[11px] leading-snug text-gray-400 group-hover:text-gray-200">
                                  {post.title}
                                </p>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-600">
                                  <span>{post.forum}</span>
                                  <span>·</span>
                                  <span className="text-amber-400/70">热度 {post.heatScore}</span>
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
              })
            ) : (
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
            </h3>
            <div className="space-y-2">
              {urgentUnhandled.length > 0 ? (
                urgentUnhandled.map(({ post, risk }, i) => (
                  <a
                    key={post.id}
                    href={post.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-lg border border-rose-500/10 bg-white/[0.02] p-3 transition-colors hover:border-rose-500/30 hover:bg-rose-500/5"
                  >
                    <span className="font-mono-data text-xs text-gray-700">{i + 1}</span>
                    <div className={cn('h-2 w-2 shrink-0 rounded-full animate-pulse', RISK_DOT_COLORS[risk])} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-200 group-hover:text-rose-300">{post.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-600">
                        <span>{post.source}</span>
                        <span className="text-gray-700">·</span>
                        <span>{post.forum}</span>
                        <span className="text-gray-700">·</span>
                        <span className={cn(
                          'font-medium',
                          risk === 'urgent' ? 'text-rose-400' : 'text-orange-400'
                        )}>
                          {risk === 'urgent' ? '紧急 ' : '高风险 '}
                          热度 {post.heatScore}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Link className="h-3 w-3" />
                      <span className="max-w-24 truncate">{getDomain(post.originalUrl)}</span>
                      <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </a>
                ))
              ) : (
                <div className="flex items-center justify-center rounded-lg bg-white/[0.02] p-6 text-sm text-gray-500">
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  所有高风险帖均已处置，无待处理项
                </div>
              )}
            </div>
          </div>

          {handledRiskPosts.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                已处置高风险帖
                <span className="ml-auto text-[10px] font-normal text-gray-600">闭环完成</span>
                <span className="ml-2 font-mono-data text-[11px] text-emerald-400">{handledRiskPosts.length}</span>
              </h3>
              <div className="space-y-2">
                {handledRiskPosts.map(({ post, record }, i) => (
                  <div
                    key={post.id}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono-data text-xs text-gray-700">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="line-clamp-1 text-sm text-gray-300">{post.title}</p>
                          <span className="shrink-0 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-medium text-orange-400">
                            热度 {post.heatScore}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                          <span className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            record.status === 'customer_service' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            record.status === 'legal' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          )}>
                            {DISPOSAL_LABELS[record.status]}
                          </span>
                          <span className="text-gray-600">{record.handler}</span>
                        </div>
                        {record.conclusion && (
                          <p className="mt-1 line-clamp-1 text-[11px] text-gray-500">
                            结论：{record.conclusion}
                          </p>
                        )}
                      </div>
                      <a
                        href={post.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded p-1 text-gray-600 transition-colors hover:text-emerald-400"
                      >
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
