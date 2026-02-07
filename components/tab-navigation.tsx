'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2, Layers, Map, Settings, Wifi, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks'

interface TabNavigationProps {
  activeTab: number
  onTabChange: (tab: number) => void
}

const TABS = [
  { id: 0, label: 'Check-in', icon: CheckCircle2 },
  { id: 1, label: 'Pipeline', icon: Layers },
  { id: 2, label: 'Map', icon: Map },
  { id: 3, label: 'Settings', icon: Settings },
]

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const isOnline = useOnlineStatus()

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-20">
        <div className="max-w-2xl mx-auto px-2 py-2">
          <div className="flex gap-1 justify-center">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <Button
                  key={tab.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onTabChange(tab.id)}
                  className="flex-1 flex flex-col items-center gap-1 h-auto py-3"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="fixed top-0 left-0 right-0 flex justify-end p-2 z-10 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1 bg-background/80 backdrop-blur rounded-full border pointer-events-auto">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-600">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-600">Offline</span>
            </>
          )}
        </div>
      </div>
    </>
  )
}
