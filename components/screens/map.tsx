'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { MapPin, Navigation } from 'lucide-react'
import { dbService, type Property } from '@/lib/db'

export function MapScreen() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const props = await dbService.getProperties()
        setProperties(props)

        // Get current location for reference
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground animate-pulse">
          Loading map data...
        </p>
      </div>
    )
  }

  const sortedProperties = currentLocation
    ? properties
        .map((prop) => ({
          ...prop,
          distance: calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            prop.location.lat,
            prop.location.lng
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
    : properties

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <MapPin className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Properties Located</h3>
        <p className="text-muted-foreground text-center">
          Properties will be mapped as you check them in
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Property Locations</h2>

        <div className="space-y-3">
          {sortedProperties.map((property) => {
            const distance = 'distance' in property ? (property.distance as number) : 0
            return (
              <Card key={property.id} className="p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-base mb-1">
                    {property.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {property.address}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Coordinates
                    </p>
                    <p className="font-mono text-xs">
                      {property.location.lat.toFixed(4)}, {property.location.lng.toFixed(4)}
                    </p>
                  </div>
                  {currentLocation && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        Distance
                      </p>
                      <p className="font-semibold">
                        {distance < 1
                          ? `${(distance * 1000).toFixed(0)}m`
                          : `${distance.toFixed(1)}km`}
                      </p>
                    </div>
                  )}
                </div>

                <a
                  href={`https://maps.google.com/?q=${property.location.lat},${property.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition"
                >
                  <MapPin className="w-4 h-4" />
                  Open in Maps
                </a>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
