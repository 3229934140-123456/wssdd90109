import { useMemo } from 'react'
import { useStore } from '@/store'
import { STOP_WORDS } from '@/data/mock'
import {
  Newspaper,
  AlertTriangle,
  ExternalLink,
  Printer,
  Shield,
  Flame,
  CheckCircle,
  AlertCircle,
  Link,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskLevel, Post, DisposalRecord } from '@/types'
import { RISK_LABELS } from '@/types'

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

function extractWordFrequencies(posts: Post[]): { keyword: string; count: number }[] {
  const freqMap = new Map<string, number>()
  const text = posts
    .filter((p) => p.sentiment === 'negative')
    .map((p) => `${p.title} ${p.summary}`)
    .join(' ')

  const tokens = text
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)

  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (STOP_WORDS.has(lower)) continue
    if (lower.length >= 2) {
      freqMap.set(token, (freqMap.get(token) || 0) + 1)
    }
  }

  return Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }))
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export default function DailyReport() {
  const { posts, getDisposalByPostId } = useStore()

  const negativePosts = useMemo(
    () => posts.filter((p) => p.sentiment === 'negative'),
    [posts]
  )

  const unhandledNegativePosts = useMemo(
    () => negativePosts.filter((p) => !getDisposalByPostId(p.id)),
    [negativePosts, getDisposalByPostId]
  )

  const handledNegativePosts = useMemo(
    () => negativePosts.filter((p) => getDisposalByPostId(p.id)),
    [negativePosts, getDisposalByPostId]
  )

  const dynamicComplaints = useMemo(
    () => extractWordFrequencies(posts),
    [posts]
  )

  const riskLevel = useMemo<RiskLevel>(() => {
    const urgentCount = unhandledNegativePosts.filter((p) => p.heatScore >= 85).length
    const highCount = unhandledNegativePosts.filter((p) => p.heatScore >= 60).length
    const totalUnhandled = unhandledNegativePosts.length

    if (urgentCount >= 2 || (urgentCount >= 1 && totalUnhandled >= 4)) return 'urgent'
    if (urgentCount >= 1 || highCount >= 3 || (highCount >= 1 && totalUnhandled >= 5)) return 'high'
    if (highCount >= 1 || totalUnhandled >= 3) return 'medium'
    return 'low'
  }, [unhandledNegativePosts])

  const typicalPosts = useMemo(() => {
    return [...unhandledNegativePosts]
      .sort((a, b) => b.heatScore - a.heatScore)
      .slice(0, 4)
      .map((p) => ({
        post: p,
        risk: (p.heatScore >= 85 ? 'urgent' : p.heatScore >= 60 ? 'high' : p.heatScore >= 40 ? 'medium' : 'low') as RiskLevel,
      }))
  }, [unhandledNegativePosts])

  const handledPosts = useMemo(() => {
    return [...handledNegativePosts]
      .sort((a, b) => b.heatScore - a.heatScore)
      .slice(0, 3)
      .map((p) => ({
        post: p,
        record: getDisposalByPostId(p.id) as DisposalRecord,
      }))
  }, [handledNegativePosts, getDisposalByPostId])

  const riskConfig = RISK_CONFIG[riskLevel]
  const RiskIcon = riskConfig.icon

  const now = new Date()
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  const riskDescription = useMemo(() => {
    const urgentCount = unhandledNegativePosts.filter((p) => p.heatScore >= 85).length
    const highCount = unhandledNegativePosts.filter((p) => p.heatScore >= 60).length
    const totalUnhandled = unhandledNegativePosts.length

    switch (riskLevel) {
      case 'urgent':
        return `当前存在 ${urgentCount} 条紧急级未处理负面讨论（热度≥85），高风险未处理 ${highCount} 条，共 ${totalUnhandled} 条待处理。涉及CEO发言争议、产品质量等核心议题，建议立即启动危机响应流程，法务与客服团队同步介入。`
      case 'high':
        return `存在 ${highCount} 条高热度未处理负面讨论，主要集中在产品售后和竞品对比方面。共 ${totalUnhandled} 条待处理，建议公关团队今日重点跟进，准备回应话术。`
      case 'medium':
        return `有 ${totalUnhandled} 条中等热度未处理负面讨论，建议持续关注发展趋势，分配专人跟进，做好回应准备。`
      case 'low':
        return `今日负面讨论热度较低，仅 ${totalUnhandled} 条待处理，无重大风险信号，保持日常监控即可。`
    }
  }, [riskLevel, unhandledNegativePosts])

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
              未处理 {unhandledNegativePosts.length}
            </span>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-400" />
              已处置 {handledNegativePosts.length}
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
              <div className="font-mono-data text-2xl font-bold text-orange-400">{unhandledNegativePosts.length}</div>
              <div className="mt-1 text-[11px] text-gray-600">未处理</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3 text-center">
              <div className="font-mono-data text-2xl font-bold text-amber-400">
                {posts.filter((p) => p.heatTrend === 'rising').length}
              </div>
              <div className="mt-1 text-[11px] text-gray-600">热度上升</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3 text-center">
              <div className="font-mono-data text-2xl font-bold text-emerald-400">{handledNegativePosts.length}</div>
              <div className="mt-1 text-[11px] text-gray-600">已处置</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 rounded-xl border border-white/5 bg-[#12122a] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Flame className="h-4 w-4 text-rose-400" />
            高频槽点 TOP10
            <span className="ml-auto text-[10px] text-gray-600">自动提取自标题和摘要</span>
          </h3>
          <div className="space-y-2.5">
            {dynamicComplaints.length > 0 ? (
              dynamicComplaints.map((item, i) => {
                const maxCount = dynamicComplaints[0].count
                const widthPct = (item.count / maxCount) * 100
                return (
                  <div key={item.keyword} className="group flex items-center gap-3">
                    <span className="w-5 text-right font-mono-data text-xs text-gray-600">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-300">{item.keyword}</span>
                        <span className="font-mono-data text-[11px] text-gray-600">{item.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            background: `linear-gradient(90deg, ${
                              i < 3 ? '#f43f5e' : i < 6 ? '#f59e0b' : '#6366f1'
                            }, ${i < 3 ? '#fb7185' : i < 6 ? '#fbbf24' : '#818cf8'})`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-sm text-gray-600">暂无足够负面数据</div>
            )}
          </div>
        </div>

        <div className="col-span-3 space-y-4">
          <div className="rounded-xl border border-white/5 bg-[#12122a] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-300">
              <AlertCircle className="h-4 w-4 text-rose-400" />
              待处理高风险帖
            </h3>
            <div className="space-y-2">
              {typicalPosts.length > 0 ? (
                typicalPosts.map(({ post, risk }, i) => (
                  <a
                    key={post.id}
                    href={post.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-rose-500/20 hover:bg-rose-500/5"
                  >
                    <span className="font-mono-data text-xs text-gray-700">{i + 1}</span>
                    <div className={cn('h-2 w-2 shrink-0 rounded-full animate-pulse', RISK_DOT_COLORS[risk])} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-300 group-hover:text-rose-300">{post.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-600">
                        <span>{post.source}</span>
                        <span className="text-gray-700">·</span>
                        <span>{post.forum}</span>
                        <span className="text-gray-700">·</span>
                        <span className="text-amber-400/70">热度 {post.heatScore}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Link className="h-3 w-3" />
                      <span className="max-w-28 truncate">{getDomain(post.originalUrl)}</span>
                      <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </a>
                ))
              ) : (
                <div className="flex items-center justify-center rounded-lg bg-white/[0.02] p-6 text-sm text-gray-600">
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  所有高风险帖均已处置
                </div>
              )}
            </div>
          </div>

          {handledPosts.length > 0 && (
            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-400/80">
                <CheckCircle className="h-4 w-4" />
                今日已处置
              </h3>
              <div className="space-y-2">
                {handledPosts.map(({ post, record }, i) => (
                  <div
                    key={post.id}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono-data text-xs text-gray-700">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm text-gray-400">{post.title}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                          <span className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            record.status === 'customer_service' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            record.status === 'legal' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          )}>
                            {record.status === 'customer_service' ? '客服跟进' :
                             record.status === 'legal' ? '法务关注' : '仅观察'}
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
