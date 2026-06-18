import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import { useSearchParams } from 'react-router-dom'
import { FileText, Search } from 'lucide-react'
import PostCard from '@/components/PostCard'
import PostDetailModal from '@/components/PostDetailModal'
import FilterBar from '@/components/FilterBar'
import type { Post, Sentiment, PostCategory, ReplySpeed, ChangeType } from '@/types'

export default function Posts() {
  const { posts, getDisposalByPostId } = useStore()
  const [searchParams] = useSearchParams()

  const [sentiment, setSentiment] = useState<Sentiment | ''>('')
  const [category, setCategory] = useState<PostCategory | ''>('')
  const [replySpeed, setReplySpeed] = useState<ReplySpeed | ''>('')
  const [changeType, setChangeType] = useState<ChangeType | ''>(
    (searchParams.get('changeType') as ChangeType) || ''
  )
  const [forum, setForum] = useState('')
  const [search, setSearch] = useState('')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const forums = useMemo(
    () => [...new Set(posts.map((p) => p.forum))].sort(),
    [posts]
  )

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (sentiment && p.sentiment !== sentiment) return false
      if (category && p.category !== category) return false
      if (replySpeed && p.replySpeed !== replySpeed) return false
      if (changeType && p.changeType !== changeType) return false
      if (forum && p.forum !== forum) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          p.title.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q) ||
          p.matchedKeywords.some((k) => k.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [posts, sentiment, category, replySpeed, changeType, forum, search])

  const handleReset = () => {
    setSentiment('')
    setCategory('')
    setReplySpeed('')
    setChangeType('')
    setForum('')
    setSearch('')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">帖子分层</h1>
          <p className="mt-1 text-sm text-gray-500">
            共 {filtered.length} 条讨论 · 已处置 {posts.filter((p) => getDisposalByPostId(p.id)).length} 条
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题、摘要或关键词..."
            className="w-72 rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-amber-500/40"
          />
        </div>
      </div>

      <FilterBar
        sentiment={sentiment}
        category={category}
        replySpeed={replySpeed}
        changeType={changeType}
        forum={forum}
        onSentimentChange={setSentiment}
        onCategoryChange={setCategory}
        onReplySpeedChange={setReplySpeed}
        onChangeTypeChange={setChangeType}
        onForumChange={setForum}
        onReset={handleReset}
        forums={forums}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-[#12122a] py-16">
          <FileText className="mb-3 h-10 w-10 text-gray-700" />
          <p className="text-sm text-gray-500">暂无匹配的讨论帖</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => setSelectedPost(post)}
              disposalStatus={getDisposalByPostId(post.id)?.status}
            />
          ))}
        </div>
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          open={!!selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  )
}
