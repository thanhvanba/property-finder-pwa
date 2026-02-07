# Property Finder PWA - Architecture Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React UI Layer                            │
│  (Components: Forms, Screens, Navigation)                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    State Management                          │
│  (React Hooks: useOnlineStatus, useGeoLocation, etc)       │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    IndexedDB Service Layer                   │
│  (db.ts: DbService with CRUD operations)                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Client APIs                              │
│  Geolocation API │ File API │ Canvas API │ Service Worker  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Check-in Form Submission Flow

```
User fills Step 1 (Location)
        ↓
Auto-save draft to IndexedDB
        ↓
User completes all 6 steps
        ↓
Review screen - can edit any step
        ↓
User submits → dbService.submitProperty()
        ↓
Create Property object with:
  - id: `prop-${timestamp}`
  - sync_status: 'pending'
  - pipeline_status: 'Submitted'
  - Blobs for photos stored directly
        ↓
Save to IndexedDB properties table
        ↓
Clear draft from IndexedDB
        ↓
Show success message
        ↓
Reset form for next check-in
```

### Offline Sync Flow

```
Online Status: OFFLINE
├─ User can still submit properties
├─ Properties saved with sync_status: 'pending'
├─ Service worker caches app shell
└─ Data persists in IndexedDB

Online Status: ONLINE
├─ Service worker triggered (future implementation)
├─ Background sync: GET pending properties
├─ For each pending:
│   ├─ Send POST request to /api/properties
│   ├─ On success: updateSyncStatus('synced')
│   └─ On error: updateSyncStatus('error')
└─ UI refreshes to show sync status
```

## Component Architecture

### Check-in Form Hierarchy

```
CheckInStepper (Container)
├─ Header: Progress bar + Step counter
├─ Content: Current step component
│   ├─ StepLocation
│   ├─ StepBasicInfo
│   ├─ StepPhotos
│   ├─ StepSpecs
│   ├─ StepLegal
│   └─ StepReview
└─ Footer: Buttons (Back/Next/Submit)

Data flow:
- CheckInStepper manages formData state
- Each step component receives current data + onNext callback
- formData spread into each step (location, basicInfo, photos, specs, legal)
- Auto-save to IndexedDB via useEffect
```

### Screen Navigation

```
Page (Main Router)
├─ activeTab state (0-3)
├─ Content layers:
│   ├─ activeTab === 0 → CheckInStepper
│   ├─ activeTab === 1 → PipelineScreen
│   ├─ activeTab === 2 → MapScreen
│   └─ activeTab === 3 → SettingsScreen
└─ TabNavigation (Fixed bottom)
    └─ Online status indicator (Fixed top-right)
```

## Database Schema (Dexie)

### Tables

```typescript
db.properties (indexed)
├─ Primary Key: id
├─ Index: created_at (for sorting)
└─ Index: sync_status (for filtering pending)

db.drafts (indexed)
├─ Primary Key: id
└─ Index: updated_at (for cleanup)
```

### IndexedDB Storage Format

```javascript
// Property stored in IndexedDB
{
  id: "prop-1706912345678",
  name: "Apartment 5B",
  phone: "+84123456789",
  address: "123 Main Street",
  location: { lat: 21.0285, lng: 105.8542, accuracy: 12 },
  area: 150,
  price_min: 500,
  price_max: 600,
  frontage: 8.5,
  photos: {
    front: Blob { ... },      // Binary data
    general: Blob { ... },
    detail: Blob { ... }
  },
  roof_status: "yes",
  legal_status: "pink",
  notes: "Good condition...",
  pipeline_status: "Submitted",
  sync_status: "pending",
  created_at: 1706912345678,
  updated_at: 1706912345678
}
```

## Custom Hooks Deep Dive

### useOnlineStatus()
```typescript
// Returns: boolean
// Updates on: window 'online'/'offline' events
// Use case: Show offline indicator in UI
const isOnline = useOnlineStatus()
```

### useGeoLocation()
```typescript
// Returns: { location, error, isLoading, getCurrentLocation }
// location: { lat, lng, accuracy }
// Use case: Capture GPS coordinates with accuracy check
const { location, error, isLoading, getCurrentLocation } = useGeoLocation()
```

### useImageCompression()
```typescript
// Returns: { compressImage }
// compressImage(file: File, maxSizeKB: number = 300): Promise<Blob>
// Algorithm:
//   1. Check file size (reject > 5MB)
//   2. Draw to canvas (max 1200px dimension)
//   3. JPEG compression (quality 0.8 → 0.1)
//   4. Reduce quality until < maxSizeKB
// Use case: Prepare photos for storage
const { compressImage } = useImageCompression()
```

## Service Worker Architecture

### sw.js Functionality

```javascript
// Install: Cache app shell + offline.html
// Activate: Clean up old caches
// Fetch: Network-first, fallback to cache for static assets
// Sync: Background sync for pending properties (future)

// Current strategy:
// - Cache static assets (JS, CSS, fonts)
// - Network requests pass through (for API calls)
// - Service worker ready for background sync implementation
```

