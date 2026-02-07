# PWA Setup Guide

This project is configured as a Progressive Web App (PWA) with the following features:

## ✅ Completed Setup

- ✅ Web App Manifest (`/public/manifest.json`)
- ✅ Service Worker (`/public/sw.js`) with caching strategy
- ✅ Offline page (`/app/offline/page.tsx`)
- ✅ PWA meta tags in layout
- ✅ Service Worker registration with update handling
- ✅ Next.js configuration for PWA support

## 📱 Required Icons

The PWA requires the following icon files in the `/public` directory:

### Required Icon Sizes:
- `icon-192x192.png` - Standard Android icon
- `icon-512x512.png` - High-resolution Android icon
- `apple-touch-icon.png` - iOS icon (180x180px)
- `screenshot-narrow.png` - App screenshot for store listings (540x720px)

### Generating Icons

You can generate these icons from your existing logo (`placeholder-logo.png`) using:

1. **Online Tools:**
   - [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)
   - [PWA Builder](https://www.pwabuilder.com/imageGenerator)

2. **Using ImageMagick (CLI):**
   ```bash
   # Convert placeholder-logo.png to required sizes
   magick convert placeholder-logo.png -resize 192x192 icon-192x192.png
   magick convert placeholder-logo.png -resize 512x512 icon-512x512.png
   magick convert placeholder-logo.png -resize 180x180 apple-touch-icon.png
   ```

3. **Using Sharp (Node.js):**
   ```javascript
   const sharp = require('sharp')
   await sharp('placeholder-logo.png').resize(192, 192).toFile('icon-192x192.png')
   await sharp('placeholder-logo.png').resize(512, 512).toFile('icon-512x512.png')
   await sharp('placeholder-logo.png').resize(180, 180).toFile('apple-touch-icon.png')
   ```

## 🚀 Testing Your PWA

### Local Testing:
1. Build the app: `npm run build`
2. Start the production server: `npm start`
3. Open Chrome DevTools → Application → Service Workers
4. Check "Offline" to test offline functionality
5. Use Lighthouse to audit PWA features

### PWA Checklist:
- [ ] Icons are generated and placed in `/public`
- [ ] Service Worker is registered (check DevTools → Application)
- [ ] App works offline (test with DevTools offline mode)
- [ ] Manifest is valid (check DevTools → Application → Manifest)
- [ ] App is installable (look for install prompt in browser)

## 🔧 Service Worker Features

- **Caching Strategy:** Network-first with cache fallback
- **Static Assets:** Cached on install
- **Runtime Caching:** Dynamic content cached after first load
- **Offline Support:** Shows offline page when network fails
- **Background Sync:** Ready for property sync implementation

## 📝 Next Steps

1. Generate and add the required icon files
2. Test offline functionality
3. Test installability on mobile devices
4. Implement background sync for property data (if needed)
5. Add push notifications (optional)

## 🔍 Troubleshooting

### Service Worker Not Registering:
- Ensure you're using HTTPS (or localhost for development)
- Check browser console for errors
- Verify `/sw.js` is accessible

### Icons Not Showing:
- Verify icon files exist in `/public`
- Check manifest.json paths are correct
- Clear browser cache and reload

### Offline Page Not Showing:
- Verify `/app/offline/page.tsx` exists
- Check service worker is caching the offline route
- Test with DevTools → Network → Offline
