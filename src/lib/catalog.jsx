/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { AREA_ORDER, TYPE_ORDER } from './utils.js'
import { canonicalArea } from './areas.jsx'

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const [resources, setResources] = useState([])
  const [meta, setMeta] = useState(null)
  const [modules, setModules] = useState({ collections: [], modules: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/data/resources.json').then((res) => {
        if (!res.ok) throw new Error('Unable to load the catalog')
        return res.json()
      }),
      fetch('/data/meta.json')
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
      fetch('/data/modules.json')
        .then((res) => (res.ok ? res.json() : { collections: [], modules: [] }))
        .catch(() => ({ collections: [], modules: [] })),
    ])
      .then(([list, info, modules]) => {
        if (!alive) return
        const normalizedList = Array.isArray(list)
          ? list.map((r) => ({
              ...r,
              area: canonicalArea(r.area),
            }))
          : []
        const normalizedMeta = info
          ? {
              ...info,
              areas: (info.areas || []).map(canonicalArea),
              byArea: Object.fromEntries(
                Object.entries(info.byArea || {}).map(([k, v]) => [canonicalArea(k), v]),
              ),
            }
          : null
        setResources(normalizedList)
        setMeta(normalizedMeta)
        setModules(modules)
      })
      .catch((err) => {
        if (alive) setError(err)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const value = useMemo(() => {
    const byId = new Map(resources.map((r) => [r.id, r]))

    const areaCounts = new Map()
    const topicMap = new Map()
    const typeCounts = new Map()

    for (const resource of resources) {
      areaCounts.set(resource.area, (areaCounts.get(resource.area) || 0) + 1)
      typeCounts.set(resource.type, (typeCounts.get(resource.type) || 0) + 1)

      if (!topicMap.has(resource.area)) topicMap.set(resource.area, new Map())
      const topics = topicMap.get(resource.area)
      topics.set(resource.topic, (topics.get(resource.topic) || 0) + 1)
    }

    const areas = AREA_ORDER.filter((area) => areaCounts.get(area)).map((area) => ({
      name: area,
      count: areaCounts.get(area) || 0,
      topics: [...(topicMap.get(area) || new Map()).entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    }))

    const types = TYPE_ORDER.filter((type) => typeCounts.get(type)).map((type) => ({
      name: type,
      count: typeCounts.get(type) || 0,
    }))

    const allTopics = []
    for (const area of areas) {
      for (const topic of area.topics) {
        allTopics.push({ area: area.name, topic: topic.name, count: topic.count })
      }
    }
    allTopics.sort((a, b) => b.count - a.count)

    const moduleByPath = new Map(modules.modules.map((m) => [m.path, m]))
    return {
      resources,
      byId,
      meta,
      modules,
      areas,
      types,
      allTopics,
      loading,
      error,
      getResource: (id) => byId.get(id) || null,
      byArea: (area) => {
        const target = canonicalArea(area)
        return resources.filter((r) => r.area === target)
      },
      byTopic: (area, topic) => {
        const target = canonicalArea(area)
        return resources.filter((r) => r.area === target && r.topic === topic)
      },
      byModule: (modulePath) =>
        resources.filter((r) => (r.modulePath || '.') === (modulePath || '.')),
      moduleNode: (modulePath) => moduleByPath.get(modulePath || '.') || null,
      collectionNodes: modules.collections || [],
    }
  }, [resources, meta, modules, loading, error])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider')
  return ctx
}
