import { useState } from 'react'
import { useStore } from '@/store'
import { Settings, Activity, Bell } from 'lucide-react'
import ChangeCard from '@/components/ChangeCard'
import KeywordPanel from '@/components/KeywordPanel'
import PostCard from '@/components/PostCard'
import { cn } from '@/lib/utils'

export default function Home() {
  const { posts, keywords, getDisposalByPostId } = useStore()
  const [keywordPanelOpen, setKeywordPanelOpen] = useState(false)

  const newCount = posts.filter((p) => p.changeType === 'new').length
  const hotCount = posts.filter((p) => p.changeType === 'hot').length
  const negativeCount = posts.filter((p) => p.changeType === 'negative_surge').length

  const recentPosts = [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const now = new Date()
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">关键词看板</h1>
          <p className="mt-1 text-sm text-gray-500">{dateStr} 口碑动态概览</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative rounded-lg border border-white/5 p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
          </button>
          <button
            onClick={() => setKeywordPanelOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400"
          >
            <Settings className="h-4 w-4" />
            关键词管理
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <ChangeCard
          type="new"
          count={newCount}
          trend="今日新增"
          className="animate-slide-up stagger-1"
        />
        <ChangeCard
          type="hot"
          count={hotCount}
          trend="较昨日+2"
          className="animate-slide-up stagger-2"
        />
        <ChangeCard
          type="negative_surge"
          count={negativeCount}
          trend="需重点关注"
          className="animate-slide-up stagger-3"
        />
      </div>

      <div className="rounded-xl border border-white/5 bg-[#12122a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Activity className="h-4 w-4 text-amber-400" />
            实时动态流
          </div>
          <span className="text-xs text-gray-600">监控关键词: {keywords.length} 个</span>
        </div>
        <div className="space-y-3">
          {recentPosts.map((post, i) => (
            <div
              key={post.id}
              className={cn('animate-slide-up opacity-0', `stagger-${Math.min(i + 1, 6)}`)}
            >
              <PostCard
                post={post}
                onClick={() => {}}
                disposalStatus={getDisposalByPostId(post.id)?.status}
              />
            </div>
          ))}
        </div>
      </div>

      <KeywordPanel open={keywordPanelOpen} onClose={() => setKeywordPanelOpen(false)} />
    </div>
  )
}
