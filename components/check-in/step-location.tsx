'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, MapPin, RefreshCw } from 'lucide-react'
import { useGeoLocation } from '@/lib/hooks'

interface StepLocationProps {
  onNext: (location: { lat: number; lng: number; accuracy: number }) => void
  initialLocation?: { lat: number; lng: number; accuracy: number }
}

export function StepLocation({ onNext, initialLocation }: StepLocationProps) {
  const { location, error, isLoading, getCurrentLocation } = useGeoLocation()
  const [displayLocation, setDisplayLocation] = useState(initialLocation)

  useEffect(() => {
    if (!displayLocation) {
      getCurrentLocation()
    }
  }, [])

  useEffect(() => {
    if (location) {
      setDisplayLocation(location)
    }
  }, [location])

  const handleRetry = () => {
    getCurrentLocation()
  }

  const handleNext = () => {
    if (displayLocation) {
      onNext(displayLocation)
    }
  }

  const isAccurate = (displayLocation?.accuracy || 0) <= 50

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 1: GPS Location</h2>
        <p className="text-sm text-muted-foreground">
          Capture your property location for accurate record-keeping
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {displayLocation && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="w-5 h-5" />
            <span className="font-semibold">Location Captured</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Latitude</p>
              <p className="font-mono font-semibold">
                {displayLocation.lat.toFixed(6)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Longitude</p>
              <p className="font-mono font-semibold">
                {displayLocation.lng.toFixed(6)}
              </p>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
            <p className="font-semibold text-sm">
              ±{displayLocation.accuracy} meters
            </p>
            {!isAccurate && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                ⚠️ Accuracy is below recommended (50m). Please retry or check GPS settings.
              </p>
            )}
          </div>
        </Card>
      )}

      {isLoading && (
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Getting location...
          </p>
        </Card>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={handleRetry}
          disabled={isLoading}
          className="flex-1 bg-transparent"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Recapture
        </Button>
        <Button
          onClick={handleNext}
          disabled={!displayLocation || isLoading}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