### Future Background Sync Implementation

```javascript
// In service worker:
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-properties') {
    event.waitUntil(syncPendingProperties())
  }
})

// In app when online:
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  navigator.serviceWorker.ready.then(reg => {
    reg.sync.register('sync-properties')
  })
}
```

## Validation & Error Handling

### Form Validation Strategy

```typescript
// Each step component has its own validation
// Pattern:
1. Validate required fields
2. Validate field-specific rules (format, length, range)
3. Cross-field validation (price_max > price_min)
4. Set errors state to show to user
5. Return false if any errors, true if valid

// Example: StepBasicInfo
validateForm() {
  errors.name = !name || name.length > 100 ? 'error' : undefined
  errors.phone = !validatePhoneFormat(phone) ? 'error' : undefined
  errors.address = !address || address.length > 500 ? 'error' : undefined
  return Object.keys(errors).length === 0
}
```

### Error Boundaries

```typescript
// Global error handling:
- Catch in async operations (db calls, API calls)
- Set error state with user-friendly message
- Show error UI component
- Allow user to retry

// Example: CheckInStepper
try {
  await dbService.submitProperty(property)
  setSubmitSuccess(true)
} catch (error) {
  setSubmitError(error.message)
  setIsSubmitting(false)
}
```

## Performance Considerations

### Optimization Techniques

1. **Lazy Loading Lists**
   - Pipeline view: Loads all at once (OK for typical use)
   - Maps: Loads properties on demand
   - Future: Implement virtual scrolling for 1000+ items

2. **Image Optimization**
   - Auto-compress before storing (save storage)
   - Compression happens client-side (offline-first)
   - Blobs stored directly (no base64 bloat)

3. **Database Queries**
   - Index on sync_status for pending queries
   - Index on created_at for sorting
   - Full table scans acceptable for MVP

4. **Component Optimization**
   - Form components use React.memo (future)
   - useCallback for event handlers (future)
   - Avoid re-renders in tab navigation

### Storage Quotas

```javascript
// IndexedDB quota varies by browser:
// - Chrome: 50% of disk space
// - Firefox: 10% of available disk
// - Safari: 50% of disk space

// Typical storage per property:
// - Text data: ~2-5KB
// - Photos (3): ~900KB (300KB each, compressed)
// - Total per property: ~1MB

// Capacity: ~100 properties ≈ 100MB
// For 1000 properties: Need export/cleanup strategy
```

## Testing Strategy

### Unit Tests (Future)
- Validation functions
- Image compression algorithm
- Distance calculation
- Phone format validation

### Integration Tests (Future)
- Check-in flow end-to-end
- IndexedDB CRUD operations
- Service worker caching

### Manual Testing Checklist
- [ ] Form validation messages appear correctly
- [ ] Photos compress properly
- [ ] Offline submission saves data
- [ ] Online indicator toggles correctly
- [ ] Pipeline view loads all properties
- [ ] Map view calculates distances
- [ ] Data export creates valid JSON
- [ ] Service worker installs correctly

## Security Considerations

### XSS Prevention
- Use React's built-in HTML escaping
- No dangerouslySetInnerHTML except service worker registration
- Validate and sanitize user input

### Data Privacy
- All data stored locally (not sent to server until sync)
- Photos stored as Blobs (binary, not exposed)
- Clear data option provided in settings
- No analytics/tracking implemented

### API Security (Future)
- Use HTTPS for backend communication
- Validate all server responses
- Implement CORS properly
- Use secure tokens/sessions for authentication

## Deployment Checklist

- [ ] Update app version in settings screen
- [ ] Test on actual mobile devices (iOS + Android)
- [ ] Test offline functionality with DevTools
- [ ] Verify service worker installation
- [ ] Check manifest.json icons exist
- [ ] Test PWA install prompt
- [ ] Verify HTTPS in production
- [ ] Set up monitoring for sync errors
- [ ] Create API endpoint for property sync
- [ ] Plan database migration strategy

## Monitoring & Analytics (Future)

```typescript
// Potential metrics to track:
- Average form completion time
- Dropout rate by step
- GPS accuracy statistics
- Photo compression statistics
- Offline submission volume
- Sync success/failure rate
- App crash frequency
```

## Scaling Considerations

For 1000+ properties:
1. Implement pagination in Pipeline view
2. Use virtual scrolling for large lists
3. Archive old properties (archive table)
4. Implement pruning strategy for old drafts
5. Consider cloud backup for critical data
6. Implement incremental sync (since timestamps)
7. Add property categorization/filtering

## Technology Choices Rationale

| Choice | Rationale |
|--------|-----------|
| Dexie | Type-safe IndexedDB wrapper, minimal deps |
| React 18 | Latest features, hooks, concurrent rendering |
| TypeScript | Type safety, excellent IDE support |
| Tailwind | Rapid UI development, mobile-first |
| Native APIs | Geolocation, Canvas, File - no external deps for core |
| Service Worker | Native PWA support, offline capability |

