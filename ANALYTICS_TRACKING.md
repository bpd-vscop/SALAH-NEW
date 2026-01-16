# Visitor Analytics Tracking

This system tracks visitor analytics including referrer sources, geographic location, and conversion metrics.

## How It Works

### 1. **Automatic Tracking on Visit**

When a user visits your website:
- Frontend captures referrer URL and UTM parameters
- Sends data to backend API (`/api/analytics/track`)
- Backend gets user's IP address and looks up geographic location
- All data is saved to MongoDB `VisitorAnalytics` collection

### 2. **Data Collected**

**Referrer Tracking:**
- `referrer` - Full URL where user came from
- `referrerSource` - Parsed source (Google, Facebook, Instagram, Direct, etc.)
- `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent` - Marketing campaign parameters

**Geographic Location (from IP):**
- `country`, `countryCode`
- `region` (state/province)
- `city`
- `latitude`, `longitude`
- `timezone`

**Device Info:**
- `userAgent` - Browser user agent string
- `deviceType` - mobile, tablet, or desktop
- `browser` - Browser name
- `os` - Operating system

**Page & Session:**
- `sessionId` - Unique session identifier
- `landingPage` - First page visited
- `userId` - If user is logged in

**Conversion:**
- `converted` - Boolean, true if user made a purchase
- `orderId` - Reference to order if converted

### 3. **Files Added**

**Backend:**
- `server/src/models/VisitorAnalytics.js` - MongoDB model
- `server/src/controllers/analyticsController.js` - API controller
- `server/src/routes/analytics.js` - API routes
- Updated `server/src/routes/index.js` - Added analytics routes

**Frontend:**
- `client/src/utils/analytics.ts` - Tracking utility
- Updated `client/src/router/AppRouter.tsx` - Added tracker component

## API Endpoints

### Track Visitor (Public)
```
POST /api/analytics/track
```

**Request Body:**
```json
{
  "sessionId": "1234567890_abc123",
  "landingPage": "/products",
  "referrer": "https://www.google.com/search?q=...",
  "utmSource": "facebook_ads",
  "utmMedium": "cpc",
  "utmCampaign": "summer_sale_2024"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Visitor tracked successfully",
  "data": {
    "sessionId": "1234567890_abc123",
    "country": "United States",
    "referrerSource": "Google"
  }
}
```

### Get Analytics Summary (Admin Only)
```
GET /api/analytics/summary?period=30d
```

**Query Parameters:**
- `period` - `7d`, `30d`, `90d`, `1y` (default: 30d)
- OR `startDate` & `endDate` - Custom date range

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalVisitors": 1250,
      "uniqueVisitors": 980,
      "conversionRate": 3.2
    },
    "topCountries": [
      { "country": "United States", "visitors": 500 },
      { "country": "Canada", "visitors": 200 }
    ],
    "topReferrers": [
      { "source": "Google", "visitors": 400 },
      { "source": "Facebook", "visitors": 300 },
      { "source": "Direct", "visitors": 250 }
    ],
    "deviceBreakdown": [
      { "device": "mobile", "visitors": 600 },
      { "device": "desktop", "visitors": 450 },
      { "device": "tablet", "visitors": 200 }
    ]
  }
}
```

## IP Geolocation Service

Currently using **ipapi.co** (free tier):
- **Limit:** 1,000 requests per day
- **No API key required**

### Alternative Services

If you exceed the free tier, consider:

1. **ip-api.com** (Free: 45 requests/minute)
   ```javascript
   const response = await fetch(`http://ip-api.com/json/${ip}`);
   ```

2. **ipgeolocation.io** (Free: 1,000/day with API key)
   - Sign up at https://ipgeolocation.io
   - Add API key to `.env`: `IP_GEO_API_KEY=your_key_here`

3. **MaxMind GeoIP2** (Paid, most accurate)
   - Local database (no external API calls)
   - Install: `npm install @maxmind/geoip2-node`

## Usage Examples

### Track UTM Campaign
Share this link in your Facebook ads:
```
https://yoursite.com/products?utm_source=facebook&utm_medium=cpc&utm_campaign=summer_sale
```

The system will automatically track:
- `referrerSource`: "facebook"
- `utmSource`: "facebook"
- `utmMedium`: "cpc"
- `utmCampaign`: "summer_sale"

### Query Analytics

In MongoDB or using the API:
```javascript
// Get all visitors from Facebook in last 30 days
const visitors = await VisitorAnalytics.find({
  referrerSource: 'Facebook',
  createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
});

// Get conversion rate by country
const conversionByCountry = await VisitorAnalytics.aggregate([
  { $match: { country: { $ne: null } } },
  {
    $group: {
      _id: '$country',
      total: { $sum: 1 },
      converted: { $sum: { $cond: ['$converted', 1, 0] } }
    }
  }
]);
```

## Privacy & GDPR Compliance

**Important Notes:**
- IP addresses are considered personal data under GDPR
- Add cookie consent banner if operating in EU
- Include analytics tracking in your privacy policy
- Consider anonymizing IPs by removing last octet:
  ```javascript
  // In analyticsController.js
  const anonymizedIP = ip.split('.').slice(0, 3).join('.') + '.0';
  ```

## Testing

### Test Locally
```bash
# Start server
cd server && npm run dev

# Start client
cd client && npm run dev

# Visit http://localhost:5173
# Check browser console: "Visitor tracked successfully"
# Check server logs for geolocation response
```

### View Database
```bash
# Connect to MongoDB
mongosh

# Use your database
use your_database_name

# View analytics
db.visitoranalytics.find().limit(10).pretty()
```

### Reset Session (Testing)
In browser console:
```javascript
// Reset session to trigger tracking again
sessionStorage.removeItem('visitor_session_id');
sessionStorage.removeItem('visitor_tracked');
location.reload();
```

## Dashboard Integration

✅ **Visitor Analytics Section Added to Admin Dashboard**

The admin dashboard now includes a comprehensive visitor analytics section that displays:

- **Summary Cards:**
  - Total Visitors
  - Unique Visitors (by session)
  - Conversion Rate (visitors who made purchases)

- **Analytics Details:**
  - **Top Countries** - Geographic distribution of visitors
  - **Traffic Sources** - Where visitors came from (Google, Facebook, Direct, etc.)
  - **Device Types** - Mobile, desktop, and tablet breakdown

**Period Selector:** Choose between 7 days, 30 days, 90 days, or 1 year to view analytics for different time periods.

**Files Modified:**
- `client/src/api/analytics.ts` - API integration
- `client/src/components/dashboard/DashboardAdminSection.tsx` - Dashboard section added

## Next Steps

Consider adding:
1. ✅ **Dashboard Widget** - Display visitor analytics in admin dashboard (COMPLETED)
2. **Real-time Tracking** - Track page views, time on site, bounce rate
3. **Conversion Attribution** - Link orders to original visitor source
4. **A/B Testing** - Test different campaigns and track performance
5. **Heatmaps** - Track user interactions and clicks

## Support

For IP geolocation issues:
- Check rate limits (1000/day for ipapi.co)
- Localhost IPs won't return location data
- Consider upgrading to paid service for production
