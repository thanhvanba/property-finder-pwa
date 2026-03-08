import { db, dbService, type Property } from "./db";
import { fetchPipelines, fetchImageKitAuth, type ApiProperty } from "./api";

// Nội bộ gọi qua Next API để tránh CORS
const INTERNAL_API_BASE = "/api/realestate/v1";

function mapApiToLocalProperty(
  api: ApiProperty,
  existing?: Property | null,
): Property {
  const createdAt = new Date(api.createdAt).getTime();
  const updatedAt = new Date(api.updatedAt).getTime();

  return {
    // Sau khi đã sync, id local trùng với _id của server
    id: existing?.id ?? api._id,
    remote_id: api._id,
    name: api.name,
    phone: api.phone,
    address: api.address,
    location: {
      lat: api.location.lat,
      lng: api.location.lng,
      accuracy: api.location.accuracy,
    },
    area: api.area,
    price_min: api.price_min,
    price_max: api.price_max,
    // Giữ lại frontage local nếu có, vì API không có field này
    frontage: existing?.frontage ?? 0,
    photos: {
      // Ưu tiên metadata từ server nếu có, fallback sang ảnh local
      front: api.photos?.front
        ? {
            fileId: api.photos.front.fileId,
            url: api.photos.front.url,
            thumbnailUrl: api.photos.front.thumbnailUrl,
            width: api.photos.front.width,
            height: api.photos.front.height,
          }
        : existing?.photos.front ?? "",
      // general & detail: map toàn bộ mảng gallery/detail từ server
      general: api.photos?.gallery
        ? api.photos.gallery.map((g) => ({
            fileId: g.fileId,
            url: g.url,
            thumbnailUrl: g.thumbnailUrl,
            width: g.width,
            height: g.height,
          }))
        : existing?.photos.general,
      detail: api.photos?.detail
        ? api.photos.detail.map((d) => ({
            fileId: d.fileId,
            url: d.url,
            thumbnailUrl: d.thumbnailUrl,
            width: d.width,
            height: d.height,
          }))
        : existing?.photos.detail,
    },
    roof_status: api.roof_status,
    legal_status: api.legal_status,
    notes: api.notes,
    pipeline_status: api.pipeline_status ?? existing?.pipeline_status ?? "New",
    // Dữ liệu lấy từ server luôn coi là đã sync xong ở phía client
    sync_status: existing?.sync_status ?? "synced",
    created_at: existing?.created_at ?? createdAt,
    updated_at: updatedAt,
  };
}

export async function syncFromServerToLocal(): Promise<void> {
  const remote = await fetchPipelines();

  await db.transaction("rw", db.properties, async () => {
    for (const apiProp of remote) {
      // Sau khi đã sync, id local trùng với _id server,
      // nên có thể lấy trực tiếp theo key này.
      const existing = await db.properties.get(apiProp._id as any);
      const mapped = mapApiToLocalProperty(apiProp, existing);
      await db.properties.put(mapped);
    }
  });
}

