import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Library from './pages/Library.jsx'
import Area from './pages/Area.jsx'
import Topic from './pages/Topic.jsx'
import Module from './pages/Module.jsx'
import Modules from './pages/Modules.jsx'
import Bookmarks from './pages/Bookmarks.jsx'
import Progress from './pages/Progress.jsx'
import NotFound from './pages/NotFound.jsx'

const Reader = lazy(() => import('./pages/Reader.jsx'))

function ReaderFallback() {
  return (
    <div className="reader">
      <div className="reader-scroll" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="reader-skeleton" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/modules" element={<Modules />} />
        <Route path="/module" element={<Module />} />
        <Route path="/area/:area" element={<Area />} />
        <Route path="/area/:area/:topic" element={<Topic />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="/read/:id"
        element={
          <Suspense fallback={<ReaderFallback />}>
            <Reader />
          </Suspense>
        }
      />
    </Routes>
  )
}
