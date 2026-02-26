// Gọi qua API route nội bộ của Next.js để tránh CORS
const API_BASE = "/api/realestate/v1";

export interface ApiPhotoFile {
  fileId: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface ApiProperty {
  _id: string;
  name: string;
  phone: string;
  address: string;
  location: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  area: number;
  price_min: number;
  price_max: number;
  notes?: string;
  roof_status?: "yes" | "partial" | "no" | "unknown";
  legal_status?: "unknown" | "verbal" | "pink" | "red";
  pipeline_status: "New" | "Done" | "Submitted";
  sync_status: "pending" | "synced" | "error";
  createdAt: string;
  updatedAt: string;
  photos?: {
    front?: ApiPhotoFile;
    gallery?: ApiPhotoFile[];
    detail?: ApiPhotoFile[];
  };
}

export interface ApiListResponse {
  data: ApiProperty[];
}

export interface ApiDetailResponse {
  data: ApiProperty;
}

export async function fetchPipelines(): Promise<ApiProperty[]> {
  const res = await fetch(`${API_BASE}/properties`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch pipelines: ${res.status}`);
  }

  const json = (await res.json()) as ApiListResponse;
  return json.data ?? [];
}

export async function fetchPipelineById(id: string): Promise<ApiProperty> {
  const res = await fetch(`${API_BASE}/properties/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch pipeline detail: ${res.status}`);
  }

  const json = (await res.json()) as ApiDetailResponse;
  return json.data;
}

