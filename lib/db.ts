import Dexie, { type Table } from "dexie";

export interface Property {
  id: string;
  /**
   * Optional id of the record on the remote API (Mongo _id)
   */
  remote_id?: string;

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
  frontage: number;

  photos: {
    front: Blob | string;
    general?: Blob | string;
    detail?: Blob | string;
  };

  roof_status?: "yes" | "partial" | "no" | "unknown";
  legal_status?: "unknown" | "verbal" | "pink" | "red";
  notes?: string;

  pipeline_status: "Submitted" | "New" | "Done";
  sync_status: "pending" | "synced" | "error";

  created_at: number;
  updated_at: number;
}

export interface PropertyDraft {
  id: string;
  step: number;
  data: Partial<Property>;
  updated_at: number;
}

export class PropertyFinderDB extends Dexie {
  properties!: Table<Property>;
  drafts!: Table<PropertyDraft>;

  constructor() {
    super("PropertyFinderDB");
    this.version(1).stores({
      properties: "++id, created_at, sync_status",
      drafts: "++id, updated_at",
    });
  }
}

export const db = new PropertyFinderDB();

export const dbService = {
  async saveDraft(draft: PropertyDraft): Promise<void> {
    await db.drafts.put({
      ...draft,
      updated_at: Date.now(),
    });
  },

  async getDraft(id: string): Promise<PropertyDraft | undefined> {
    return db.drafts.get(id);
  },

  async clearDraft(id: string): Promise<void> {
    await db.drafts.delete(id);
  },

  async submitProperty(property: Property): Promise<void> {
    await db.properties.put({
      ...property,
      created_at: Date.now(),
      updated_at: Date.now(),
      pipeline_status: "Submitted",
      sync_status: "pending",
    });
  },

  async getProperties(): Promise<Property[]> {
    return db.properties.toArray();
  },

  async getPendingSync(): Promise<Property[]> {
    return db.properties
      .where("sync_status")
      .anyOf("pending", "error")
      .toArray();
  },

  async updateSyncStatus(
    id: string,
    status: "pending" | "synced" | "error",
  ): Promise<void> {
    await db.properties.update(id, {
      sync_status: status,
      updated_at: Date.now(),
    });
  },

  async updateProperty(id: string, updates: Partial<Property>): Promise<void> {
    await db.properties.update(id, {
      ...updates,
      updated_at: Date.now(),
    });
  },
};
