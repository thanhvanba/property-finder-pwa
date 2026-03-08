"use client";

import React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Camera, X } from "lucide-react";
import { useImageCompression } from "@/lib/hooks";

interface Photos {
  front: Blob | null;
  // general & detail là mảng ảnh
  general: Blob[];
  detail: Blob[];
}

interface StepPhotosProps {
  onNext: (data: Photos) => void;
  initialData?: Photos;
}

export function StepPhotos({ onNext, initialData }: StepPhotosProps) {
  const [photos, setPhotos] = useState<Photos>(
    initialData || {
      front: null,
      general: [],
      detail: [],
    },
  );
  const [previews, setPreviews] = useState<Record<string, string[] | string>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const { compressImage } = useImageCompression();

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handlePhotoCaptureSingle = async (file: File) => {
    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError(
        `File size must be less than 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
      return;
    }

    setIsCompressing(true);

    try {
      const compressed = await compressImage(file, 300);
      setPhotos((prev) => ({
        ...prev,
        front: compressed,
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => ({
          ...prev,
          front: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      setError(
        `Failed to process image: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setIsCompressing(false);
    }
  };

  // Thêm nhiều ảnh cho general/detail
  const handlePhotoCaptureMulti = async (
    type: "general" | "detail",
    files: FileList,
  ) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setError(null);
    setIsCompressing(true);

    try {
      const newBlobs: Blob[] = [];
      const newPreviews: string[] = [];

      for (const file of fileArray) {
        if (file.size > MAX_FILE_SIZE) {
          setError(
            `File size must be less than 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          );
          continue;
        }

        const compressed = await compressImage(file, 300);
        newBlobs.push(compressed);

        const preview = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(compressed);
        });
        newPreviews.push(preview);
      }

      if (newBlobs.length > 0) {
        setPhotos((prev) => ({
          ...prev,
          [type]: [...prev[type], ...newBlobs],
        }));

        setPreviews((prev) => ({
          ...prev,
          [type]: [
            ...(Array.isArray(prev[type]) ? (prev[type] as string[]) : []),
            ...newPreviews,
          ],
        }));
      }
    } catch (err) {
      setError(
        `Failed to process image: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileInput = async (
    type: "front" | "general" | "detail",
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (type === "front") {
      await handlePhotoCaptureSingle(files[0]);
    } else {
      await handlePhotoCaptureMulti(type, files);
    }
  };

  const removePhoto = (type: "front" | "general" | "detail") => {
    if (type === "front") {
      setPhotos((prev) => ({
        ...prev,
        front: null,
      }));
      setPreviews((prev) => {
        const { front, ...rest } = prev;
        return rest;
      });
    } else {
      setPhotos((prev) => ({
        ...prev,
        [type]: [],
      }));
      setPreviews((prev) => ({
        ...prev,
        [type]: [],
      }));
    }
  };

  const handleNext = () => {
    if (photos.front) {
      onNext(photos);
    }
  };

  const PhotoUploadCard = ({
    label,
    type,
    required = false,
  }: {
    label: string;
    type: "front" | "general" | "detail";
    required?: boolean;
  }) => {
    const hasPhoto =
      type === "front"
        ? !!photos.front
        : photos[type] && photos[type].length > 0;
    const preview = previews[type];
    const cameraInputRef = React.useRef<HTMLInputElement>(null);
    const galleryInputRef = React.useRef<HTMLInputElement>(null);

    return (
      <div>
        <label className="text-sm font-medium mb-2 block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {hasPhoto && preview ? (
          <div className="space-y-2">
            {type === "front" && typeof preview === "string" && (
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
            )}
            {type !== "front" &&
              Array.isArray(preview) &&
              preview.map((p, idx) => (
                <Card key={idx} className="relative overflow-hidden bg-muted">
                  <img
                    src={p || "/placeholder.svg"}
                    alt={`${label} ${idx + 1}`}
                    className="w-full h-48 object-cover"
                  />
                </Card>
              ))}
            <button
              onClick={() => removePhoto(type)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-destructive hover:underline"
            >
              <X className="w-3 h-3" />
              Clear {label.toLowerCase()}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              multiple={type !== "front"}
              capture="environment"
              onChange={(e) => handleFileInput(type, e)}
              disabled={isCompressing}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple={type !== "front"}
              onChange={(e) => handleFileInput(type, e)}
              disabled={isCompressing}
              className="hidden"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={isCompressing}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2"
              >
                <Camera className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs font-medium">Take Photo</span>
              </button>
              <button
                onClick={() => galleryInputRef.current?.click()}
                disabled={isCompressing}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2"
              >
                <svg
                  className="w-6 h-6 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs font-medium">From Gallery</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
  );
}
