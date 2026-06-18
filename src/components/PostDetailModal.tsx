import { useState, useMemo } from 'react'
import { X, ExternalLink, User, Save, History, CheckCircle2, Clock, Users, Calendar, CheckSquare } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Post, DisposalStatus, DisposalRecord, TeamRole } from '@/types'
import { CATEGORY_LABELS, SENTIMENT_LABELS, DISPOSAL_LABELS, TEAM_ROLE_LABELS } from '@/types'

interface PostDetailModalProps {
  post: Post
  open: boolean
  onClose: () => void
}

const DISPOSAL_STYLES: Record<DisposalStatus, { bg: string; border: string; activeBg: string; activeBorder: string; text: string }> = {
  customer_service: {
    bg: 'bg-transparent',
    border: 'border-amber-500/30',
    activeBg: 'bg-amber-500/15',
    activeBorder: 'border-amber-500/60',
    text: 'text-amber-400',
  },
  legal: {
    bg: 'bg-transparent',
    border: 'border-rose-500/30',
    activeBg: 'bg-rose-500/15',
    activeBorder: 'border-rose-500/60',
    text: 'text-rose-400',
  },
  observe: {
    bg: 'bg-transparent',
    border: 'border-sky-500/30',
    activeBg: 'bg-sky-500/15',
    activeBorder: 'border-sky-500/60',
    text: 'text-sky-400',
  },
}

