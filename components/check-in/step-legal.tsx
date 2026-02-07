'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LegalInfo {
  legal_status?: 'unknown' | 'verbal' | 'pink' | 'red'
  notes?: string
}

interface StepLegalProps {
  onNext: (data: LegalInfo) => void
  initialData?: LegalInfo
}

export function StepLegal({ onNext, initialData }: StepLegalProps) {
  const [data, setData] = useState<LegalInfo>(
    initialData || {
      legal_status: 'unknown',
      notes: '',
    }
  )

  const handleNext = () => {
    onNext(data)
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 5: Legal & Notes</h2>
        <p className="text-sm text-muted-foreground">
          Record legal status and additional observations
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="legal_status" className="text-sm font-medium">
            Legal Status
          </Label>
          <Select
            value={data.legal_status || 'unknown'}
            onValueChange={(value) => {
              setData((prev) => ({
                ...prev,
                legal_status: value as 'unknown' | 'verbal' | 'pink' | 'red',
              }))
            }}
          >
            <SelectTrigger id="legal_status" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Unknown</SelectItem>
              <SelectItem value="verbal">Verbal Agreement</SelectItem>
              <SelectItem value="pink">Pink Book</SelectItem>
              <SelectItem value="red">Red Book</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1.5">
            Pink Book: Interim certificate | Red Book: Full ownership certificate
          </p>
        </div>

        <div>
          <Label htmlFor="notes" className="text-sm font-medium">
            Additional Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Record any observations, conditions, or special notes about the property..."
            maxLength={1000}
            value={data.notes || ''}
            onChange={(e) => {
              setData((prev) => ({ ...prev, notes: e.target.value }))
            }}
            className="mt-1 min-h-32 resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {(data.notes || '').length}/1000
          </p>
        </div>
      </div>

      <Button onClick={handleNext} className="w-full">
        Continue
      </Button>
    </div>
  )
}
