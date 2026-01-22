/**
 * ShipEngine (ShipStation API) Service
 *
 * Provides integration with ShipEngine for:
 * - Creating shipping labels
 * - Tracking packages
 * - Validating addresses
 * - Getting shipping rates
 *
 * Documentation: https://www.shipengine.com/docs/
 */

const SHIPENGINE_API_BASE = 'https://api.shipengine.com';

// Environment configuration (fallback)
const getConfig = () => ({
  apiKey: process.env.SHIPENGINE_API_KEY || '',
  carrierIds: (process.env.SHIPENGINE_CARRIER_IDS || '').split(',').filter(Boolean),
  warehouseId: process.env.SHIPENGINE_WAREHOUSE_ID || '',
  isSandbox: process.env.SHIPENGINE_SANDBOX === 'true',
});

/**
 * Get configuration from database settings
 * This is the preferred method - reads from ShipEngineSettings model
 */
const getConfigFromDb = async () => {
  try {
    const ShipEngineSettings = require('../models/ShipEngineSettings');
    const settings = await ShipEngineSettings.getSettings();

    // Return db settings merged with env fallback
    const envConfig = getConfig();
    return {
      apiKey: settings.apiKey || envConfig.apiKey,
      carrierIds: settings.carriers?.filter(c => c.isEnabled !== false).map(c => c.carrierId) || envConfig.carrierIds,
      defaultCarrierId: settings.defaultCarrierId || settings.carriers?.[0]?.carrierId || envConfig.carrierIds[0],
      warehouseId: settings.warehouseId || envConfig.warehouseId,
      isSandbox: settings.isSandbox ?? envConfig.isSandbox,
      shipFromAddress: settings.shipFromAddress || null,
      carriers: settings.carriers || [],
    };
  } catch (error) {
    console.warn('Failed to load ShipEngine settings from DB, using env vars:', error.message);
    return getConfig();
  }
};

/**
 * Make an authenticated request to ShipEngine API
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @param {string} apiKey - Optional API key (will use config if not provided)
 */
