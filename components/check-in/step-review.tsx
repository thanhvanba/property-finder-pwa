'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, ImageIcon } from 'lucide-react'

interface ReviewData {
  name: string
  phone: string
  address: string
  location: { lat: number; lng: number; accuracy: number }
  area: number
  price_min: number
  price_max: number
  frontage: number
  photos: { front: Blob; general?: Blob; detail?: Blob }
  roof_status?: string
  legal_status?: string
  notes?: string
}

interface StepReviewProps {
  data: ReviewData
  isSubmitting?: boolean
  onSubmit: () => void
  onEdit: (step: number) => void
}

export function StepReview({
  data,
  isSubmitting,
  onSubmit,
  onEdit,
}: StepReviewProps) {
  const [photoCount] = useState(() => {
    let count = 1
    if (data.photos.general) count++
    if (data.photos.detail) count++
    return count
  })

  const ReviewSection = ({
    title,
    step,
    children,
  }: {
    title: string
    step: number
    children: React.ReactNode
  }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(step)}
          className="text-xs"
        >
          Edit
        </Button>
      </div>
      <div className="text-sm space-y-2">{children}</div>
    </Card>
  )

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 6: Review & Submit</h2>
        <p className="text-sm text-muted-foreground">
          Verify all details before submission
        </p>
      </div>

      <div className="space-y-3">
        <ReviewSection title="GPS Location" step={1}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Latitude</p>
              <p className="font-mono font-semibold text-sm">
                {data.location.lat.toFixed(6)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Longitude</p>
              <p className="font-mono font-semibold text-sm">
                {data.location.lng.toFixed(6)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Accuracy</p>
              <p className="text-sm font-semibold">±{data.location.accuracy}m</p>
            </div>
          </div>
        </ReviewSection>

        <ReviewSection title="Basic Information" step={2}>
          <div>
            <p className="text-xs text-muted-foreground">Property Name</p>
            <p className="font-semibold">{data.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Owner Phone</p>
            <p className="font-semibold">{data.phone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="text-sm whitespace-pre-wrap">{data.address}</p>
          </div>
        </ReviewSection>

        <ReviewSection title="Photos" step={3}>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">{photoCount} photo(s) captured</p>
          </div>
          {data.photos.general && (
            <p className="text-xs text-muted-foreground">
              ��� General View included
            </p>
          )}
          {data.photos.detail && (
            <p className="text-xs text-muted-foreground">
              ✓ Detail View included
            </p>
          )}
        </ReviewSection>

        <ReviewSection title="Property Specs" step={4}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Area</p>
              <p className="font-semibold">{data.area} m²</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Frontage</p>
              <p className="font-semibold">{data.frontage} m</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Price Range</p>
              <p className="font-semibold">
                {data.price_min}M - {data.price_max}M VND
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Roof Status</p>
              <p className="font-semibold capitalize">{data.roof_status}</p>
            </div>
          </div>
        </ReviewSection>

        <ReviewSection title="Legal & Notes" step={5}>
          <div>
            <p className="text-xs text-muted-foreground">Legal Status</p>
            <p className="font-semibold capitalize">{data.legal_status}</p>
          </div>
          {data.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}
        </ReviewSection>
      </div>

      <div className="flex items-center gap-2 p-3 bg-primary/10 text-primary rounded-lg">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">All required fields completed</span>
      </div>

      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Submitting...
          </>
        ) : (
          'Submit Property Check-in'
        )}
      </Button>
    </div>
  )
}
