import { useState, useMemo } from 'react'
import {
  X, Plus, Tag, ChevronDown, ChevronRight, MessageSquare, TrendingUp,
  AlertTriangle, Sparkles, Gauge, Zap, Check, History, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, ExternalLink, Target,
} from 'lucide-react'
import { useStore } from '@/store'
import {
  KEYWORD_CATEGORY_LABELS, type KeywordCategory, type KeywordAdoption,
} from '@/types'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

const CATEGORY_COLORS: Record<KeywordCategory, string> = {
  brand: '#f59e0b',
  product: '#10b981',
  typo: '#8b5cf6',
  competitor: '#ef4444',
}

interface KeywordPanelProps {
  open: boolean
  onClose: () => void
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 60) return `${diff}分钟前`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

export default function KeywordPanel({ open, onClose }: KeywordPanelProps) {
  const {
    keywords, addKeyword, removeKeyword, updateKeywordCategory,
    getKeywordHitCount, getPostsByKeyword, getCategoryCoverage,
    getUnmatchedHighHeatNegative, getSuggestedKeywords, keywordAdoptions,
    getNewlyMatchedPosts, getTotalCoverage,
  } = useStore()

  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState<KeywordCategory>('brand')
  const [expandedKw, setExpandedKw] = useState<string | null>(null)
  const [expandedAdoption, setExpandedAdoption] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'keywords' | 'ops' | 'tracking'>('keywords')

  const handleAdd = () => {
    if (!newText.trim()) return
    addKeyword({
      id: `kw_${Date.now()}`,
      text: newText.trim(),
      category: newCategory,
      color: CATEGORY_COLORS[newCategory],
    })
    setNewText('')
  }

  const handleAddSuggestion = (text: string, category: KeywordCategory) => {
    addKeyword({
      id: `kw_${Date.now()}`,
      text,
      category,
      color: CATEGORY_COLORS[category],
    })
  }

  const grouped = keywords.reduce<Record<KeywordCategory, typeof keywords>>(
    (acc, kw) => { if (!acc[kw.category]) acc[kw.category] = []; acc[kw.category].push(kw); return acc },
    {} as Record<KeywordCategory, typeof keywords>
  )

  const unmatchedPosts = getUnmatchedHighHeatNegative()
  const suggestedKeywords = getSuggestedKeywords()

  const adoptionStats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTs = today.getTime()
    const todayAdoptions = keywordAdoptions.filter(
      (a) => new Date(a.adoptedAt).getTime() >= todayTs
    )
    const byCategory = keywordAdoptions.reduce<Record<KeywordCategory, KeywordAdoption[]>>(
      (acc, a) => { if (!acc[a.category]) acc[a.category] = []; acc[a.category].push(a); return acc },
      {} as Record<KeywordCategory, KeywordAdoption[]>
    )
    return { todayAdoptions, byCategory }
  }, [keywordAdoptions])

  const totalCoverage = getTotalCoverage()

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-screen w-[500px] animate-slide-in-right border-l border-white/5 bg-[#12122a] shadow-2xl flex flex-col">
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-6 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-100">关键词词库</h2>
            <p className="text-[11px] text-gray-600">共 {keywords.length} 个 · 总覆盖率 <span className="text-emerald-400">{totalCoverage}%</span> · 采纳 {keywordAdoptions.length} 次</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-white/5 shrink-0">
          {([
            { id: 'keywords' as const, label: '词库管理', count: keywords.length, warn: false },
            { id: 'ops' as const, label: '运营分析', count: unmatchedPosts.length, warn: unmatchedPosts.length > 0 },
            { id: 'tracking' as const, label: '效果追踪', count: adoptionStats.todayAdoptions.length, warn: false },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'relative flex-1 px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5',
                activeTab === t.id
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className={cn(
                  'inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold',
                  t.warn ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-gray-400'
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {activeTab === 'keywords' && (
            <div className="p-4">
              <div className="mb-4 flex gap-2">
                <input
                  type="text" value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="输入关键词..."
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as KeywordCategory)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-gray-300 outline-none"
                >
                  {Object.entries(KEYWORD_CATEGORY_LABELS).map(([k, l]) => (
                    <option key={k} value={k} className="bg-[#12122a]">{l}</option>
                  ))}
                </select>
                <button onClick={handleAdd} className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/30">
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {(['brand', 'product', 'typo', 'competitor'] as KeywordCategory[]).map((category) => {
                const items = grouped[category] || []
                if (items.length === 0) return null
                const totalHits = items.reduce((s, kw) => s + getKeywordHitCount(kw.text), 0)
                const coverage = getCategoryCoverage(category)
                return (
                  <div key={category} className="mb-5">
                    <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <span className="flex items-center gap-2">
                        <Tag className="h-3 w-3" style={{ color: CATEGORY_COLORS[category] }} />
                        {KEYWORD_CATEGORY_LABELS[category]}
                      </span>
                      <span className="flex items-center gap-2 font-mono-data text-[10px] text-gray-600">
                        {items.length} 词 · {totalHits} 次命中
                        <span className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: `${CATEGORY_COLORS[category]}18`, color: CATEGORY_COLORS[category] }}>
                          覆盖率 {coverage}%
                        </span>
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {items.map((kw) => {
                        const hitCount = getKeywordHitCount(kw.text)
                        const hitPosts = getPostsByKeyword(kw.text)
                        const isExpanded = expandedKw === kw.id
                        return (
                          <div key={kw.id} className="overflow-hidden rounded-xl border transition-colors"
                            style={{ borderColor: `${kw.color}25`, backgroundColor: `${kw.color}08` }}>
                            <div
                              className="flex cursor-pointer items-center gap-2 px-3 py-2"
                              onClick={() => setExpandedKw(isExpanded ? null : kw.id)}
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                                style={{ backgroundColor: `${kw.color}20`, color: kw.color }}>
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </span>
                              <span className="flex-1 text-sm font-medium" style={{ color: kw.color }}>{kw.text}</span>
                              <select
                                value={kw.category}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateKeywordCategory(kw.id, e.target.value as KeywordCategory)}
                                className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400 outline-none"
                              >
                                {Object.entries(KEYWORD_CATEGORY_LABELS).map(([k, l]) => (
                                  <option key={k} value={k} className="bg-[#12122a]">{l}</option>
                                ))}
                              </select>
                              <span className="flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono-data text-[10px]"
                                style={{ backgroundColor: `${kw.color}18`, color: kw.color }}>
                                <MessageSquare className="h-2.5 w-2.5" />{hitCount}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeKeyword(kw.id) }}
                                className="ml-0.5 rounded-full p-0.5 text-gray-600 transition-colors hover:bg-white/10 hover:text-rose-400"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>

                            {isExpanded && hitPosts.length > 0 && (
                              <div className="border-t border-white/5 bg-black/20 p-2 animate-fade-in">
                                <p className="mb-2 px-2 text-[10px] uppercase tracking-wider text-gray-600">
                                  命中讨论 ({hitPosts.length})
                                </p>
                                <div className="space-y-1.5">
                                  {hitPosts.map((post: Post) => (
                                    <div key={post.id} className="group flex items-start gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
                                      <div className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                                        post.sentiment === 'positive' ? 'bg-emerald-500' :
                                        post.sentiment === 'negative' ? 'bg-rose-500' : 'bg-gray-500')} />
                                      <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-[11px] leading-snug text-gray-400 group-hover:text-gray-300">{post.title}</p>
                                        <span className="text-[10px] text-gray-600">{post.forum} · 热度 {post.heatScore}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'ops' && (
            <div className="p-4 space-y-5">
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Gauge className="h-3.5 w-3.5 text-amber-400" />
                  各类别覆盖率
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['brand', 'product', 'typo', 'competitor'] as KeywordCategory[]).map((cat) => {
                    const cov = getCategoryCoverage(cat)
                    return (
                      <div key={cat} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-medium" style={{ color: CATEGORY_COLORS[cat] }}>
                            {KEYWORD_CATEGORY_LABELS[cat]}
                          </span>
                          <span className="font-mono-data text-[11px] text-gray-400">{cov}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${cov}%`, backgroundColor: CATEGORY_COLORS[cat] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  未命中的高热负面帖
                  {unmatchedPosts.length > 0 && (
                    <span className="ml-auto rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">{unmatchedPosts.length}</span>
                  )}
                </h3>
                {unmatchedPosts.length > 0 ? (
                  <div className="space-y-1.5">
                    {unmatchedPosts.map((post) => (
                      <div key={post.id} className="flex items-start gap-2 rounded-lg border border-rose-500/10 bg-rose-500/[0.03] px-3 py-2">
                        <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-[11px] text-gray-300">{post.title}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-600">
                            <span>{post.forum}</span><span>·</span><span className="text-rose-400">热度 {post.heatScore}</span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-[10px] text-gray-500 italic">
                            建议提取标题关键词加入词库
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-emerald-500/10 bg-emerald-500/[0.02] p-4 text-[11px] text-emerald-400/80">
                    <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                    所有高热负面帖均已覆盖，状态良好
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  建议补充关键词
                </h3>
                {suggestedKeywords.length > 0 ? (
                  <div className="space-y-1.5">
                    {suggestedKeywords.map((s, i) => {
                      const adopted = keywordAdoptions.some((a) => a.keyword === s.text)
                      return (
                        <div key={s.text + i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                            style={{ backgroundColor: `${CATEGORY_COLORS[s.category]}20` }}>
                            {adopted ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Plus className="h-3 w-3" style={{ color: CATEGORY_COLORS[s.category] }} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-medium text-gray-200">{s.text}</span>
                              <span className="rounded-full px-1.5 py-0.5 text-[9px]"
                                style={{
                                  backgroundColor: `${CATEGORY_COLORS[s.category]}18`,
                                  color: CATEGORY_COLORS[s.category],
                                }}>
                                {KEYWORD_CATEGORY_LABELS[s.category]}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-[10px] text-gray-500">{s.reason}</p>
                          </div>
                          <button
                            disabled={adopted}
                            onClick={() => handleAddSuggestion(s.text, s.category)}
                            className={cn(
                              'shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                              adopted
                                ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
                                : 'bg-violet-500/15 text-violet-400 hover:bg-violet-500/25'
                            )}
                          >
                            {adopted ? '已采纳' : '加入'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center text-[11px] text-gray-500">
                    暂无可建议关键词
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="p-4 space-y-5">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
                  覆盖率总览
                </h3>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-mono-data text-4xl font-bold text-emerald-400">{totalCoverage}<span className="text-xl">%</span></div>
                    <p className="mt-1 text-[11px] text-gray-500">全部关键词对负面帖的覆盖率</p>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center gap-2 justify-end text-[10px] text-gray-600">
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                      今日新增词 <span className="font-mono-data text-gray-400">{adoptionStats.todayAdoptions.length}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end text-[10px] text-gray-600">
                      <Minus className="h-3 w-3 text-gray-500" />
                      未命中帖 <span className="font-mono-data text-rose-400">{unmatchedPosts.length}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end text-[10px] text-gray-600">
                      <Gauge className="h-3 w-3 text-amber-400" />
                      词库规模 <span className="font-mono-data text-gray-400">{keywords.length}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${totalCoverage}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <History className="h-3.5 w-3.5 text-sky-400" />
                  采纳记录与效果
                  {keywordAdoptions.length > 0 && (
                    <span className="ml-auto text-[10px] font-normal text-gray-600">
                      共 {keywordAdoptions.length} 次 · 点击展开查看命中帖
                    </span>
                  )}
                </h3>
                {keywordAdoptions.length > 0 ? (
                  <div className="space-y-2">
                    {[...keywordAdoptions].reverse().map((adopt, i) => {
                      const afterCov = getCategoryCoverage(adopt.category)
                      const delta = adopt.coverageBefore !== undefined ? afterCov - adopt.coverageBefore : null
                      const newlyMatched = getNewlyMatchedPosts(adopt.keyword)
                      const isExpanded = expandedAdoption === adopt.id
                      return (
                        <div key={adopt.id} className={cn(
                          'overflow-hidden rounded-lg border transition-colors',
                          isExpanded ? 'border-sky-500/30 bg-sky-500/[0.03]' : 'border-white/5 bg-white/[0.02]'
                        )}>
                          <div
                            className="cursor-pointer p-3"
                            onClick={() => setExpandedAdoption(isExpanded ? null : adopt.id)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                              )}
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                                style={{ backgroundColor: `${CATEGORY_COLORS[adopt.category]}20` }}>
                                <Check className="h-3 w-3" style={{ color: CATEGORY_COLORS[adopt.category] }} />
                              </div>
                              <span className="text-[12px] font-medium text-gray-200">「{adopt.keyword}」</span>
                              <span className="rounded-full px-1.5 py-0.5 text-[9px]"
                                style={{
                                  backgroundColor: `${CATEGORY_COLORS[adopt.category]}18`,
                                  color: CATEGORY_COLORS[adopt.category],
                                }}>
                                {KEYWORD_CATEGORY_LABELS[adopt.category]}
                              </span>
                              {delta !== null && (
                                <span className={cn(
                                  'ml-auto flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                                  delta > 0
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : delta < 0
                                    ? 'bg-rose-500/10 text-rose-400'
                                    : 'bg-gray-500/10 text-gray-400'
                                )}>
                                  {delta > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> :
                                   delta < 0 ? <ArrowDownRight className="h-2.5 w-2.5" /> :
                                   <Minus className="h-2.5 w-2.5" />}
                                  {delta > 0 ? '+' : ''}{delta}%
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-600 pl-8">
                              {adopt.coverageBefore !== undefined ? (
                                <span>
                                  采纳前 {adopt.coverageBefore}% → 当前 {afterCov}%
                                </span>
                              ) : (
                                <span>当前覆盖率 {afterCov}%</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Target className="h-2.5 w-2.5" />
                                新命中 {newlyMatched.length} 帖
                                <span className="text-gray-700">·</span>
                                {formatTimeShort(adopt.adoptedAt)}
                              </span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-white/5 bg-black/20 p-2.5 animate-fade-in">
                              {newlyMatched.length > 0 ? (
                                <>
                                  <p className="mb-2 px-1 text-[10px] uppercase tracking-wider text-gray-600">
                                    新增命中帖子 ({newlyMatched.length})
                                  </p>
                                  <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                                    {newlyMatched.map((post: Post) => (
                                      <a
                                        key={post.id}
                                        href={post.originalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-start gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 transition-colors hover:bg-white/[0.06]"
                                      >
                                        <div className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                                          post.sentiment === 'positive' ? 'bg-emerald-500' :
                                          post.sentiment === 'negative' ? 'bg-rose-500' : 'bg-gray-500')} />
                                        <div className="min-w-0 flex-1">
                                          <p className="line-clamp-1 text-[11px] leading-snug text-gray-400 group-hover:text-gray-200">{post.title}</p>
                                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-600">
                                            <span>{post.forum}</span>
                                            <span>·</span>
                                            <span className="text-amber-400/70">热度 {post.heatScore}</span>
                                          </div>
                                        </div>
                                        <ExternalLink className="h-3 w-3 shrink-0 text-gray-600 group-hover:text-sky-400" />
                                      </a>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <p className="text-center text-[10px] text-gray-600 py-2">
                                  该词没有单独命中的新帖子（可能与其他关键词重复覆盖）
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center text-[11px] text-gray-500">
                    <History className="mx-auto mb-1.5 h-6 w-6 text-gray-600" />
                    暂无采纳记录<br />
                    在"运营分析"中建议关键词点击加入后，会在这里追踪效果
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  仍未命中的高热负面帖
                  {unmatchedPosts.length > 0 && (
                    <span className="ml-auto rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">{unmatchedPosts.length}</span>
                  )}
                </h3>
                {unmatchedPosts.length > 0 ? (
                  <div className="space-y-1.5">
                    {unmatchedPosts.slice(0, 5).map((post) => (
                      <div key={post.id} className="flex items-start gap-2 rounded-lg border border-rose-500/10 bg-rose-500/[0.03] px-3 py-2">
                        <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-[11px] text-gray-300">{post.title}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-600">
                            <span>{post.forum}</span><span>·</span><span className="text-rose-400">热度 {post.heatScore}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {unmatchedPosts.length > 5 && (
                      <p className="text-center text-[10px] text-gray-600 pt-1">
                        还有 {unmatchedPosts.length - 5} 条未命中，前往「运营分析」查看完整列表
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-emerald-500/10 bg-emerald-500/[0.02] p-4 text-[11px] text-emerald-400/80">
                    <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                    所有高热负面帖均已覆盖
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