const shipEngineRequest = async (method, endpoint, body = null, apiKey = null) => {
  const effectiveApiKey = apiKey || getConfig().apiKey;

  if (!effectiveApiKey) {
    throw new Error('SHIPENGINE_API_KEY is not configured');
  }

  const options = {
    method,
    headers: {
      'API-Key': effectiveApiKey,
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${SHIPENGINE_API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.errors?.[0]?.message || data.message || 'ShipEngine API error';
    const error = new Error(errorMessage);
    error.status = response.status;
    error.shipEngineErrors = data.errors || [];
    throw error;
  }

  return data;
};

/**
 * Format address for ShipEngine API
 * @param {Object} address - Address object from our system
 * @param {Object} options - Additional options (name, phone, email, isResidential)
 * @returns {Object} ShipEngine-formatted address
 */
const formatAddress = (address, options = {}) => {
  if (!address) {
    throw new Error('Address is required');
  }

  return {
    name: options.name || address.fullName || '',
    phone: options.phone || address.phone || '',
    email: options.email || '',
    company_name: options.companyName || '',
    address_line1: address.addressLine1 || '',
    address_line2: address.addressLine2 || '',
    city_locality: address.city || '',
    state_province: address.state || '',
    postal_code: address.postalCode || '',
    country_code: mapCountryToCode(address.country) || 'US',
    address_residential_indicator: options.isResidential ? 'yes' : 'no',
  };
};

/**
 * Map country name to ISO 2-letter code
 */
const mapCountryToCode = (country) => {
  if (!country) return 'US';

  const countryMap = {
    'united states': 'US',
    'united states of america': 'US',
    usa: 'US',
    us: 'US',
    canada: 'CA',
    mexico: 'MX',
    'united kingdom': 'GB',
    uk: 'GB',
    australia: 'AU',
    germany: 'DE',
    france: 'FR',
    morocco: 'MA',
    // Add more as needed
  };

  const normalized = country.toLowerCase().trim();
  return countryMap[normalized] || country.substring(0, 2).toUpperCase();
};

/**
 * Get the default warehouse/ship-from address
 */
const getWarehouseAddress = async () => {
  const config = getConfig();

  if (!config.warehouseId) {
    throw new Error('SHIPENGINE_WAREHOUSE_ID is not configured');
  }

  const data = await shipEngineRequest('GET', `/v1/warehouses/${config.warehouseId}`);
  return data;
};

/**
 * Validate a shipping address
 * @param {Object} address - Address to validate
 * @returns {Object} Validation result with normalized address
 */
const validateAddress = async (address) => {
  const formattedAddress = formatAddress(address);

  const data = await shipEngineRequest('POST', '/v1/addresses/validate', [formattedAddress]);

  const result = data[0] || {};
  return {
    isValid: result.status === 'verified' || result.status === 'warning',
    status: result.status,
    originalAddress: result.original_address,
    normalizedAddress: result.matched_address
      ? {
        addressLine1: result.matched_address.address_line1,
        addressLine2: result.matched_address.address_line2,
        city: result.matched_address.city_locality,
        state: result.matched_address.state_province,
        postalCode: result.matched_address.postal_code,
        country: result.matched_address.country_code,
      }
      : null,
    messages: result.messages || [],
  };
};

/**
 * Get shipping rates for a shipment
 * @param {Object} options - Shipment options
 * @param {Object} options.shipTo - Destination address
 * @param {Object} options.shipFrom - Origin address (optional, uses warehouse if not provided)
 * @param {Array} options.packages - Array of package objects with weight and dimensions
 * @param {Array} options.carrierIds - Specific carrier IDs (optional, uses default if not provided)
 * @returns {Object} Rate quotes from carriers
 */
const getRates = async ({ shipTo, shipFrom, packages, carrierIds }) => {
  const config = getConfig();
  const effectiveCarrierIds = carrierIds || config.carrierIds;

  if (!effectiveCarrierIds.length) {
    throw new Error('No carrier IDs configured');
  }

  // If no shipFrom, we need to get warehouse address first
  let fromAddress = shipFrom;
  if (!fromAddress) {
    const warehouse = await getWarehouseAddress();
    fromAddress = {
      addressLine1: warehouse.origin_address?.address_line1,
      addressLine2: warehouse.origin_address?.address_line2,
      city: warehouse.origin_address?.city_locality,
      state: warehouse.origin_address?.state_province,
      postalCode: warehouse.origin_address?.postal_code,
      country: warehouse.origin_address?.country_code,
    };
  }

  const requestBody = {
    carrier_ids: effectiveCarrierIds,
    shipment: {
      validate_address: 'no_validation',
      ship_to: formatAddress(shipTo, { isResidential: true }),
      ship_from: formatAddress(fromAddress, { isResidential: false }),
      packages: packages.map((pkg) => ({
        weight: {
          value: pkg.weight || 1,
          unit: pkg.weightUnit || 'ounce',
        },
        dimensions: pkg.dimensions
          ? {
            length: pkg.dimensions.length || 1,
            width: pkg.dimensions.width || 1,
            height: pkg.dimensions.height || 1,
            unit: pkg.dimensions.unit || 'inch',
          }
          : undefined,
      })),
    },
  };

  const data = await shipEngineRequest('POST', '/v1/rates', requestBody);

  // Transform rates to a simpler format
  const rates = (data.rate_response?.rates || []).map((rate) => ({
    rateId: rate.rate_id,
    carrierId: rate.carrier_id,
    carrierCode: rate.carrier_code,
    carrierName: rate.carrier_friendly_name,
    serviceCode: rate.service_code,
    serviceName: rate.service_type,
    shippingAmount: rate.shipping_amount?.amount || 0,
    currency: rate.shipping_amount?.currency || 'usd',
    deliveryDays: rate.delivery_days,
    estimatedDelivery: rate.estimated_delivery_date,
    isGuaranteed: rate.guaranteed_service,
    isTrackable: rate.trackable,
  }));

  return {
    shipmentId: data.shipment_id,
    rates,
    invalidRates: data.rate_response?.invalid_rates || [],
    errors: data.rate_response?.errors || [],
  };
};

/**
 * Create a shipping label
 * @param {Object} options - Label options
 * @param {string} options.rateId - Rate ID from getRates (optional)
 * @param {Object} options.shipTo - Destination address
 * @param {Object} options.shipFrom - Origin address (optional, uses warehouse)
 * @param {string} options.carrierId - Carrier ID
 * @param {string} options.serviceCode - Service code (e.g., 'ups_ground')
 * @param {Array} options.packages - Package details
 * @param {string} options.labelFormat - Label format: 'pdf', 'png', 'zpl' (default: 'pdf')
 * @returns {Object} Label details with tracking number and download URL
 */
const createLabel = async ({
  rateId,
  shipTo,
  shipFrom,
  carrierId,
  serviceCode,
  packages,
  labelFormat = 'pdf',
}) => {
  // If we have a rateId, create label from rate (simpler)
  if (rateId) {
    const data = await shipEngineRequest('POST', `/v1/labels/rates/${rateId}`, {
      label_format: labelFormat,
      label_layout: '4x6',
    });

    return formatLabelResponse(data);
  }

  // Otherwise, create label from shipment details
  const config = getConfig();
  const effectiveCarrierId = carrierId || config.carrierIds[0];

  if (!effectiveCarrierId) {
    throw new Error('No carrier ID provided or configured');
  }

  // Get warehouse address if shipFrom not provided
  let fromAddress = shipFrom;
  if (!fromAddress) {
    const warehouse = await getWarehouseAddress();
    fromAddress = {
      addressLine1: warehouse.origin_address?.address_line1,
      addressLine2: warehouse.origin_address?.address_line2,
      city: warehouse.origin_address?.city_locality,
      state: warehouse.origin_address?.state_province,
      postalCode: warehouse.origin_address?.postal_code,
      country: warehouse.origin_address?.country_code,
      fullName: warehouse.name,
      phone: warehouse.origin_address?.phone,
    };
  }

  const requestBody = {
    label_format: labelFormat,
    label_layout: '4x6',
    shipment: {
      carrier_id: effectiveCarrierId,
      service_code: serviceCode,
      ship_to: formatAddress(shipTo, {
        name: shipTo.fullName,
        phone: shipTo.phone,
        isResidential: true,
      }),
      ship_from: formatAddress(fromAddress, {
        name: fromAddress.fullName || 'Warehouse',
        phone: fromAddress.phone,
        isResidential: false,
      }),
      packages: packages.map((pkg) => ({
        weight: {
          value: pkg.weight || 16,
          unit: pkg.weightUnit || 'ounce',
        },
        dimensions: pkg.dimensions
          ? {
            length: pkg.dimensions.length || 12,
            width: pkg.dimensions.width || 8,
            height: pkg.dimensions.height || 4,
            unit: pkg.dimensions.unit || 'inch',
          }
          : undefined,
      })),
    },
  };

  const data = await shipEngineRequest('POST', '/v1/labels', requestBody);
  return formatLabelResponse(data);
};

/**
 * Format label API response to consistent structure
 */
const formatLabelResponse = (data) => ({
  labelId: data.label_id,
  shipmentId: data.shipment_id,
  status: data.status,
  trackingNumber: data.tracking_number,
  trackingUrl: data.tracking_url,
  carrierCode: data.carrier_code,
  carrierId: data.carrier_id,
  serviceCode: data.service_code,
  serviceName: data.service_type,
  labelDownload: {
    pdf: data.label_download?.pdf,
    png: data.label_download?.png,
    zpl: data.label_download?.zpl,
    href: data.label_download?.href,
  },
  shipDate: data.ship_date,
  estimatedDelivery: data.estimated_delivery_date,
  shippingCost: {
    amount: data.shipment_cost?.amount || 0,
    currency: data.shipment_cost?.currency || 'usd',
  },
  insuranceCost: {
    amount: data.insurance_cost?.amount || 0,
    currency: data.insurance_cost?.currency || 'usd',
  },
  isVoided: data.voided || false,
  createdAt: data.created_at,
});

/**
 * Get tracking information for a shipment
 * @param {string} carrierCode - Carrier code (e.g., 'ups', 'fedex', 'usps')
 * @param {string} trackingNumber - Package tracking number
 * @returns {Object} Tracking status and events
 */
const getTrackingInfo = async (carrierCode, trackingNumber) => {
  if (!carrierCode || !trackingNumber) {
    throw new Error('Carrier code and tracking number are required');
  }

  const data = await shipEngineRequest(
    'GET',
    `/v1/tracking?carrier_code=${encodeURIComponent(carrierCode)}&tracking_number=${encodeURIComponent(trackingNumber)}`
  );

  return {
    trackingNumber: data.tracking_number,
    trackingUrl: data.tracking_url,
    carrierCode: data.carrier_code,
    statusCode: data.status_code,
    statusDescription: data.status_description,
    carrierStatusCode: data.carrier_status_code,
    carrierStatusDescription: data.carrier_status_description,
    shipDate: data.ship_date,
    estimatedDelivery: data.estimated_delivery_date,
    actualDelivery: data.actual_delivery_date,
    exceptionDescription: data.exception_description,
    events: (data.events || []).map((event) => ({
      occurredAt: event.occurred_at,
      description: event.description,
      city: event.city_locality,
      state: event.state_province,
      postalCode: event.postal_code,
      country: event.country_code,
      statusCode: event.status_code,
      statusDescription: event.status_description,
      latitude: event.latitude,
      longitude: event.longitude,
    })),
  };
};

/**
 * Void (cancel) a shipping label
 * @param {string} labelId - The label ID to void
 * @returns {Object} Void result
 */
const voidLabel = async (labelId) => {
  if (!labelId) {
    throw new Error('Label ID is required');
  }

  const data = await shipEngineRequest('PUT', `/v1/labels/${labelId}/void`);

  return {
    labelId: data.label_id,
    approved: data.approved,
    message: data.message,
  };
};

/**
 * Check if ShipEngine is properly configured (sync - uses env vars)
 * @returns {Object} Configuration status
 */
const checkConfiguration = () => {
  const config = getConfig();

  return {
    isConfigured: Boolean(config.apiKey && config.carrierIds.length > 0),
    hasApiKey: Boolean(config.apiKey),
    isSandbox: config.isSandbox || config.apiKey.startsWith('TEST_'),
    carrierCount: config.carrierIds.length,
    hasWarehouse: Boolean(config.warehouseId),
  };
};

/**
 * Check if ShipEngine is properly configured (async - uses database)
 * @returns {Object} Configuration status
 */
const checkConfigurationFromDb = async () => {
  const config = await getConfigFromDb();

  return {
    isConfigured: Boolean(config.apiKey && config.carrierIds.length > 0),
    hasApiKey: Boolean(config.apiKey),
    isSandbox: config.isSandbox || (config.apiKey && config.apiKey.startsWith('TEST_')),
    carrierCount: config.carrierIds.length,
    hasWarehouse: Boolean(config.warehouseId),
    defaultCarrierId: config.defaultCarrierId || null,
    shipFromAddress: config.shipFromAddress || null,
  };
};

/**
 * Create label using database settings
 */
const createLabelFromDb = async (options) => {
  const config = await getConfigFromDb();

  if (!config.apiKey) {
    throw new Error('ShipEngine API key not configured');
  }

  // Use shipFrom from database settings if not provided
  const shipFrom = options.shipFrom || config.shipFromAddress;
  const carrierId = options.carrierId || config.defaultCarrierId;

  return createLabelWithConfig({
    ...options,
    shipFrom,
    carrierId,
    apiKey: config.apiKey,
  });
};

/**
 * Create label with explicit config (internal)
 */
const createLabelWithConfig = async ({
  rateId,
  shipTo,
  shipFrom,
  carrierId,
  serviceCode,
  packages,
  labelFormat = 'pdf',
  apiKey,
}) => {
  // If we have a rateId, create label from rate
  if (rateId) {
    const data = await shipEngineRequest('POST', `/v1/labels/rates/${rateId}`, {
      label_format: labelFormat,
      label_layout: '4x6',
    }, apiKey);

    return formatLabelResponse(data);
  }

  if (!carrierId) {
    throw new Error('No carrier ID provided or configured');
  }

  if (!shipFrom) {
    throw new Error('Ship-from address is required');
  }

  const requestBody = {
    label_format: labelFormat,
    label_layout: '4x6',
    shipment: {
      carrier_id: carrierId,
      service_code: serviceCode,
      ship_to: formatAddress(shipTo, {
        name: shipTo.fullName,
        phone: shipTo.phone,
        isResidential: true,
      }),
      ship_from: formatAddress(shipFrom, {
        name: shipFrom.name || shipFrom.fullName || 'Warehouse',
        phone: shipFrom.phone,
        companyName: shipFrom.companyName,
        isResidential: false,
      }),
      packages: packages.map((pkg) => ({
        weight: {
          value: pkg.weight || 16,
          unit: pkg.weightUnit || 'ounce',
        },
        dimensions: pkg.dimensions
          ? {
            length: pkg.dimensions.length || 12,
            width: pkg.dimensions.width || 8,
            height: pkg.dimensions.height || 4,
            unit: pkg.dimensions.unit || 'inch',
          }
          : undefined,
      })),
    },
  };

  const data = await shipEngineRequest('POST', '/v1/labels', requestBody, apiKey);
  return formatLabelResponse(data);
};

module.exports = {
  validateAddress,
  getRates,
  createLabel,
  createLabelFromDb,
  getTrackingInfo,
  voidLabel,
  checkConfiguration,
  checkConfigurationFromDb,
  getConfigFromDb,
  getWarehouseAddress,
  formatAddress,
  mapCountryToCode,
};
