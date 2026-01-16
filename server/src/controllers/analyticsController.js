const VisitorAnalytics = require('../models/VisitorAnalytics');

/**
 * Get visitor's IP address (handles proxies and load balancers)
 */
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress;
};

/**
 * Parse referrer URL to identify source
 */
const parseReferrerSource = (referrer) => {
  if (!referrer) return 'Direct';

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();

    // Filter out localhost and development URLs
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost:')) {
      return 'Direct';
    }

    if (hostname.includes('google')) return 'Google';
    if (hostname.includes('facebook') || hostname.includes('fb.')) return 'Facebook';
    if (hostname.includes('instagram')) return 'Instagram';
    if (hostname.includes('twitter') || hostname.includes('t.co')) return 'Twitter';
    if (hostname.includes('linkedin')) return 'LinkedIn';
    if (hostname.includes('youtube')) return 'YouTube';
    if (hostname.includes('tiktok')) return 'TikTok';
    if (hostname.includes('pinterest')) return 'Pinterest';
    if (hostname.includes('reddit')) return 'Reddit';
    if (hostname.includes('bing')) return 'Bing';
    if (hostname.includes('yahoo')) return 'Yahoo';

    return hostname;
  } catch (error) {
    return 'Direct';
  }
};

/**
 * Get geographic location from IP address using ipapi.co
 * Free tier: 1000 requests per day
 * Alternative services if needed:
 * - http://ip-api.com/json/${ip} (45 requests/minute)
 * - https://ipgeolocation.io (1000/day with API key)
 */