interface UploadedImageMeta {
  fileId: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

type PhotoPayloadItem =
  | UploadedImageMeta
  | { url: string }
  | {
      fileId: string;
      url: string;
      thumbnailUrl?: string;
      width?: number;
      height?: number;
    };

function normalizeToArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toPhotoPayloadArray(
  value:
    | undefined
    | Blob
    | string
    | PhotoPayloadItem
    | Array<Blob | string | PhotoPayloadItem>,
): PhotoPayloadItem[] {
  return normalizeToArray<any>(value)
    .filter((item) => !(item instanceof Blob))
    .map((item) => (typeof item === "string" ? { url: item } : item));
}

function dedupeByUrl(items: PhotoPayloadItem[]): PhotoPayloadItem[] {
  const byUrl = new Map<string, PhotoPayloadItem>();

  for (const item of items) {
    const url = (item as any)?.url;
    if (!url) continue;

    const existing = byUrl.get(url);

    if (!existing) {
      // First time we see this URL
      byUrl.set(url, item);
      continue;
    }

    const existingHasFileId = !!(existing as any).fileId;
    const currentHasFileId = !!(item as any).fileId;

    // Prefer the entry that has fileId metadata, so we don't lose it
    if (!existingHasFileId && currentHasFileId) {
      byUrl.set(url, item);
    }
  }

  return Array.from(byUrl.values());
}

async function uploadPhotoToImageKit(
  file: Blob,
  fileName: string,
  folder = "real-estate",
): Promise<UploadedImageMeta> {
  const auth = await fetchImageKitAuth();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("publicKey", auth.publicKey);
  formData.append("token", auth.token);
  formData.append("signature", auth.signature);
  formData.append("expire", String(auth.expire));
  formData.append("folder", folder);
  formData.append("useUniqueFileName", "true");
  formData.append("tags", "real-estate");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload image to ImageKit: ${res.status}`);
  }

  const json = (await res.json()) as {
    fileId: string;
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
  };

  return {
    fileId: json.fileId,
    url: json.url,
    thumbnailUrl: json.thumbnailUrl,
    width: json.width,
    height: json.height,
  };
}

async function ensurePropertyPhotosUploaded(
  property: Property,
): Promise<{
  property: Property;
  uploadedMeta: {
    front?: UploadedImageMeta;
    general?: UploadedImageMeta[];
    detail?: UploadedImageMeta[];
  };
}> {
  if (!property.photos) {
    return { property, uploadedMeta: {} };
  }

  let changed = false;
  const updatedPhotos = { ...property.photos };
  const uploadedMeta: {
    front?: UploadedImageMeta;
    general?: UploadedImageMeta[];
    detail?: UploadedImageMeta[];
  } = {};

  const toArray = <T,>(value: T | T[] | undefined): T[] =>
    value === undefined ? [] : Array.isArray(value) ? value : [value];

  if (updatedPhotos.front && updatedPhotos.front instanceof Blob) {
    const uploaded = await uploadPhotoToImageKit(
      updatedPhotos.front,
      `${property.id}-front`,
    );
    updatedPhotos.front = uploaded.url;
    uploadedMeta.front = uploaded;
    changed = true;
  }

  // general: mảng ảnh
  if (updatedPhotos.general) {
    const generalArray = toArray<
      Blob | string | { fileId: string; url: string }
    >(updatedPhotos.general as any);

    const newGeneral: Array<string | { fileId: string; url: string }> = [];
    const uploadedGeneral: UploadedImageMeta[] = [];

    for (let index = 0; index < generalArray.length; index++) {
      const item = generalArray[index];
      if (item instanceof Blob) {
        const uploaded = await uploadPhotoToImageKit(
          item,
          `${property.id}-general-${index}`,
        );
        newGeneral.push(uploaded.url);
        uploadedGeneral.push(uploaded);
        changed = true;
      } else {
        newGeneral.push(item as any);
      }
    }

    if (uploadedGeneral.length > 0) {
      updatedPhotos.general = newGeneral as any;
      uploadedMeta.general = uploadedGeneral;
    }
  }

  // detail: mảng ảnh
  if (updatedPhotos.detail) {
    const detailArray = toArray<
      Blob | string | { fileId: string; url: string }
    >(updatedPhotos.detail as any);

    const newDetail: Array<string | { fileId: string; url: string }> = [];
    const uploadedDetail: UploadedImageMeta[] = [];

    for (let index = 0; index < detailArray.length; index++) {
      const item = detailArray[index];
      if (item instanceof Blob) {
        const uploaded = await uploadPhotoToImageKit(
          item,
          `${property.id}-detail-${index}`,
        );
        newDetail.push(uploaded.url);
        uploadedDetail.push(uploaded);
        changed = true;
      } else {
        newDetail.push(item as any);
      }
    }

    if (uploadedDetail.length > 0) {
      updatedPhotos.detail = newDetail as any;
      uploadedMeta.detail = uploadedDetail;
    }
  }

  if (changed) {
    const merged: Property = {
      ...property,
      photos: updatedPhotos,
    };
    await db.properties.update(property.id, { photos: updatedPhotos });
    return { property: merged, uploadedMeta };
  }

  return { property, uploadedMeta };
}

async function postToServer(property: Property): Promise<void> {
  const { property: withUploadedPhotos, uploadedMeta } =
    await ensurePropertyPhotosUploaded(property);
  console.log("🚀 ~ postToServer ~ withUploadedPhotos:", withUploadedPhotos);
  console.log("🚀 ~ postToServer ~ uploadedMeta:", uploadedMeta);

  const photosPayload: {
    front?: PhotoPayloadItem;
    gallery?: PhotoPayloadItem[];
    detail?: PhotoPayloadItem[];
  } = {};

  if (withUploadedPhotos.photos) {
    // front
    if (uploadedMeta.front) {
      photosPayload.front = uploadedMeta.front;
    } else if (typeof withUploadedPhotos.photos.front === "string") {
      photosPayload.front = { url: withUploadedPhotos.photos.front };
    } else if (
      withUploadedPhotos.photos.front &&
      typeof withUploadedPhotos.photos.front !== "string" &&
      !(withUploadedPhotos.photos.front instanceof Blob)
    ) {
      // already metadata object coming from local/remote db
      photosPayload.front = withUploadedPhotos.photos.front;
    }

    // PATCH: chỉ gửi gallery/detail khi có ảnh mới upload (có fileId),
    // tránh gửi lại các URL cũ không có fileId gây lỗi validate.
    const uploadedGallery = uploadedMeta.general ?? [];
    if (uploadedGallery.length > 0) {
      photosPayload.gallery = dedupeByUrl(uploadedGallery);
    }

    const uploadedDetail = uploadedMeta.detail ?? [];
    if (uploadedDetail.length > 0) {
      photosPayload.detail = dedupeByUrl(uploadedDetail);
    }
  }

  const body = {
    name: withUploadedPhotos.name,
    phone: withUploadedPhotos.phone,
    address: withUploadedPhotos.address,
    location: withUploadedPhotos.location,
    area: withUploadedPhotos.area,
    price_min: withUploadedPhotos.price_min,
    price_max: withUploadedPhotos.price_max,
    notes: withUploadedPhotos.notes,
    roof_status: withUploadedPhotos.roof_status,
    legal_status: withUploadedPhotos.legal_status,
    photos:
      Object.keys(photosPayload).length > 0
        ? (photosPayload as any)
        : undefined,
    pipeline_status: "New",
  };

  const res = await fetch(`${INTERNAL_API_BASE}/properties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to POST property: ${res.status}`);
  }

  const json = (await res.json()) as { data: ApiProperty };
  const created = json.data;

  // Sau khi POST thành công:
  // - Gắn remote_id
  // - Đổi primary key local sang _id của server để dùng chung một property
  // - Giữ lại các field chỉ có ở local (frontage, photos, ...)
  await db.transaction("rw", db.properties, async () => {
    const existing = await db.properties.get(withUploadedPhotos.id);
    const base = existing ?? withUploadedPhotos;

    const merged: Property = {
      ...base,
      id: created._id,
      remote_id: created._id,
      pipeline_status: created.pipeline_status ?? "New",
      sync_status: "synced",
      created_at: new Date(created.createdAt).getTime(),
      updated_at: new Date(created.updatedAt).getTime(),
    };

    await db.properties.put(merged);

    // Nếu id cũ khác với _id server (ví dụ: "prop-..."),
    // xóa bản ghi tạm để tránh bị nhân đôi.
    if (withUploadedPhotos.id !== merged.id) {
      await db.properties.delete(withUploadedPhotos.id);
    }
  });
}

async function patchToServer(property: Property): Promise<void> {
  const { property: withUploadedPhotos, uploadedMeta } =
    await ensurePropertyPhotosUploaded(property);
  const id = withUploadedPhotos.remote_id ?? withUploadedPhotos.id;

  // Bảo vệ: nếu không có id hợp lệ thì không gọi API update.
  // Không gửi _id trong body nữa, để backend dùng params.id giống Postman.
  if (!id || id === ("undefined" as any)) {
    throw new Error(
      `Invalid property id for PATCH sync: ${String(
        id,
      )} (property local id: ${String(property.id)}, remote_id: ${String(
        property.remote_id,
      )})`,
    );
  }

  const photosPayload: {
    front?: PhotoPayloadItem;
    gallery?: PhotoPayloadItem[];
    detail?: PhotoPayloadItem[];
  } = {};

  if (withUploadedPhotos.photos) {
    if (uploadedMeta.front) {
      photosPayload.front = uploadedMeta.front;
    } else if (typeof withUploadedPhotos.photos.front === "string") {
      photosPayload.front = { url: withUploadedPhotos.photos.front };
    } else if (
      withUploadedPhotos.photos.front &&
      typeof withUploadedPhotos.photos.front !== "string" &&
      !(withUploadedPhotos.photos.front instanceof Blob)
    ) {
      // metadata object (đã sync từ server)
      photosPayload.front = withUploadedPhotos.photos.front;
    }

    // gallery/detail: merge ảnh cũ + ảnh mới để tránh mất ảnh cũ
    const existingGallery = toPhotoPayloadArray(
      withUploadedPhotos.photos.general as any,
    );
    const uploadedGallery = uploadedMeta.general ?? [];
    const mergedGallery = dedupeByUrl([...existingGallery, ...uploadedGallery]);
    if (mergedGallery.length > 0) photosPayload.gallery = mergedGallery;

    const existingDetail = toPhotoPayloadArray(
      withUploadedPhotos.photos.detail as any,
    );
    const uploadedDetail = uploadedMeta.detail ?? [];
    const mergedDetail = dedupeByUrl([...existingDetail, ...uploadedDetail]);
    if (mergedDetail.length > 0) photosPayload.detail = mergedDetail;
  }

  const body = {
    name: withUploadedPhotos.name,
    phone: withUploadedPhotos.phone,
    address: withUploadedPhotos.address,
    location: withUploadedPhotos.location,
    area: withUploadedPhotos.area,
    price_min: withUploadedPhotos.price_min,
    price_max: withUploadedPhotos.price_max,
    notes: withUploadedPhotos.notes,
    roof_status: withUploadedPhotos.roof_status,
    legal_status: withUploadedPhotos.legal_status,
    pipeline_status: withUploadedPhotos.pipeline_status ?? "New",
    photos:
      Object.keys(photosPayload).length > 0
        ? (photosPayload as any)
        : undefined,
  };

  const res = await fetch(`${INTERNAL_API_BASE}/properties/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to PATCH property: ${res.status}`);
  }

  const json = (await res.json()) as { data: ApiProperty };
  const updated = json.data;

  await db.properties.update(property.id, {
    remote_id: updated._id,
    sync_status: "synced",
    updated_at: new Date(updated.updatedAt).getTime(),
  });
}

export async function syncPendingToServer(): Promise<void> {
  const pending = await dbService.getPendingSync();
  console.log("🚀 ~ syncPendingToServer ~ pending:", pending);

  for (const p of pending) {
    try {
      if (!p.remote_id && p.id.startsWith("prop-")) {
        await postToServer(p);
      } else {
        await patchToServer(p);
      }
    } catch (error) {
      await dbService.updateSyncStatus(p.id, "error");
    }
  }
}
