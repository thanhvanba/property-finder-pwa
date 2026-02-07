'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Camera, X } from 'lucide-react'
import { useImageCompression } from '@/lib/hooks'

interface Photos {
  front: Blob | null
  general: Blob | null
  detail: Blob | null
}

interface StepPhotosProps {
  onNext: (data: Photos) => void
  initialData?: Photos
}

export function StepPhotos({ onNext, initialData }: StepPhotosProps) {
  const [photos, setPhotos] = useState<Photos>(
    initialData || {
      front: null,
      general: null,
      detail: null,
    }
  )
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const { compressImage } = useImageCompression()

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  const handlePhotoCapture = async (
    type: 'front' | 'general' | 'detail',
    file: File
  ) => {
    setError(null)

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size must be less than 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    setIsCompressing(true)

    try {
      const compressed = await compressImage(file, 300)
      setPhotos((prev) => ({
        ...prev,
        [type]: compressed,
      }))

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviews((prev) => ({
          ...prev,
          [type]: e.target?.result as string,
        }))
      }
      reader.readAsDataURL(compressed)
    } catch (err) {
      setError(`Failed to process image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleFileInput = async (
    type: 'front' | 'general' | 'detail',
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      await handlePhotoCapture(type, file)
    }
  }

  const removePhoto = (type: 'front' | 'general' | 'detail') => {
    setPhotos((prev) => ({
      ...prev,
      [type]: null,
    }))
    setPreviews((prev) => {
      const newPreviews = { ...prev }
      delete newPreviews[type]
      return newPreviews
    })
  }

  const handleNext = () => {
    if (photos.front) {
      onNext(photos)
    }
  }

  const PhotoUploadCard = ({
    label,
    type,
    required = false,
  }: {
    label: string
    type: 'front' | 'general' | 'detail'
    required?: boolean
  }) => {
    const hasPhoto = !!photos[type]
    const preview = previews[type]

    return (
      <div>
        <label className="text-sm font-medium mb-2 block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {hasPhoto && preview ? (
          <Card className="relative overflow-hidden bg-muted">
            <img
              src={preview || "/placeholder.svg"}
              alt={label}
              className="w-full h-48 object-cover"
            />
            <button
              onClick={() => removePhoto(type)}
              className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full hover:bg-destructive/90"
            >
              <X className="w-4 h-4" />
            </button>
          </Card>
        ) : (
          <label className="block">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileInput(type, e)}
              disabled={isCompressing}
              className="hidden"
            />
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition">
              <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Take Photo</p>
              <p className="text-xs text-muted-foreground mt-1">
                or upload from gallery
              </p>
            </div>
          </label>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 3: Photos</h2>
        <p className="text-sm text-muted-foreground">
          Capture property views (at least front view required)
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <PhotoUploadCard label="Front View" type="front" required />
        <PhotoUploadCard label="General View" type="general" />
        <PhotoUploadCard label="Detail View" type="detail" />
      </div>

      {isCompressing && (
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground animate-pulse">
            Processing image...
          </p>
        </div>
      )}

      <Button
        onClick={handleNext}
        disabled={!photos.front || isCompressing}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  )
}
