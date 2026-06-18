import { useMemo } from 'react'
import { useStore } from '@/store'
import { MOCK_COMPLAINTS } from '@/data/mock'
import {
  Newspaper,
  AlertTriangle,
  ExternalLink,
  Printer,
  Shield,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskLevel, Post } from '@/types'
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

export default function DailyReport() {
  const { posts } = useStore()

  const negativePosts = useMemo(
    () => posts.filter((p) => p.sentiment === 'negative'),
    [posts]
  )

  const riskLevel = useMemo<RiskLevel>(() => {
    const urgentCount = negativePosts.filter((p) => p.heatScore >= 85).length
    const highCount = negativePosts.filter((p) => p.heatScore >= 60).length
    if (urgentCount >= 2) return 'urgent'
    if (urgentCount >= 1 || highCount >= 3) return 'high'
    if (highCount >= 1) return 'medium'
    return 'low'
  }, [negativePosts])

  const typicalPosts = useMemo(() => {
    return [...negativePosts]
      .sort((a, b) => b.heatScore - a.heatScore)
      .slice(0, 6)
      .map((p) => ({
        post: p,
        risk: (p.heatScore >= 85 ? 'urgent' : p.heatScore >= 60 ? 'high' : p.heatScore >= 40 ? 'medium' : 'low') as RiskLevel,
      }))
  }, [negativePosts])

  const riskConfig = RISK_CONFIG[riskLevel]
  const RiskIcon = riskConfig.icon

  const now = new Date()
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  const riskDescription = useMemo(() => {
    switch (riskLevel) {
      case 'urgent':
        return '当前存在多条高热度负面讨论，涉及CEO发言争议、产品质量等核心议题，建议立即启动危机响应流程，法务与客服团队同步介入。'
      case 'high':
        return '存在较高热度负面讨论，主要集中在产品售后和竞品对比方面，建议公关团队今日重点跟进，准备回应话术。'
      case 'medium':
        return '有部分中等热度负面讨论，建议持续关注发展趋势，做好回应准备。'
      case 'low':
        return '今日负面讨论热度较低，无重大风险信号，保持日常监控即可。'
    }
  }, [riskLevel])

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
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/[0.03] p-3 text-center">
              <div className="font-mono-data text-2xl font-bold text-rose-400">{negativePosts.length}</div>
              <div className="mt-1 text-[11px] text-gray-600">负面讨论数</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3 text-center">
              <div className="font-mono-data text-2xl font-bold text-amber-400">
                {posts.filter((p) => p.heatTrend === 'rising').length}
              </div>
              <div className="mt-1 text-[11px] text-gray-600">热度上升</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3 text-center">
              <div className="font-mono-data text-2xl font-bold text-sky-400">
                {posts.filter((p) => p.changeType === 'new').length}
              </div>
              <div className="mt-1 text-[11px] text-gray-600">今日新增</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 rounded-xl border border-white/5 bg-[#12122a] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Flame className="h-4 w-4 text-rose-400" />
            高频槽点 TOP10
          </h3>
          <div className="space-y-2.5">
            {MOCK_COMPLAINTS.map((item, i) => {
              const maxCount = MOCK_COMPLAINTS[0].count
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
            })}
          </div>
        </div>

        <div className="col-span-3 rounded-xl border border-white/5 bg-[#12122a] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Newspaper className="h-4 w-4 text-amber-400" />
            典型原帖
          </h3>
          <div className="space-y-2">
            {typicalPosts.map(({ post, risk }, i) => (
              <div
                key={post.id}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                <span className="font-mono-data text-xs text-gray-700">{i + 1}</span>
                <div className={cn('h-2 w-2 shrink-0 rounded-full', RISK_DOT_COLORS[risk])} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-300">{post.title}</p>
                  <span className="text-[11px] text-gray-600">
                    {post.source} · {post.forum} · 热度 {post.heatScore}
                  </span>
                </div>
                <a
                  href={post.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded p-1 text-gray-600 transition-colors hover:text-amber-400"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
