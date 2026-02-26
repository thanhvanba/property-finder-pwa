import { db, dbService, type Property } from "./db";
import { fetchPipelines, type ApiProperty } from "./api";

// Nội bộ gọi qua Next API để tránh CORS
const INTERNAL_API_BASE = "/api/realestate/v1";

function mapApiToLocalProperty(api: ApiProperty): Property {
  return {
    id: api._id,
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
    frontage: 0,
    photos: {
      front: api.photos?.front?.url ?? "", 
    },
    roof_status: api.roof_status,
    legal_status: api.legal_status,
    notes: api.notes,
    pipeline_status: api.pipeline_status ?? "New",
    sync_status: api.sync_status ?? "synced",
    created_at: new Date(api.createdAt).getTime(),
    updated_at: new Date(api.updatedAt).getTime(),
  };
}

export async function syncFromServerToLocal(): Promise<void> {
  const remote = await fetchPipelines();

  const mapped: Property[] = remote.map(mapApiToLocalProperty);

  await db.transaction("rw", db.properties, async () => {
    for (const p of mapped) {
      await db.properties.put(p);
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

  await db.properties.update(property.id, {
    remote_id: created._id,
    sync_status: "synced",
    updated_at: new Date(created.updatedAt).getTime(),
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

