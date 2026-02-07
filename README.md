# Property Finder PWA - Real Estate Check-in Application

A production-ready Progressive Web App (PWA) for on-site real estate property check-in, built with React 18, TypeScript, and offline-first design patterns.

## Features

### Core Functionality
- **Multi-step Check-in Form** (6-step stepper optimized for mobile field use)
- **Offline-First Architecture** using IndexedDB for local data persistence
- **Progressive Web App** with service worker and offline support
- **GPS Location Capture** with accuracy tracking and warning system
- **Photo Management** with automatic compression (max 300KB per image)
- **Property Pipeline** view of all submitted check-ins
- **Map View** with distance calculation and Google Maps integration
- **Settings & Database** management with data export functionality
- **Real-time Sync Status** indicators for pending/synced properties

### Technical Highlights
- **Mobile-optimized UI** with touch-friendly controls (44px minimum tap targets)
- **Image compression** preventing file size bloat (rejects > 5MB, compresses to ~300KB)
- **Background sync ready** for automatic server synchronization when online
- **Responsive design** using Tailwind CSS with safe-area support
- **TypeScript** for full type safety across the application
- **No external dependencies** for core PWA functionality (uses native APIs)

## Project Structure

```
├── app/
│   ├── layout.tsx           # Root layout with PWA meta tags
│   ├── globals.css          # Tailwind + mobile optimizations
│   └── page.tsx             # Main app with tab navigation
├── components/
│   ├── check-in/            # Multi-step form components
│   │   ├── check-in-stepper.tsx
│   │   ├── step-location.tsx
│   │   ├── step-basic-info.tsx
│   │   ├── step-photos.tsx
│   │   ├── step-specs.tsx
│   │   ├── step-legal.tsx
│   │   └── step-review.tsx
│   ├── screens/             # Main app screens
│   │   ├── pipeline.tsx     # Property list view
│   │   ├── map.tsx          # Location map view
│   │   └── settings.tsx     # Settings & data management
│   └── tab-navigation.tsx   # Bottom tab bar with status indicator
├── lib/
│   ├── db.ts               # IndexedDB schema and service methods
│   └── hooks.ts            # Custom React hooks
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js              # Service worker for offline support
│   └── icons/             # App icons
└── package.json
```

## Data Model

### Property Interface
```typescript
interface Property {
  id: string
  name: string                    // Property name (max 100 chars)
  phone: string                   // Owner phone (Vietnam format)
  address: string                 // Full address (max 500 chars)

  location: {
    lat: number
    lng: number
    accuracy: number             // GPS accuracy in meters
  }

  area: number                    // 50-5000 m²
  price_min: number               // Million VND
  price_max: number               // Million VND
  frontage: number                // 1-100 meters, decimals allowed

  photos: {
    front: Blob                   // Required photo
    general?: Blob                // Optional photos
    detail?: Blob
  }

  roof_status?: 'yes' | 'partial' | 'no' | 'unknown'
  legal_status?: 'unknown' | 'verbal' | 'pink' | 'red'
  notes?: string                  // Max 1000 chars

  pipeline_status: 'Submitted'
  sync_status: 'pending' | 'synced' | 'error'
  created_at: number
  updated_at: number
}
```

## Setup & Installation

### Prerequisites
- Node.js 16+ / npm / pnpm
- Modern browser with PWA support (Chrome, Firefox, Safari 15+)

