import { db, dbService, type Property } from "./db";
import { fetchPipelines, type ApiProperty } from "./api";

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
      // Ưu tiên URL từ server nếu có, fallback sang ảnh local
      front:
        api.photos?.front?.url ??
        (existing?.photos.front ?? ""),
      general: existing?.photos.general,
      detail: existing?.photos.detail,
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

async function postToServer(property: Property): Promise<void> {
  const body = {
    name: property.name,
    phone: property.phone,
    address: property.address,
    location: property.location,
    area: property.area,
    price_min: property.price_min,
    price_max: property.price_max,
    notes: property.notes,
    roof_status: property.roof_status,
    legal_status: property.legal_status,
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
    const existing = await db.properties.get(property.id);
    const base = existing ?? property;

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
    if (property.id !== merged.id) {
      await db.properties.delete(property.id);
    }
  });
}

async function patchToServer(property: Property): Promise<void> {
  const id = property.remote_id ?? property.id;

  const body = {
    name: property.name,
    phone: property.phone,
    address: property.address,
    location: property.location,
    area: property.area,
    price_min: property.price_min,
    price_max: property.price_max,
    notes: property.notes,
    roof_status: property.roof_status,
    legal_status: property.legal_status,
    pipeline_status: property.pipeline_status ?? "New",
  };

  const res = await fetch(
    `${INTERNAL_API_BASE}/properties/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

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

