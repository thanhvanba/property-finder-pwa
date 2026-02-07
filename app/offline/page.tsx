'use client'

import { WifiOff } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">You're Offline</h1>
          <p className="text-muted-foreground">
            It looks like you've lost your internet connection. Please check your
            network settings and try again.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try Again
          </Link>
        </div>

        <div className="pt-4 text-sm text-muted-foreground">
          <p>
            Some features may still be available offline. Your data will sync
            when you're back online.
          </p>
        </div>
      </div>
    </div>
  )
}
