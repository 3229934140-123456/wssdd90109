import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Home from '@/pages/Home'
import Posts from '@/pages/Posts'
import DailyReport from '@/pages/DailyReport'

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-[#0f0f1a]">
        <Sidebar />
        <main className="ml-56 flex-1 p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/daily-report" element={<DailyReport />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
