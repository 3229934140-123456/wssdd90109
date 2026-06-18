import { useState } from 'react'
import { X, ExternalLink, User, Save } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Post, DisposalStatus } from '@/types'
import { CATEGORY_LABELS, SENTIMENT_LABELS, DISPOSAL_LABELS } from '@/types'

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

export default function PostDetailModal({ post, open, onClose }: PostDetailModalProps) {
  const { addDisposalRecord, updateDisposalRecord, getDisposalByPostId } = useStore()
  const existing = getDisposalByPostId(post.id)

  const [status, setStatus] = useState<DisposalStatus>(existing?.status ?? 'observe')
  const [conclusion, setConclusion] = useState(existing?.conclusion ?? '')
  const [handler, setHandler] = useState(existing?.handler ?? '')

  if (!open) return null

  const handleSave = () => {
    if (existing) {
      updateDisposalRecord(post.id, status, conclusion)
    } else {
      addDisposalRecord(post.id, status, conclusion, handler || '当前用户')
    }
    onClose()
  }

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
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-6 py-5 scrollbar-thin">
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

          <div className="border-t border-white/5 px-6 py-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              处置标记
            </h4>
            <div className="mb-4 flex gap-2">
              {(Object.keys(DISPOSAL_LABELS) as DisposalStatus[]).map((s) => {
                const style = DISPOSAL_STYLES[s]
                const isActive = status === s
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
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
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