const getLocationFromIP = async (ip) => {
  // Skip localhost/private IPs
  if (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.')
  ) {
    return {
      country: null,
      countryCode: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
    };
  }

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);

    if (!response.ok) {
      console.warn(`IP geolocation failed for ${ip}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Check for API error
    if (data.error) {
      console.warn(`IP geolocation error for ${ip}:`, data.reason);
      return null;
    }

    return {
      country: data.country_name || null,
      countryCode: data.country_code || null,
      region: data.region || null,
      city: data.city || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      timezone: data.timezone || null,
    };
  } catch (error) {
    console.error('Error fetching IP geolocation:', error.message);
    return null;
  }
};

/**
 * Parse device type from user agent
 */
const parseDeviceType = (userAgent) => {
  if (!userAgent) return null;

  const ua = userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * Track a new visitor
 * POST /api/analytics/track
 */
exports.trackVisitor = async (req, res) => {
  try {
    const {
      sessionId,
      referrer,
      landingPage,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
    } = req.body;

    // Validate required fields
    if (!sessionId || !landingPage) {
      return res.status(400).json({
        success: false,
        message: 'sessionId and landingPage are required',
      });
    }

    // Get client IP
    const ipAddress = getClientIP(req);

    // Get location from IP
    const location = await getLocationFromIP(ipAddress);

    // Parse referrer source
    const referrerSource = utmSource ? utmSource : parseReferrerSource(referrer);

    // Parse device info from user agent
    const userAgent = req.headers['user-agent'] || null;
    const deviceType = parseDeviceType(userAgent);

    // Get user ID if authenticated
    const userId = req.user?._id || null;

    // Create analytics entry
    const analytics = new VisitorAnalytics({
      sessionId,
      referrer: referrer || null,
      referrerSource,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      utmTerm: utmTerm || null,
      utmContent: utmContent || null,
      ipAddress,
      country: location?.country || null,
      countryCode: location?.countryCode || null,
      region: location?.region || null,
      city: location?.city || null,
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
      timezone: location?.timezone || null,
      userAgent,
      deviceType,
      landingPage,
      userId,
    });

    await analytics.save();

    res.status(201).json({
      success: true,
      message: 'Visitor tracked successfully',
      data: {
        sessionId: analytics.sessionId,
        country: analytics.country,
        referrerSource: analytics.referrerSource,
      },
    });
  } catch (error) {
    console.error('Error tracking visitor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track visitor',
      error: error.message,
    });
  }
};

/**
 * Get analytics summary
 * GET /api/analytics/summary
 */
exports.getAnalyticsSummary = async (req, res) => {
  try {
    const { startDate, endDate, period = '30d' } = req.query;

    // Calculate date range
    const parsedStart = startDate ? new Date(startDate) : null;
    const parsedEnd = endDate ? new Date(endDate) : null;
    const hasCustomRange =
      parsedStart &&
      parsedEnd &&
      !Number.isNaN(parsedStart.getTime()) &&
      !Number.isNaN(parsedEnd.getTime());
    const startIsDateOnly = typeof startDate === 'string' && !startDate.includes('T');
    const endIsDateOnly = typeof endDate === 'string' && !endDate.includes('T');
    const periodMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    const startOfUtcDay = (value) =>
      new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    const endOfUtcDay = (value) =>
      new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));

    const rangeEnd = hasCustomRange
      ? (endIsDateOnly ? endOfUtcDay(parsedEnd) : parsedEnd)
      : new Date();
    let rangeStart = parsedStart;
    if (hasCustomRange) {
      rangeStart = startIsDateOnly ? startOfUtcDay(parsedStart) : parsedStart;
    } else {
      const endUtc = startOfUtcDay(rangeEnd);
      rangeStart = new Date(endUtc);
      rangeStart.setUTCDate(rangeStart.getUTCDate() - ((periodMap[period] || 30) - 1));
    }

    const dateFilter = {
      createdAt: {
        $gte: rangeStart,
        $lte: rangeEnd,
      },
    };

    const trendFilter = dateFilter;
    const trendStart = startOfUtcDay(rangeStart);
    const trendEnd = startOfUtcDay(rangeEnd);
    const dayBucket = {
      $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: 'UTC' },
    };

    // Get summary data
    const [
      totalVisitors,
      uniqueVisitors,
      conversionRate,
      topCountries,
      topReferrers,
      deviceBreakdown,
      dailyTotals,
      dailyUniques,
      dailyDevices,
    ] = await Promise.all([
      // Total visitors
      VisitorAnalytics.countDocuments(dateFilter),

      // Unique visitors (by session ID)
      VisitorAnalytics.distinct('sessionId', dateFilter).then((sessions) => sessions.length),

      // Conversion rate
      VisitorAnalytics.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            converted: { $sum: { $cond: ['$converted', 1, 0] } },
          },
        },
      ]).then((result) => {
        if (result.length === 0) return 0;
        const { total, converted } = result[0];
        return total > 0 ? ((converted / total) * 100).toFixed(2) : 0;
      }),

      // Top countries
      VisitorAnalytics.aggregate([
        { $match: { ...dateFilter, country: { $ne: null } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Top referrers
      VisitorAnalytics.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$referrerSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Device breakdown
      VisitorAnalytics.aggregate([
        { $match: { ...dateFilter, deviceType: { $ne: null } } },
        { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      ]),

      // Daily totals
      VisitorAnalytics.aggregate([
        { $match: trendFilter },
        { $group: { _id: dayBucket, count: { $sum: 1 } } },
      ]),

      // Daily uniques
      VisitorAnalytics.aggregate([
        { $match: trendFilter },
        { $group: { _id: { day: dayBucket, sessionId: '$sessionId' } } },
        { $group: { _id: '$_id.day', count: { $sum: 1 } } },
      ]),

      // Daily device breakdown
      VisitorAnalytics.aggregate([
        { $match: { ...trendFilter, deviceType: { $ne: null } } },
        { $group: { _id: { day: dayBucket, device: '$deviceType' }, count: { $sum: 1 } } },
      ]),
    ]);

    const trendLabels = [];
    if (trendStart <= trendEnd) {
      const cursor = new Date(trendStart);
      while (cursor <= trendEnd) {
        trendLabels.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    const labelIndex = new Map(trendLabels.map((label, index) => [label, index]));
    const totalSeries = Array(trendLabels.length).fill(0);
    const uniqueSeries = Array(trendLabels.length).fill(0);
    const deviceSeries = {};

    dailyTotals.forEach((item) => {
      const idx = labelIndex.get(item._id);
      if (idx !== undefined) {
        totalSeries[idx] = item.count;
      }
    });

    dailyUniques.forEach((item) => {
      const idx = labelIndex.get(item._id);
      if (idx !== undefined) {
        uniqueSeries[idx] = item.count;
      }
    });

    dailyDevices.forEach((item) => {
      const day = item._id?.day;
      const device = item._id?.device;
      if (!day || !device) return;
      const idx = labelIndex.get(day);
      if (idx === undefined) return;
      if (!deviceSeries[device]) {
        deviceSeries[device] = Array(trendLabels.length).fill(0);
      }
      deviceSeries[device][idx] = item.count;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalVisitors,
          uniqueVisitors,
          conversionRate: parseFloat(conversionRate),
        },
        trends: {
          labels: trendLabels,
          visitors: {
            total: totalSeries,
            unique: uniqueSeries,
          },
          devices: deviceSeries,
        },
        topCountries: topCountries.map((item) => ({
          country: item._id,
          visitors: item.count,
        })),
        topReferrers: topReferrers.map((item) => ({
          source: item._id,
          visitors: item.count,
        })),
        deviceBreakdown: deviceBreakdown.map((item) => ({
          device: item._id,
          visitors: item.count,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics summary',
      error: error.message,
    });
  }
};
