"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

interface PropertySpecs {
  area: number;
  price_min: number;
  price_max: number;
  frontage: number;
  roof_status?: "yes" | "partial" | "no" | "unknown";
}

interface StepSpecsProps {
  onNext: (data: PropertySpecs) => void;
  initialData?: PropertySpecs;
}

export function StepSpecs({ onNext, initialData }: StepSpecsProps) {
  const [data, setData] = useState<PropertySpecs>(
    initialData || {
      area: 0,
      price_min: 0,
      price_max: 0,
      frontage: 0,
      roof_status: "unknown",
    },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.area || data.area < 50 || data.area > 5000) {
      newErrors.area = "Area must be between 50 and 5000 m²";
    }

    if (data.price_min <= 0) {
      newErrors.price_min = "Minimum price must be greater than 0";
    }

    if (data.price_max <= 0) {
      newErrors.price_max = "Maximum price must be greater than 0";
    }

    if (data.price_max < data.price_min) {
      newErrors.price_max = "Maximum price must be greater than minimum price";
    }

    if (!data.frontage || data.frontage < 1 || data.frontage > 100) {
      newErrors.frontage = "Frontage must be between 1 and 100 meters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext(data);
    }
  };

  const handleNumberChange = (field: keyof PropertySpecs, value: string) => {
    const numValue = parseFloat(value) || 0;
    setData((prev) => ({
      ...prev,
      [field]: numValue,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 4: Property Specs</h2>
        <p className="text-sm text-muted-foreground">
          Enter property dimensions and pricing
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="area" className="text-sm font-medium">
              Area (m²) *
            </Label>
            <Input
              id="area"
              type="number"
              placeholder="50-5000"
              min="50"
              max="5000"
              step="0.1"
              value={data.area || ""}
              onChange={(e) => handleNumberChange("area", e.target.value)}
              className="mt-1"
            />
            {errors.area && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.area}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="frontage" className="text-sm font-medium">
              Frontage (m) *
            </Label>
            <Input
              id="frontage"
              type="number"
              placeholder="1-100"
              min="1"
              max="100"
              step="0.1"
              value={data.frontage || ""}
              onChange={(e) => handleNumberChange("frontage", e.target.value)}
              className="mt-1"
            />
            {errors.frontage && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.frontage}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="price_min" className="text-sm font-medium">
              Min Price (Million VND) *
            </Label>
            <Input
              id="price_min"
              type="number"
              placeholder="0"
              min="0"
              step="0.1"
              value={data.price_min || ""}
              onChange={(e) => handleNumberChange("price_min", e.target.value)}
              className="mt-1"
            />
            {errors.price_min && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.price_min}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="price_max" className="text-sm font-medium">
              Max Price (Million VND) *
            </Label>
            <Input
              id="price_max"
              type="number"
              placeholder="0"
              min="0"
              step="0.1"
              value={data.price_max || ""}
              onChange={(e) => handleNumberChange("price_max", e.target.value)}
              className="mt-1"
            />
            {errors.price_max && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.price_max}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="roof_status" className="text-sm font-medium">
            Roof/Foundation Status
          </Label>
          <Select
            value={data.roof_status || "unknown"}
            onValueChange={(value) => {
              setData((prev) => ({
                ...prev,
                roof_status: value as "yes" | "partial" | "no" | "unknown",
              }));
            }}
          >
            <SelectTrigger id="roof_status" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Unknown</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleNext} className="w-full">
        Continue
      </Button>
    </div>
  );
}
