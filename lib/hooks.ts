'use client';

import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

export function useGeoLocation() {
  const [location, setLocation] = useState<{
    lat: number
    lng: number
    accuracy: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const getCurrentLocation = () => {
    setIsLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setIsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        })
        setIsLoading(false)
      },
      (err) => {
        setError(err.message)
        setIsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  return { location, error, isLoading, getCurrentLocation }
}

export function useImageCompression() {
  const compressImage = async (
    file: File,
    maxSizeKB: number = 300
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img

          // Calculate new dimensions to maintain aspect ratio
          const maxDimension = 1200
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          let quality = 0.8
          let compressed: Blob | null = null

          const compressStep = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'))
                  return
                }

                const sizeKB = blob.size / 1024
                if (sizeKB <= maxSizeKB || quality <= 0.1) {
                  resolve(blob)
                  return
                }

                quality -= 0.1
                compressStep()
              },
              'image/jpeg',
              quality
            )
          }

          compressStep()
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = event.target?.result as string
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  return { compressImage }
}
