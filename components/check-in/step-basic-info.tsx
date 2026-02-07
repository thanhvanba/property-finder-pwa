'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'

interface BasicInfo {
  name: string
  phone: string
  address: string
}

interface StepBasicInfoProps {
  onNext: (data: BasicInfo) => void
  initialData?: BasicInfo
}

export function StepBasicInfo({ onNext, initialData }: StepBasicInfoProps) {
  const [data, setData] = useState<BasicInfo>(
    initialData || {
      name: '',
      phone: '',
      address: '',
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validatePhone = (phone: string): boolean => {
    // Vietnamese phone format: +84 or 0, followed by numbers
    const phoneRegex = /^(\+84|0)[0-9]{9,10}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!data.name.trim()) {
      newErrors.name = 'Property name is required'
    } else if (data.name.length > 100) {
      newErrors.name = 'Property name must be 100 characters or less'
    }

    if (!data.phone.trim()) {
      newErrors.phone = 'Owner phone is required'
    } else if (!validatePhone(data.phone)) {
      newErrors.phone = 'Phone format: +84 or 0, followed by 9-10 digits'
    }

    if (!data.address.trim()) {
      newErrors.address = 'Address is required'
    } else if (data.address.length > 500) {
      newErrors.address = 'Address must be 500 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onNext(data)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 2: Basic Information</h2>
        <p className="text-sm text-muted-foreground">
          Enter property and owner details
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Property Name *
          </Label>
          <Input
            id="name"
            placeholder="e.g., Apartment 5B, Building A"
            maxLength={100}
            value={data.name}
            onChange={(e) => {
              setData((prev) => ({ ...prev, name: e.target.value }))
              if (errors.name) {
                setErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors.name
                  return newErrors
                })
              }
            }}
            className="mt-1"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.name}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {data.name.length}/100
          </p>
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium">
            Owner Phone *
          </Label>
          <Input
            id="phone"
            placeholder="+84 or 0, followed by 9-10 digits"
            value={data.phone}
            onChange={(e) => {
              setData((prev) => ({ ...prev, phone: e.target.value }))
              if (errors.phone) {
                setErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors.phone
                  return newErrors
                })
              }
            }}
            className="mt-1"
          />
          {errors.phone && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="address" className="text-sm font-medium">
            Address Details *
          </Label>
          <Textarea
            id="address"
            placeholder="Full address including street, district, and city"
            maxLength={500}
            value={data.address}
            onChange={(e) => {
              setData((prev) => ({ ...prev, address: e.target.value }))
              if (errors.address) {
                setErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors.address
                  return newErrors
                })
              }
            }}
            className="mt-1 min-h-24 resize-none"
          />
          {errors.address && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.address}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {data.address.length}/500
          </p>
        </div>
      </div>

      <Button onClick={handleNext} className="w-full">
        Continue
      </Button>
    </div>
  )
}
