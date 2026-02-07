'use client'

import { useState } from 'react'
import { CheckInStepper } from '@/components/check-in/check-in-stepper'
import { PipelineScreen } from '@/components/screens/pipeline'
import { MapScreen } from '@/components/screens/map'
import { SettingsScreen } from '@/components/screens/settings'
import { TabNavigation } from '@/components/tab-navigation'

export default function Page() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <main className="min-h-screen bg-background">
      {activeTab === 0 && <CheckInStepper />}
      {activeTab === 1 && <PipelineScreen />}
      {activeTab === 2 && <MapScreen />}
      {activeTab === 3 && <SettingsScreen />}

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  )
}
