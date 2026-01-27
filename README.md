# Luxy Inventory Checkout App

Offline-capable Progressive Web App (PWA) for tracking cleaning supply checkouts with signature capture.

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Google Apps Script (serverless)
- **Storage**: LocalStorage (offline queue), Google Sheets (persistent)
- **Features**: Service Worker for offline support, Canvas API for signatures

## Setup

1. **Configure Backend URL**
   - Edit `app.js` line 3: Set `BACKEND_URL` to your Google Apps Script deployment URL
   - Backend should handle `getEmployees`, `getItems`, and `submitCheckout` actions

2. **Deploy**
   - Host on any static web server (GitHub Pages, Netlify, etc.)
   - Ensure HTTPS for service worker functionality

3. **Backend Requirements**
   - Must return CORS headers for cross-origin requests
   - Expected response format: `{ employees: [...], items: [...] }`
   - Employees: `{ id: string, name: string }`
   - Items: `{ id: string, name: string, unit: string }`

## Architecture

- **Employee Selection** → **Item Cart** → **Signature** → **Confirmation**
- Offline submissions queued in localStorage, synced when online
- Signatures compressed (JPEG 60%, 200x67px) to minimize storage
- Service worker caches static assets, never caches API responses

## Recent Security Improvements

- ✅ CORS mode enabled (response verification)
- ✅ Input validation (type checking, size limits)
- ✅ Signature compression (10x storage reduction)
- ⚠️ CSP header recommended (see security spec)

## Development

```bash
# Serve locally
python3 -m http.server 8000
# Visit http://localhost:8000
```

## File Structure

```
├── index.html       # Main UI structure
├── app.js           # Application logic
├── styles.css       # Responsive styling
├── sw.js            # Service worker (offline support)
└── manifest.json    # PWA manifest
```

## Future Enhancements

- [ ] Add Content Security Policy meta tag
- [ ] Implement backend response caching strategy
- [ ] Add admin panel for managing employees/items
- [ ] Export checkout history as CSV

---

**License**: Private use only
