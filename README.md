# Luxy Inventory Checkout App

Offline-capable web app for tracking cleaning supply checkouts.

## 🚀 Quick Deploy to GitHub Pages

### 1. Create GitHub Repository

```bash
# On your local machine or server:
cd /tmp/luxy-inventory

git init
git add .
git commit -m "Initial commit: Luxy Inventory app"

# Create a new repo on GitHub called "luxy-inventory"
# Then push:
git remote add origin https://github.com/YOUR-USERNAME/luxy-inventory.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repo: `https://github.com/YOUR-USERNAME/luxy-inventory`
2. Click **Settings** → **Pages**
3. Under **Source**, select **main** branch
4. Click **Save**
5. Wait ~2 minutes for deployment

### 3. Access Your App

Your app will be live at:
```
https://YOUR-USERNAME.github.io/luxy-inventory/
```

## 📱 Install on iPad/Tablet

### iOS (iPad/iPhone):
1. Open Safari and visit your GitHub Pages URL
2. Tap the **Share** button
3. Tap **Add to Home Screen**
4. Name it "Luxy Inventory"
5. Tap **Add**

### Android:
1. Open Chrome and visit your GitHub Pages URL
2. Tap the **⋮** menu
3. Tap **Add to Home screen**
4. Name it and tap **Add**

## 🔧 Configuration

The app is pre-configured to connect to your Google Sheet:
- **Sheet ID**: `1dumKi6YlQTALT9nny_WePe_rNJPPs6mXFONdltolbxc`
- **OAuth**: Pre-configured with your credentials

## 📊 Google Sheet Structure

### Employees Tab
```
EmployeeID | EmployeeName   | Active
EMP001     | Maria Rodriguez| TRUE
EMP002     | Carmen Silva   | TRUE
...
```

### Items Tab
```
ItemID  | ItemName       | Unit   | UnitCost | Category
CLN001  | Bleach         | Gallon | 3.50     | Chemicals
SUP001  | Microfiber Cloths | Pack | 12.00  | Supplies
...
```

### CheckoutLog Tab
*Auto-populated by app - each checkout creates one row per item*

## 🧪 Test with Synthetic Data

The sheet is pre-populated with:
- **5 test employees** (Maria, Carmen, Rosa, Ana, Sofia)
- **15 test items** (cleaning supplies, tools)

## ✨ Features

- ✅ Offline-capable (works without internet)
- ✅ Auto-syncs when back online
- ✅ Digital signature capture
- ✅ Multi-item cart checkout
- ✅ No costs visible to employees
- ✅ Tablet-optimized UI
- ✅ PWA (install like native app)

## 🔄 Updates

To update the app:
```bash
# Make changes to files
git add .
git commit -m "Update description"
git push

# GitHub Pages auto-deploys in ~1 minute
```

## 🛠️ Troubleshooting

**App not loading?**
- Check browser console for errors
- Verify GitHub Pages is enabled
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

**Offline mode not working?**
- Service worker needs HTTPS (GitHub Pages provides this)
- First visit requires internet to cache files

**Data not syncing?**
- Check if token expired (refresh happens automatically)
- Verify Sheet ID is correct in `app.js`

## 📞 Support

Contact: hello@luxy-clean.com

---

**Built by ALPACA-AI 🦙**
