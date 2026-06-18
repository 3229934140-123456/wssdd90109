import { TrendingUp, Flame, AlertTriangle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChangeType } from '@/types'
import { useNavigate } from 'react-router-dom'

interface ChangeCardProps {
  type: ChangeType
  count: number
  trend?: string
  className?: string
}

const CONFIG: Record<ChangeType, {
  icon: typeof TrendingUp
  label: string
  color: string
  bg: string
  border: string
  glow: string
}> = {
  new: {
    icon: TrendingUp,
    label: '新增讨论',
    color: 'text-sky-400',
    bg: 'bg-sky-500/8',
    border: 'border-sky-500/20',
    glow: 'shadow-sky-500/5',
  },
  hot: {
    icon: Flame,
    label: '热度上升',
    color: 'text-amber-400',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/5',
  },
  negative_surge: {
    icon: AlertTriangle,
    label: '负面集中',
    color: 'text-rose-400',
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/20',
    glow: 'shadow-rose-500/5',
  },
}

export default function ChangeCard({ type, count, trend, className }: ChangeCardProps) {
  const config = CONFIG[type]
  const Icon = config.icon
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/posts?changeType=${type}`)}
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
        config.bg,
        config.border,
        config.glow,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-2', config.color)}>
          <Icon className="h-5 w-5" />
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-gray-400" />
      </div>
      <div className="flex items-end justify-between">
        <span className={cn('font-mono-data text-4xl font-bold', config.color)}>
          {count}
        </span>
        {trend && (
          <span className="text-xs text-gray-500">{trend}</span>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </button>
  )
}
