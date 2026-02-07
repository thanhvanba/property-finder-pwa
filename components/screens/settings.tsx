'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Trash2, DownloadCloud } from 'lucide-react'
import { dbService } from '@/lib/db'

export function SettingsScreen() {
  const [propertyCount, setPropertyCount] = useState(0)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [isClearing, setIsClearing] = useState(false)
  const [clearMessage, setClearMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const props = await dbService.getProperties()
        setPropertyCount(props.length)

        const pending = await dbService.getPendingSync()
        setPendingSyncCount(pending.length)
      } catch (error) {
        console.error('[Settings] Failed to load stats:', error)
      }
    }

    loadStats()
    const interval = setInterval(loadStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleClearDatabase = async () => {
    if (!window.confirm('Are you sure? This will delete all stored properties.')) {
      return
    }

    setIsClearing(true)

    try {
      const db = (await import('@/lib/db')).db
      await db.properties.clear()
      await db.drafts.clear()
      setPropertyCount(0)
      setPendingSyncCount(0)
      setClearMessage('Database cleared successfully')

      setTimeout(() => setClearMessage(null), 3000)
    } catch (error) {
      setClearMessage(
        `Error clearing database: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsClearing(false)
    }
  }

  const handleExportData = async () => {
    try {
      const props = await dbService.getProperties()
      const exportData = props.map((prop) => ({
        id: prop.id,
        name: prop.name,
        phone: prop.phone,
        address: prop.address,
        location: prop.location,
        area: prop.area,
        price_min: prop.price_min,
        price_max: prop.price_max,
        frontage: prop.frontage,
        roof_status: prop.roof_status,
        legal_status: prop.legal_status,
        notes: prop.notes,
        sync_status: prop.sync_status,
        created_at: new Date(prop.created_at).toISOString(),
        updated_at: new Date(prop.updated_at).toISOString(),
      }))

      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `properties-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Settings & Database</h2>

        {clearMessage && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm font-medium ${
              clearMessage.includes('cleared')
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {clearMessage}
          </div>
        )}

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Database Status</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">
                  Total Properties
                </p>
                <p className="text-2xl font-bold text-primary">
                  {propertyCount}
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Pending Sync</p>
                <p className="text-2xl font-bold text-amber-600">
                  {pendingSyncCount}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              All property data is stored locally on your device using IndexedDB.
              Pending items will sync when internet connection is restored.
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">Data Management</h3>

            <div className="space-y-3">
              <Button
                onClick={handleExportData}
                variant="outline"
                className="w-full justify-start bg-transparent"
              >
                <DownloadCloud className="w-4 h-4 mr-2" />
                Export All Data (JSON)
              </Button>

              <Button
                onClick={handleClearDatabase}
                disabled={isClearing || propertyCount === 0}
                variant="destructive"
                className="w-full justify-start"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isClearing ? 'Clearing...' : 'Clear All Data'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              ⚠️ Clearing data will permanently delete all stored properties.
              Export first if you need a backup.
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Application Info</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">App Version</span>
                <span className="font-medium">1.0.0 (Beta)</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage Type</span>
                <span className="font-medium">IndexedDB</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Offline Support
                </span>
                <span className="font-medium">Enabled (PWA)</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Worker</span>
                <ServiceWorkerStatus />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">Offline Ready</p>
                <p className="text-blue-800">
                  This app is fully functional offline. All check-ins are saved
                  locally and will sync automatically when connection is restored.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ServiceWorkerStatus() {
  const [status, setStatus] = useState<string>('Checking...')

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          setStatus(
            registrations.length > 0 ? 'Active' : 'Not Registered'
          )
        })
        .catch(() => {
          setStatus('Error')
        })
    } else {
      setStatus('Not Supported')
    }
  }, [])

  return <span className="font-medium">{status}</span>
}
