import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, Newspaper, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: '关键词看板' },
  { to: '/posts', icon: FileText, label: '帖子分层' },
  { to: '/daily-report', icon: Newspaper, label: '日报生成' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/5 bg-[#12122a] transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-16 items-center border-b border-white/5 px-4">
        {!collapsed && (
          <div className="animate-fade-in flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
              <Newspaper className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-sm font-bold tracking-wide text-amber-400">
              口碑观察站
            </span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
            <Newspaper className="h-4 w-4 text-amber-400" />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/5'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              )}
            >
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  isActive ? 'text-amber-400' : 'text-gray-500 group-hover:text-gray-300'
                )}
              />
              {!collapsed && (
                <span className="animate-fade-in truncate">{item.label}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-12 items-center justify-center border-t border-white/5 text-gray-500 transition-colors hover:text-gray-300"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}
