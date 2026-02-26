'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { dbService, type PipelineStatus, type Property } from '@/lib/db'
import { MapPin, Layers, Clock } from 'lucide-react'

const PIPELINE_ORDER: PipelineStatus[] = [
  'Submitted',
  'Contacted',
  'Qualified',
  'SiteVisited',
  'Negotiating',
  'ClosedWon',
  'ClosedLost',
]

export function DashboardScreen() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const props = await dbService.getProperties()
        setProperties(
          props.sort((a, b) => b.created_at - a.created_at),
        )
      } finally {
        setIsLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => {
    const total = properties.length
    const byPipeline: Record<PipelineStatus, number> = {
      Submitted: 0,
      Contacted: 0,
      Qualified: 0,
      SiteVisited: 0,
      Negotiating: 0,
      ClosedWon: 0,
      ClosedLost: 0,
    }
    let pendingSync = 0

    properties.forEach((p) => {
      byPipeline[p.pipeline_status]++
      if (p.sync_status === 'pending') pendingSync++
    })

    return { total, byPipeline, pendingSync }
  }, [properties])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground animate-pulse">
          Loading dashboard...
        </p>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Layers className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
        <p className="text-muted-foreground text-center">
          Start by creating a new check-in to see your dashboard stats.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Overview of your property pipeline and recent check-ins.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              Total Properties
            </span>
            <span className="text-2xl font-bold text-primary">
              {stats.total}
            </span>
          </Card>

          <Card className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              Pending Sync
            </span>
            <span className="text-2xl font-bold text-amber-600">
              {stats.pendingSync}
            </span>
          </Card>

          <Card className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Won Deals</span>
            <span className="text-2xl font-bold text-green-600">
              {stats.byPipeline.ClosedWon}
            </span>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">
                Pipeline Distribution
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            {PIPELINE_ORDER.map((status) => {
              const count = stats.byPipeline[status]
              if (!count) return null
              const percentage = stats.total
                ? Math.round((count / stats.total) * 100)
                : 0

              return (
                <div
                  key={status}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-muted">
                      {status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {count} properties
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {percentage}%
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Latest Check-ins</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.min(10, properties.length)} most recent
            </span>
          </div>

          <ScrollArea className="max-h-80">
            <div className="divide-y">
              {properties.slice(0, 10).map((p) => (
                <div
                  key={p.id}
                  className="px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {p.address}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                        {p.pipeline_status}
                      </span>
                      {p.sync_status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pending Sync
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <a
                      href={`https://maps.google.com/?q=${p.location.lat},${p.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary"
                    >
                      <MapPin className="w-3 h-3" />
                      Maps
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}

