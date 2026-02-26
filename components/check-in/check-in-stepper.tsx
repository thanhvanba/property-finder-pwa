"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { StepLocation } from "./step-location";
import { StepBasicInfo } from "./step-basic-info";
import { StepPhotos } from "./step-photos";
import { StepSpecs } from "./step-specs";
import { StepLegal } from "./step-legal";
import { StepReview } from "./step-review";
import { db, dbService, type Property, type PropertyDraft } from "@/lib/db";
import { syncPendingToServer } from "@/lib/sync";

const STEPS = [
  "GPS Location",
  "Basic Info",
  "Photos",
  "Property Specs",
  "Legal & Notes",
  "Review",
];

interface FormData {
  location?: { lat: number; lng: number; accuracy: number };
  basicInfo?: { name: string; phone: string; address: string };
  photos?: { front: Blob; general?: Blob; detail?: Blob };
  specs?: {
    area: number;
    price_min: number;
    price_max: number;
    frontage: number;
    roof_status?: string;
  };
  legal?: { legal_status?: string; notes?: string };
}

export function CheckInStepper() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [draftId] = useState(() => `draft-${Date.now()}`);

  // Auto-save draft
  useEffect(() => {
    const saveDraft = async () => {
      try {
        await dbService.saveDraft({
          id: draftId,
          step: currentStep,
          data: {
            location: formData.location,
            name: formData.basicInfo?.name,
            phone: formData.basicInfo?.phone,
            address: formData.basicInfo?.address,
            photos: formData.photos,
            area: formData.specs?.area,
            price_min: formData.specs?.price_min,
            price_max: formData.specs?.price_max,
            frontage: formData.specs?.frontage,
          },
          updated_at: Date.now(),
        });
      } catch (error) {
        console.error("[CheckIn] Failed to save draft:", error);
      }
    };

    const timer = setTimeout(saveDraft, 500);
    return () => clearTimeout(timer);
  }, [formData, currentStep, draftId]);

  const handleStepComplete = (data: any) => {
    const stepData = {
      location: currentStep === 0 ? data : formData.location,
      basicInfo: currentStep === 1 ? data : formData.basicInfo,
      photos: currentStep === 2 ? data : formData.photos,
      specs: currentStep === 3 ? data : formData.specs,
      legal: currentStep === 4 ? data : formData.legal,
    };

    setFormData(stepData);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const property: Property = {
        id: `prop-${Date.now()}`,
        name: formData.basicInfo!.name,
        phone: formData.basicInfo!.phone,
        address: formData.basicInfo!.address,
        location: formData.location!,
        area: formData.specs!.area,
        price_min: formData.specs!.price_min,
        price_max: formData.specs!.price_max,
        frontage: formData.specs!.frontage,
        photos: formData.photos!,
        roof_status: formData.specs!.roof_status as
          | "yes"
          | "partial"
          | "no"
          | "unknown",
        legal_status: formData.legal!.legal_status as
          | "unknown"
          | "verbal"
          | "pink"
          | "red",
        notes: formData.legal!.notes,
        pipeline_status: "Submitted",
        sync_status: "pending",
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await dbService.submitProperty(property);

      // Try to sync to server in the background (offline-first)
      try {
        await syncPendingToServer();
      } catch {
        // Ignore, will retry later from Pipeline screen
      }
      await dbService.clearDraft(draftId);

      setSubmitSuccess(true);

      setTimeout(() => {
        setCurrentStep(0);
        setFormData({});
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit property",
      );
      setIsSubmitting(false);
    }
  };

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-primary/5 to-background">
        <Card className="w-full max-w-sm p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Property Submitted</h2>
          <p className="text-muted-foreground mb-6">
            Your property check-in has been recorded successfully and will sync
            when online.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to new check-in...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                if (currentStep > 0) {
                  setCurrentStep(currentStep - 1);
                }
              }}
              disabled={currentStep === 0}
              className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold">
              Step {currentStep + 1}/{STEPS.length}
            </span>
            <div className="w-10" />
          </div>

          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-2 text-center">
            <p className="text-sm font-medium text-foreground">
              {STEPS[currentStep]}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {submitError && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{submitError}</span>
          </div>
        )}

        {currentStep === 0 && (
          <StepLocation
            onNext={handleStepComplete}
            initialLocation={formData.location}
          />
        )}

        {currentStep === 1 && (
          <StepBasicInfo
            onNext={handleStepComplete}
            initialData={formData.basicInfo}
          />
        )}

        {currentStep === 2 && (
          <StepPhotos
            onNext={handleStepComplete}
            initialData={formData.photos}
          />
        )}

        {currentStep === 3 && (
          <StepSpecs onNext={handleStepComplete} initialData={formData.specs} />
        )}

        {currentStep === 4 && (
          <StepLegal onNext={handleStepComplete} initialData={formData.legal} />
        )}

        {currentStep === 5 && (
          <StepReview
            data={{
              name: formData.basicInfo!.name,
              phone: formData.basicInfo!.phone,
              address: formData.basicInfo!.address,
              location: formData.location!,
              area: formData.specs!.area,
              price_min: formData.specs!.price_min,
              price_max: formData.specs!.price_max,
              frontage: formData.specs!.frontage,
              photos: formData.photos!,
              roof_status: formData.specs?.roof_status,
              legal_status: formData.legal?.legal_status,
              notes: formData.legal?.notes,
            }}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}