const ROLE_STYLES: Record<TeamRole, { bg: string; border: string; text: string }> = {
  pr: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  cs: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  legal: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
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

function getStatusColor(status: DisposalStatus) {
  switch (status) {
    case 'customer_service':
      return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' }
    case 'legal':
      return { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' }
    case 'observe':
      return { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400' }
  }
}

function defaultDeadline(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 16)
}

export default function PostDetailModal({ post, open, onClose }: PostDetailModalProps) {
  const { addDisposalRecord, updateDisposalRecord, getDisposalHistoryByPostId } = useStore()

  const history = useMemo(() => getDisposalHistoryByPostId(post.id), [post.id, getDisposalHistoryByPostId])
  const existing = history[0]

  const [status, setStatus] = useState<DisposalStatus>(existing?.status ?? 'observe')
  const [conclusion, setConclusion] = useState(existing?.conclusion ?? '')
  const [handler, setHandler] = useState(existing?.handler ?? '')
  const [assignee, setAssignee] = useState<TeamRole | ''>(existing?.assignee ?? '')
  const [deadline, setDeadline] = useState(existing?.deadline ?? defaultDeadline())
  const [isCompleted, setIsCompleted] = useState(existing?.completed ?? false)

  if (!open) return null

  const handleSave = () => {
    if (existing) {
      updateDisposalRecord(
        post.id,
        status,
        conclusion,
        assignee || undefined,
        deadline || undefined,
        isCompleted
      )
    } else {
      addDisposalRecord(
        post.id,
        status,
        conclusion,
        handler || '当前用户',
        assignee || undefined,
        deadline || undefined
      )
    }
    onClose()
  }

  const isOverdue = existing?.deadline && !existing?.completed && new Date(existing.deadline) < new Date()

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl animate-slide-up rounded-2xl border border-white/10 bg-[#12122a] shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium text-gray-400">
                {post.source}
              </span>
              <span className="text-xs text-gray-600">
                {post.forum} · {post.board}
              </span>
              {post.heatScore >= 60 && (
                <span className={cn(
                  'rounded-md px-2 py-1 text-[10px] font-medium',
                  post.heatScore >= 85 ? 'bg-rose-500/20 text-rose-400' : 'bg-orange-500/20 text-orange-400'
                )}>
                  热度 {post.heatScore}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[55vh] overflow-y-auto px-6 py-5 scrollbar-thin">
            <h2 className="mb-3 text-lg font-bold text-gray-100">{post.title}</h2>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                post.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                post.sentiment === 'negative' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                'bg-gray-500/10 text-gray-400 border-gray-500/20'
              )}>
                {SENTIMENT_LABELS[post.sentiment]}
              </span>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                {CATEGORY_LABELS[post.category]}
              </span>
              {post.matchedKeywords.map((kw) => (
                <span key={kw} className="rounded-full border border-white/5 bg-white/5 px-2.5 py-0.5 text-xs text-gray-500">
                  {kw}
                </span>
              ))}
            </div>

            <div className="mb-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-sm leading-relaxed text-gray-300">{post.summary}</p>
            </div>

            <a
              href={post.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400/70 transition-colors hover:text-amber-400"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              查看原帖
            </a>
          </div>

          {history.length > 0 && (
            <div className="border-t border-white/5 px-6 py-5">
              <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <History className="h-3.5 w-3.5" />
                处置历史记录
                <span className="ml-auto text-[10px] font-normal text-gray-600">共 {history.length} 条</span>
              </h4>
              <div className="space-y-2.5">
                {history.map((record: DisposalRecord, idx: number) => {
                  const colors = getStatusColor(record.status)
                  const isLatest = idx === 0
                  const overdue = record.deadline && !record.completed && new Date(record.deadline) < new Date()
                  return (
                    <div
                      key={record.id}
                      className={cn(
                        'rounded-lg border p-3',
                        isLatest ? 'bg-white/[0.03] border-white/10' : 'bg-white/[0.01] border-white/5 opacity-75'
                      )}
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        {isLatest ? (
                          <CheckCircle2 className={cn('h-3.5 w-3.5', record.completed ? 'text-emerald-500' : 'text-sky-500')} />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-gray-600" />
                        )}
                        <span className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          colors.bg,
                          colors.border,
                          colors.text
                        )}>
                          {DISPOSAL_LABELS[record.status]}
                        </span>
                        {record.assignee && (
                          <span className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            ROLE_STYLES[record.assignee].bg,
                            ROLE_STYLES[record.assignee].border,
                            ROLE_STYLES[record.assignee].text
                          )}>
                            {TEAM_ROLE_LABELS[record.assignee]}
                          </span>
                        )}
                        {record.completed ? (
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                            ✓ 已完成
                          </span>
                        ) : overdue ? (
                          <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] text-rose-400 animate-pulse">
                            ⚠ 已逾期
                          </span>
                        ) : null}
                        <span className="text-[10px] text-gray-600">{record.handler}</span>
                        <span className="ml-auto text-[10px] text-gray-600">{formatTime(record.handledAt)}</span>
                      </div>
                      {record.conclusion && (
                        <p className="text-xs text-gray-400">{record.conclusion}</p>
                      )}
                      {record.deadline && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-600">
                          <Calendar className="h-3 w-3" />
                          截止时间：{new Date(record.deadline).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="border-t border-white/5 px-6 py-5">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {existing ? '更新处置' : '处置标记'}
              {isOverdue && <span className="ml-auto text-[10px] text-rose-400">已逾期</span>}
            </h4>

            <div className="mb-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-gray-600">
                <Users className="h-3 w-3" />
                负责团队
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAssignee(assignee === 'pr' ? '' : 'pr')}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-[11px] font-medium transition-all',
                    assignee === 'pr'
                      ? `${ROLE_STYLES.pr.bg} ${ROLE_STYLES.pr.border} ${ROLE_STYLES.pr.text}`
                      : 'border-white/10 text-gray-500 hover:text-gray-400'
                  )}
                >
                  公关团队
                </button>
                <button
                  onClick={() => setAssignee(assignee === 'cs' ? '' : 'cs')}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-[11px] font-medium transition-all',
                    assignee === 'cs'
                      ? `${ROLE_STYLES.cs.bg} ${ROLE_STYLES.cs.border} ${ROLE_STYLES.cs.text}`
                      : 'border-white/10 text-gray-500 hover:text-gray-400'
                  )}
                >
                  客服团队
                </button>
                <button
                  onClick={() => setAssignee(assignee === 'legal' ? '' : 'legal')}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-[11px] font-medium transition-all',
                    assignee === 'legal'
                      ? `${ROLE_STYLES.legal.bg} ${ROLE_STYLES.legal.border} ${ROLE_STYLES.legal.text}`
                      : 'border-white/10 text-gray-500 hover:text-gray-400'
                  )}
                >
                  法务团队
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-gray-600">
                <Calendar className="h-3 w-3" />
                截止时间
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-gray-300 outline-none transition-colors focus:border-amber-500/40"
              />
            </div>

            <div className="mb-4 flex gap-2">
              {(Object.keys(DISPOSAL_LABELS) as DisposalStatus[]).map((s) => {
                const style = DISPOSAL_STYLES[s]
                const isActive = status === s
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                      isActive ? `${style.activeBg} ${style.activeBorder} ${style.text}` : `${style.bg} ${style.border} text-gray-500`
                    )}
                  >
                    {DISPOSAL_LABELS[s]}
                  </button>
                )
              })}
            </div>

            {!existing && (
              <div className="mb-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                  <input
                    type="text"
                    value={handler}
                    onChange={(e) => setHandler(e.target.value)}
                    placeholder="处理人姓名"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-amber-500/40"
                  />
                </div>
              </div>
            )}

            {existing && (
              <div className="mb-3">
                <label className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 cursor-pointer transition-colors hover:bg-white/[0.04]">
                  <CheckSquare className={cn('h-4 w-4', isCompleted ? 'text-emerald-400' : 'text-gray-600')} />
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={(e) => setIsCompleted(e.target.checked)}
                    className="sr-only"
                  />
                  <span className={cn('text-sm', isCompleted ? 'text-emerald-400' : 'text-gray-500')}>
                    标记为已完成（闭环）
                  </span>
                </label>
              </div>
            )}

            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="填写处理结论..."
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-amber-500/40"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/30"
              >
                <Save className="h-4 w-4" />
                {existing ? '更新记录' : '保存分派'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
