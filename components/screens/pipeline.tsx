"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Calendar, AlertCircle, ImageIcon, Map } from "lucide-react";
import { dbService, type Property } from "@/lib/db";
import { syncFromServerToLocal, syncPendingToServer } from "@/lib/sync";

export function PipelineScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [photoPreviews, setPhotoPreviews] = useState<{
    front?: string;
    general?: string[];
    detail?: string[];
  }>({});
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const safeRevokeObjectURL = (url?: string) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        // Nếu online, sync từ server về local trước khi đọc từ IndexedDB
        if (typeof window !== "undefined" && window.navigator.onLine) {
          await syncFromServerToLocal();
        }

        const props = await dbService.getProperties();
        setProperties(props.sort((a, b) => b.created_at - a.created_at));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load properties",
        );
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      await syncPendingToServer();
      await syncFromServerToLocal();
      const props = await dbService.getProperties();
      setProperties(props.sort((a, b) => b.created_at - a.created_at));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync pipelines");
    } finally {
      setIsSyncing(false);
    }
  };

  // Load photo previews when property is selected
  useEffect(() => {
    if (!selectedProperty) {
      return;
    }

    const createdObjectUrls: string[] = [];
    const previews: {
      front?: string;
      general?: string[];
      detail?: string[];
    } = {};

    if (selectedProperty.photos.front) {
      // front can be a URL string, a Blob/File, or metadata object from server
      if (typeof selectedProperty.photos.front === "string") {
        previews.front = selectedProperty.photos.front;
      } else if (selectedProperty.photos.front instanceof Blob) {
        const url = URL.createObjectURL(selectedProperty.photos.front);
        previews.front = url;
        createdObjectUrls.push(url);
      } else {
        // metadata object
        previews.front = selectedProperty.photos.front.url;
      }
    }

    if (selectedProperty.photos.general && selectedProperty.photos.general.length > 0) {
      previews.general = selectedProperty.photos.general.map((item: any) => {
        if (typeof item === "string") {
          return item;
        }
        if (item instanceof Blob) {
          const url = URL.createObjectURL(item);
          createdObjectUrls.push(url);
          return url;
        }
        return item.url;
      });
    }

    if (selectedProperty.photos.detail && selectedProperty.photos.detail.length > 0) {
      previews.detail = selectedProperty.photos.detail.map((item: any) => {
        if (typeof item === "string") {
          return item;
        }
        if (item instanceof Blob) {
          const url = URL.createObjectURL(item);
          createdObjectUrls.push(url);
          return url;
        }
        return item.url;
      });
    }

    setPhotoPreviews(previews);

    // Cleanup URLs when component unmounts or property changes
    return () => {
      createdObjectUrls.forEach((url) => safeRevokeObjectURL(url));
    };
  }, [selectedProperty]);

  const handleViewDetails = (property: Property) => {
    setSelectedProperty(property);
    setEditProperty(null);
    setIsEditMode(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleEdit = (property: Property) => {
    setSelectedProperty(property);
    setEditProperty(property);
    setIsEditMode(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleCloseDialog = () => {
    // Cleanup photo URLs
    safeRevokeObjectURL(photoPreviews.front);
    photoPreviews.general?.forEach((u) => safeRevokeObjectURL(u));
    photoPreviews.detail?.forEach((u) => safeRevokeObjectURL(u));
    setPhotoPreviews({});
    setSelectedProperty(null);
    setEditProperty(null);
    setIsEditMode(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleFieldChange = <K extends keyof Property>(
    field: K,
    value: Property[K],
  ) => {
    setEditProperty((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleNumberChange = <K extends keyof Property>(
    field: K,
    value: string,
  ) => {
    const num = value === "" ? ("" as unknown as number) : Number(value);
    setEditProperty((prev) =>
      prev
        ? {
            ...prev,
            [field]: (Number.isNaN(num) ? 0 : num) as Property[K],
          }
        : prev,
    );
  };

  const handlePhotoChange = (
    type: "front" | "general" | "detail",
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    setEditProperty((prev) => {
      if (!prev) return prev;

      if (type === "front") {
        const frontFile = fileArray[0];
        return {
          ...prev,
          photos: {
            ...prev.photos,
            front: frontFile,
          },
        };
      }

      const existingArray =
        prev.photos?.[type] && Array.isArray(prev.photos[type])
          ? (prev.photos[type] as (Blob | string)[])
          : [];

      return {
        ...prev,
        photos: {
          ...prev.photos,
          [type]: [...existingArray, ...fileArray],
        },
      };
    });

    setPhotoPreviews((prev) => {
      const urls = fileArray.map((file) => URL.createObjectURL(file));

      if (type === "front") {
        safeRevokeObjectURL(prev.front);
        return {
          ...prev,
          front: urls[0],
        };
      }

      const currentArray = prev[type] ?? [];
      return {
        ...prev,
        [type]: [...currentArray, ...urls],
      };
    });
  };

  const removePhotoAt = (type: "general" | "detail", index: number) => {
    // remove from previews
    setPhotoPreviews((prev) => {
      const arr = prev[type] ?? [];
      const url = arr[index];
      safeRevokeObjectURL(url);
      return {
        ...prev,
        [type]: arr.filter((_, i) => i !== index),
      };
    });

    // remove from editProperty.photos
    setEditProperty((prev) => {
      if (!prev) return prev;
      const current = prev.photos[type];
      const arr = Array.isArray(current) ? current : current ? [current] : [];
      return {
        ...prev,
        photos: {
          ...prev.photos,
          [type]: arr.filter((_, i) => i !== index),
        },
      };
    });
  };

  const clearPhotos = (type: "general" | "detail") => {
    setPhotoPreviews((prev) => {
      prev[type]?.forEach((u) => safeRevokeObjectURL(u));
      return {
        ...prev,
        [type]: [],
      };
    });
    setEditProperty((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        photos: {
          ...prev.photos,
          [type]: [],
        },
      };
    });
  };

  const handleSaveChanges = async () => {
    if (!selectedProperty || !editProperty) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updates: Partial<Property> = {
        name: editProperty.name,
        phone: editProperty.phone,
        address: editProperty.address,
        area: editProperty.area,
        price_min: editProperty.price_min,
        price_max: editProperty.price_max,
        frontage: editProperty.frontage,
        roof_status: editProperty.roof_status,
        legal_status: editProperty.legal_status,
        notes: editProperty.notes,
        photos: editProperty.photos,
      };

      await dbService.updateProperty(selectedProperty.id, updates);

      const updatedAt = Date.now();

      setProperties((prev) =>
        prev.map((p) =>
          p.id === selectedProperty.id
            ? {
                ...p,
                ...updates,
                updated_at: updatedAt,
              }
            : p,
        ),
      );

      setSelectedProperty((prev) =>
        prev
          ? {
              ...prev,
              ...updates,
              updated_at: updatedAt,
            }
          : prev,
      );

      // Nếu online, sau khi lưu local thì sync ngay lên server
      if (typeof window !== "undefined" && window.navigator.onLine) {
        try {
          await syncPendingToServer();
          await syncFromServerToLocal();
          const synced = await dbService.getProperties();
          setProperties(
            synced.sort((a, b) => b.created_at - a.created_at),
          );
        } catch (err) {
          console.error("[Pipeline] Failed to sync updated property:", err);
        }
      }

      setSaveSuccess(true);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update property",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground animate-pulse">
          Loading properties...
        </p>
      </div>
    );
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
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Property Pipeline</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing..." : "Sync now"}
          </Button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-3">
          {properties.map((property) => (
            <Card
              key={property.id}
              className="p-4 hover:shadow-md transition-shadow"
            >
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
                  {property.sync_status === "pending" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      Pending
                    </span>
                  )}
                  {property.sync_status === "synced" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                      Synced
                    </span>
                  )}
                  {property.sync_status === "error" && (
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
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => handleViewDetails(property)}
                >
                  View Details
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(property)}
                >
                  Update
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Property Detail Dialog */}
      <Dialog open={!!selectedProperty} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode
                ? editProperty?.name || selectedProperty?.name
                : selectedProperty?.name}
            </DialogTitle>
          </DialogHeader>

          {/* View-only mode */}
          {selectedProperty && !isEditMode && (
            <div className="space-y-4 mt-4">
              {/* Basic Info */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  Basic Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Property Name
                    </p>
                    <p className="font-semibold">{selectedProperty.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Owner Phone</p>
                    <p className="font-semibold">{selectedProperty.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedProperty.address}
                    </p>
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
                    <p className="text-sm font-semibold">
                      ±{selectedProperty.location.accuracy}m
                    </p>
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
                      <p className="text-xs text-muted-foreground mb-2">
                        Front View
                      </p>
                      <img
                        src={photoPreviews.front}
                        alt="Front view"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  {photoPreviews.general && photoPreviews.general.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        General View
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {photoPreviews.general.map((src, idx) => (
                          <img
                            key={idx}
                            src={src}
                            alt={`General ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {photoPreviews.detail && photoPreviews.detail.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Detail View
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {photoPreviews.detail.map((src, idx) => (
                          <img
                            key={idx}
                            src={src}
                            alt={`Detail ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Property Specs */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  Property Specifications
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Area</p>
                    <p className="font-semibold">{selectedProperty.area} m²</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Frontage</p>
                    <p className="font-semibold">
                      {selectedProperty.frontage} m
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Price Range</p>
                    <p className="font-semibold">
                      {selectedProperty.price_min}M -{" "}
                      {selectedProperty.price_max}M VND
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Roof Status</p>
                    <p className="font-semibold capitalize">
                      {selectedProperty.roof_status || "N/A"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Legal & Notes */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">Legal & Notes</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Legal Status
                    </p>
                    <p className="font-semibold capitalize">
                      {selectedProperty.legal_status || "N/A"}
                    </p>
                  </div>
                  {selectedProperty.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedProperty.notes}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Metadata */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">Metadata</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      Sync Status
                    </span>
                    <span
                      className={`font-semibold ${
                        selectedProperty.sync_status === "synced"
                          ? "text-green-600"
                          : selectedProperty.sync_status === "pending"
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {selectedProperty.sync_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      Created
                    </span>
                    <span className="font-semibold">
                      {new Date(selectedProperty.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      Updated
                    </span>
                    <span className="font-semibold">
                      {new Date(selectedProperty.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Edit mode */}
          {selectedProperty && isEditMode && editProperty && (
            <div className="space-y-4 mt-4">
              {/* Basic Info */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  Basic Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Property Name
                    </p>
                    <Input
                      value={editProperty.name}
                      onChange={(e) =>
                        handleFieldChange("name", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Owner Phone
                    </p>
                    <Input
                      value={editProperty.phone}
                      onChange={(e) =>
                        handleFieldChange("phone", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Address
                    </p>
                    <Textarea
                      value={editProperty.address}
                      onChange={(e) =>
                        handleFieldChange("address", e.target.value)
                      }
                      className="text-sm"
                      rows={3}
                    />
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
                    <p className="text-sm font-semibold">
                      ±{selectedProperty.location.accuracy}m
                    </p>
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
                  {/* Front */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Front View
                    </p>
                    {photoPreviews.front ? (
                      <img
                        src={photoPreviews.front}
                        alt="Front view"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-48 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                        No front photo. You can upload one below.
                      </div>
                    )}
                    <input
                      id={`pipeline-photo-${selectedProperty.id}-front-cam`}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) =>
                        handlePhotoChange("front", e.target.files)
                      }
                    />
                    <input
                      id={`pipeline-photo-${selectedProperty.id}-front-lib`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handlePhotoChange("front", e.target.files)
                      }
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label
                        htmlFor={`pipeline-photo-${selectedProperty.id}-front-cam`}
                        className="cursor-pointer text-xs inline-flex items-center justify-center rounded-md border px-3 py-2 hover:bg-muted"
                      >
                        Chụp ảnh
                      </label>
                      <label
                        htmlFor={`pipeline-photo-${selectedProperty.id}-front-lib`}
                        className="cursor-pointer text-xs inline-flex items-center justify-center rounded-md border px-3 py-2 hover:bg-muted"
                      >
                        Chọn từ thư viện
                      </label>
                    </div>
                  </div>

                  {/* General */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      General View
                    </p>
                    {photoPreviews.general && photoPreviews.general.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {photoPreviews.general.map((src, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={src}
                              alt={`General ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removePhotoAt("general", idx)}
                              className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full hover:bg-destructive/90"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => clearPhotos("general")}
                            className="text-xs text-destructive hover:underline"
                          >
                            Clear all general photos
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-48 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                        No general photo. You can upload one below.
                      </div>
                    )}
                    <input
                      id={`pipeline-photo-${selectedProperty.id}-general-cam`}
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="hidden"
                      onChange={(e) =>
                        handlePhotoChange("general", e.target.files)
                      }
                    />
                    <input
                      id={`pipeline-photo-${selectedProperty.id}-general-lib`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) =>
                        handlePhotoChange("general", e.target.files)
                      }
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label
                        htmlFor={`pipeline-photo-${selectedProperty.id}-general-cam`}
                        className="cursor-pointer text-xs inline-flex items-center justify-center rounded-md border px-3 py-2 hover:bg-muted"
                      >
                        Chụp ảnh
                      </label>
                      <label
                        htmlFor={`pipeline-photo-${selectedProperty.id}-general-lib`}
                        className="cursor-pointer text-xs inline-flex items-center justify-center rounded-md border px-3 py-2 hover:bg-muted"
                      >
                        Chọn từ thư viện
                      </label>
                    </div>
                  </div>

                  {/* Detail */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Detail View
                    </p>
                    {photoPreviews.detail && photoPreviews.detail.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {photoPreviews.detail.map((src, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={src}
                              alt={`Detail ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removePhotoAt("detail", idx)}
                              className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full hover:bg-destructive/90"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => clearPhotos("detail")}
                            className="text-xs text-destructive hover:underline"
                          >
                            Clear all detail photos
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-48 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                        No detail photo. You can upload one below.
                      </div>
                    )}
                    <input
                      id={`pipeline-photo-${selectedProperty.id}-detail-cam`}
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="hidden"
                      onChange={(e) =>
                        handlePhotoChange("detail", e.target.files)
                      }
                    />
                    <input
                      id={`pipeline-photo-${selectedProperty.id}-detail-lib`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) =>
                        handlePhotoChange("detail", e.target.files)
                      }
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label
                        htmlFor={`pipeline-photo-${selectedProperty.id}-detail-cam`}
                        className="cursor-pointer text-xs inline-flex items-center justify-center rounded-md border px-3 py-2 hover:bg-muted"
                      >
                        Chụp ảnh
                      </label>
                      <label
                        htmlFor={`pipeline-photo-${selectedProperty.id}-detail-lib`}
                        className="cursor-pointer text-xs inline-flex items-center justify-center rounded-md border px-3 py-2 hover:bg-muted"
                      >
                        Chọn từ thư viện
                      </label>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Property Specs */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  Property Specifications
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Area</p>
                    <Input
                      type="number"
                      value={editProperty.area}
                      onChange={(e) =>
                        handleNumberChange("area", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Frontage</p>
                    <Input
                      type="number"
                      value={editProperty.frontage}
                      onChange={(e) =>
                        handleNumberChange("frontage", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Price Range</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={editProperty.price_min}
                        onChange={(e) =>
                          handleNumberChange("price_min", e.target.value)
                        }
                        className="h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="number"
                        value={editProperty.price_max}
                        onChange={(e) =>
                          handleNumberChange("price_max", e.target.value)
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Roof Status</p>
                    <Select
                      value={editProperty.roof_status || "unknown"}
                      onValueChange={(value) =>
                        handleFieldChange(
                          "roof_status",
                          value as Property["roof_status"],
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
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
              </Card>

              {/* Legal & Notes */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">Legal & Notes</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Legal Status
                    </p>
                    <Select
                      value={editProperty.legal_status || "unknown"}
                      onValueChange={(value) =>
                        handleFieldChange(
                          "legal_status",
                          value as Property["legal_status"],
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Unknown</SelectItem>
                        <SelectItem value="verbal">Verbal</SelectItem>
                        <SelectItem value="pink">Pink Book</SelectItem>
                        <SelectItem value="red">Red Book</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <Textarea
                      value={editProperty.notes || ""}
                      onChange={(e) =>
                        handleFieldChange("notes", e.target.value)
                      }
                      className="text-sm"
                      rows={3}
                    />
                  </div>
                </div>
              </Card>

              {/* Metadata */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">Metadata</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      Sync Status
                    </span>
                    <span
                      className={`font-semibold ${
                        selectedProperty.sync_status === "synced"
                          ? "text-green-600"
                          : selectedProperty.sync_status === "pending"
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {selectedProperty.sync_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      Created
                    </span>
                    <span className="font-semibold">
                      {new Date(selectedProperty.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      Updated
                    </span>
                    <span className="font-semibold">
                      {new Date(selectedProperty.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  {saveError && (
                    <p className="text-xs text-destructive">{saveError}</p>
                  )}
                  {saveSuccess && !saveError && (
                    <p className="text-xs text-green-600">Changes saved.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={isSaving}
                  >
                    Close
                  </Button>
                  <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