### Development
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`

### Build
```bash
npm run build
npm start
```

## PWA Installation

### Desktop (Chrome)
1. Open the app in Chrome
2. Click the "Install" icon in the address bar
3. Click "Install"

### Mobile (iOS)
1. Open in Safari
2. Tap Share button
3. Select "Add to Home Screen"

### Mobile (Android)
1. Open in Chrome
2. Tap menu (three dots)
3. Select "Install app"

## Feature Breakdown

### Step 1: GPS Location
- Auto-captures location on load
- Displays latitude, longitude, and accuracy
- Shows warning if accuracy exceeds 50 meters
- Allows manual recapture for better accuracy
- Saves to IndexedDB draft immediately

### Step 2: Basic Information
- Property name (100 char limit, required)
- Owner phone (validates Vietnamese format: +84/0 + 9-10 digits)
- Address details (500 char limit, required)
- Client-side validation with error messages

### Step 3: Photos
- Front view (required)
- General and detail views (optional)
- Camera capture or file upload
- Auto-compression: rejects >5MB, compresses to ~300KB
- Stores as Blob in IndexedDB

### Step 4: Property Specs
- Area: 50-5000 m² (required)
- Rental price range in millions VND (required)
- Frontage: 1-100 meters with decimal support (required)
- Roof/foundation status dropdown

### Step 5: Legal & Notes
- Legal status (Unknown/Verbal/Pink Book/Red Book)
- Additional notes (1000 char limit)

### Step 6: Review & Submit
- Read-only summary of all data
- Edit button for each section
- Submit saves to IndexedDB with `sync_status: 'pending'`

### Pipeline View
- Lists all submitted properties
- Shows sync status (Pending/Synced/Error)
- Displays key metrics (area, price, frontage)
- Click for detailed property view

### Map View
- Displays all property locations
- Calculates distance from current location
- Opens in Google Maps for navigation
- Sorts by proximity

### Settings & Database
- Database statistics (total properties, pending sync)
- Export all data as JSON backup
- Clear all data with confirmation
- Service worker status indicator
- App version and offline capability info

## Offline Behavior

1. **Auto-save drafts** between steps while filling form
2. **All data stored locally** in IndexedDB (browser storage)
3. **Submission works offline** - saves with `sync_status: 'pending'`
4. **Online indicator** at top-right shows connection status
5. **Background sync ready** - service worker prepared for server sync

## Image Compression Strategy

```
User uploads image → Check size (reject if > 5MB)
                  → Draw to canvas with max 1200px dimension
                  → JPEG compression: start at quality 0.8
                  → Reduce quality until < 300KB
                  → Save compressed Blob to IndexedDB
```

## Performance Optimizations

- **Lazy loading** for property lists
- **Debounced draft saves** (500ms)
- **Efficient GPS accuracy checks** with throttled updates
- **Service worker caching** for app shell
- **Responsive images** with proper scaling
- **Touch-optimized UI** with 44px minimum targets
- **Safe-area viewport** support for notched devices

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | All PWA features |
| Firefox | ✅ Full | All PWA features |
| Safari | ✅ Full | iOS 15+ required |
| Edge | ✅ Full | All PWA features |
| IE 11 | ❌ Not supported | ES6+ required |

## Development Notes

### Adding Backend Sync
Update `public/sw.js` background sync handler:
```javascript
async function syncProperties() {
  const pending = await dbService.getPendingSync()
  for (const property of pending) {
    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        body: JSON.stringify(property)
      })
      if (response.ok) {
        await dbService.updateSyncStatus(property.id, 'synced')
      }
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }
}
```

### Database Queries
```typescript
// Get all properties
const props = await dbService.getProperties()

// Get pending sync
const pending = await dbService.getPendingSync()

// Submit property
await dbService.submitProperty(propertyData)

// Update sync status
await dbService.updateSyncStatus(id, 'synced')

// Save draft
await dbService.saveDraft(draftData)
```

### Custom Hooks
```typescript
// Online status
const isOnline = useOnlineStatus()

// GPS location
const { location, error, isLoading, getCurrentLocation } = useGeoLocation()

// Image compression
const { compressImage } = useImageCompression()
```

## Mobile Best Practices Implemented

- ✅ Viewport configuration for device width
- ✅ 44px minimum touch target size
- ✅ Prevent double-tap zoom on inputs (16px font)
- ✅ Safe-area insets for notched displays
- ✅ Status bar color matching
- ✅ Landscape orientation lock for forms
- ✅ Haptic feedback ready (add in future)
- ✅ No text selection on UI elements

## Future Enhancements

- [ ] Biometric authentication (fingerprint/face)
- [ ] Voice notes with audio compression
- [ ] Batch upload with retry logic
- [ ] Property comparison view
- [ ] Advanced filtering and search
- [ ] Dark mode support
- [ ] Multi-language support
- [ ] Offline analytics tracking
- [ ] Property templates for quick entry

## Troubleshooting

**Problem**: GPS accuracy > 50m warning
- Solution: Move to open area, disable WiFi-only location

**Problem**: Photos fail to compress
- Solution: Check browser storage quota, export and clear data

**Problem**: Service worker not registering
- Solution: Ensure HTTPS in production, check browser console

**Problem**: IndexedDB not persisting
- Solution: Check privacy settings, ensure persistent storage granted

## License

Built with v0 - Vercel's AI Assistant
