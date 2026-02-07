'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MapPin, Calendar, DollarSign, AlertCircle, ImageIcon, Map } from 'lucide-react'
import { dbService, type Property } from '@/lib/db'

export function PipelineScreen() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const props = await dbService.getProperties()
        setProperties(props.sort((a, b) => b.created_at - a.created_at))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load properties')
      } finally {
        setIsLoading(false)
      }
    }

    loadProperties()

    // Refresh every 5 seconds
    const interval = setInterval(loadProperties, 5000)
    return () => clearInterval(interval)
  }, [])

  // Load photo previews when property is selected
  useEffect(() => {
    if (!selectedProperty) {
      return
    }

    const previews: Record<string, string> = {}
    
    if (selectedProperty.photos.front) {
      previews.front = URL.createObjectURL(selectedProperty.photos.front)
    }
    if (selectedProperty.photos.general) {
      previews.general = URL.createObjectURL(selectedProperty.photos.general)
    }
    if (selectedProperty.photos.detail) {
      previews.detail = URL.createObjectURL(selectedProperty.photos.detail)
    }
    
    setPhotoPreviews(previews)

    // Cleanup URLs when component unmounts or property changes
    return () => {
      Object.values(previews).forEach(url => URL.revokeObjectURL(url))
    }
  }, [selectedProperty])

  const handleViewDetails = (property: Property) => {
    setSelectedProperty(property)
  }

  const handleCloseDialog = () => {
    // Cleanup photo URLs
    Object.values(photoPreviews).forEach(url => URL.revokeObjectURL(url))
    setPhotoPreviews({})
    setSelectedProperty(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground animate-pulse">
          Loading properties...
        </p>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <MapPin className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Properties Yet</h3>
        <p className="text-muted-foreground text-center">
          Properties you check in will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Property Pipeline</h2>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-3">
          {properties.map((property) => (
            <Card key={property.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">
                    {property.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {property.address}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {property.sync_status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      Pending
                    </span>
                  )}
                  {property.sync_status === 'synced' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                      Synced
                    </span>
                  )}
                  {property.sync_status === 'error' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
                      Error
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Area</p>
                  <p className="font-semibold">{property.area} m²</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Price</p>
                  <p className="font-semibold">
                    {property.price_min}M - {property.price_max}M VND
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Frontage</p>
                  <p className="font-semibold">{property.frontage}m</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(property.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full bg-transparent"
                onClick={() => handleViewDetails(property)}
              >
                View Details
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Property Detail Dialog */}
      <Dialog open={!!selectedProperty} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProperty?.name}</DialogTitle>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-4 mt-4">
              {/* Basic Info */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Property Name</p>
                    <p className="font-semibold">{selectedProperty.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Owner Phone</p>
                    <p className="font-semibold">{selectedProperty.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedProperty.address}</p>
                  </div>
                </div>
              </Card>

              {/* Location */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  GPS Location
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Latitude</p>
                    <p className="font-mono font-semibold text-sm">
                      {selectedProperty.location.lat.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Longitude</p>
                    <p className="font-mono font-semibold text-sm">
                      {selectedProperty.location.lng.toFixed(6)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                    <p className="text-sm font-semibold">±{selectedProperty.location.accuracy}m</p>
                  </div>
                  <div className="col-span-2 mt-2">
                    <a
                      href={`https://maps.google.com/?q=${selectedProperty.location.lat},${selectedProperty.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition"
                    >
                      <MapPin className="w-4 h-4" />
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              </Card>

              {/* Photos */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Photos
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {photoPreviews.front && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Front View</p>
                      <img
                        src={photoPreviews.front}
                        alt="Front view"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  {photoPreviews.general && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">General View</p>
                      <img
                        src={photoPreviews.general}
                        alt="General view"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  {photoPreviews.detail && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Detail View</p>
                      <img
                        src={photoPreviews.detail}
                        alt="Detail view"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </Card>

              {/* Property Specs */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">Property Specifications</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Area</p>
                    <p className="font-semibold">{selectedProperty.area} m²</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Frontage</p>
                    <p className="font-semibold">{selectedProperty.frontage} m</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Price Range</p>
                    <p className="font-semibold">
                      {selectedProperty.price_min}M - {selectedProperty.price_max}M VND
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Roof Status</p>
                    <p className="font-semibold capitalize">{selectedProperty.roof_status || 'N/A'}</p>
                  </div>
                </div>
              </Card>

              {/* Legal & Notes */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">Legal & Notes</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Legal Status</p>
                    <p className="font-semibold capitalize">{selectedProperty.legal_status || 'N/A'}</p>
                  </div>
                  {selectedProperty.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedProperty.notes}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Metadata */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">Metadata</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Sync Status</span>
                    <span className={`font-semibold ${
                      selectedProperty.sync_status === 'synced' ? 'text-green-600' :
                      selectedProperty.sync_status === 'pending' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {selectedProperty.sync_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Created</span>
                    <span className="font-semibold">
                      {new Date(selectedProperty.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Updated</span>
                    <span className="font-semibold">
                      {new Date(selectedProperty.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
