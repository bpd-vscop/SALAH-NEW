const ShipEngineSettings = require('../models/ShipEngineSettings');
const { badRequest } = require('../utils/appError');

const SHIPENGINE_API_BASE = 'https://api.shipengine.com';

/**
 * Get shipping rates for cart items
 * Fetches real rates from ShipEngine based on configured carriers
 */
const getRates = async (req, res, next) => {
    try {
        const { shipTo, packages } = req.body || {};

        if (!shipTo || !shipTo.postalCode) {
            throw badRequest('Shipping address with postal code is required');
        }

        // Get ShipEngine settings from database
        const settings = await ShipEngineSettings.getSettings();

        if (!settings.apiKey) {
            return res.json({
                success: false,
                message: 'Shipping is not configured',
                rates: [],
            });
        }

        const enabledCarriers = settings.carriers.filter((c) => c.isEnabled !== false);
        if (enabledCarriers.length === 0) {
            return res.json({
                success: false,
                message: 'No carriers configured',
                rates: [],
            });
        }

        // Build ship-from address from settings or use default
        const shipFromAddress = settings.shipFromAddress || {};
        const shipFrom = {
            name: shipFromAddress.name || 'Warehouse',
            company_name: shipFromAddress.companyName || '',
            phone: shipFromAddress.phone || '',
            address_line1: shipFromAddress.addressLine1 || '',
            address_line2: shipFromAddress.addressLine2 || '',
            city_locality: shipFromAddress.city || '',
            state_province: shipFromAddress.state || '',
            postal_code: shipFromAddress.postalCode || '',
            country_code: shipFromAddress.country || 'US',
            address_residential_indicator: 'no',
        };

        // Format ship-to address
        const shipToFormatted = {
            name: shipTo.fullName || shipTo.name || 'Customer',
            phone: shipTo.phone || '',
            address_line1: shipTo.addressLine1 || shipTo.address_line1 || '',
            address_line2: shipTo.addressLine2 || shipTo.address_line2 || '',
            city_locality: shipTo.city || shipTo.city_locality || '',
            state_province: shipTo.state || shipTo.state_province || '',
            postal_code: shipTo.postalCode || shipTo.postal_code || '',
            country_code: mapCountryToCode(shipTo.country) || 'US',
            address_residential_indicator: 'yes',
        };

        // Default package if not provided
        const shipPackages = packages && packages.length > 0
            ? packages.map((pkg) => ({
                weight: { value: pkg.weight || 16, unit: pkg.weightUnit || 'ounce' },
                dimensions: pkg.dimensions ? {
                    length: pkg.dimensions.length || 12,
                    width: pkg.dimensions.width || 8,
                    height: pkg.dimensions.height || 4,
                    unit: pkg.dimensions.unit || 'inch',
                } : undefined,
            }))
            : [{ weight: { value: 16, unit: 'ounce' } }];

        const requestBody = {
            carrier_ids: enabledCarriers.map((c) => c.carrierId),
            shipment: {
                validate_address: 'no_validation',
                ship_to: shipToFormatted,
                ship_from: shipFrom,
                packages: shipPackages,
            },
        };

        const response = await fetch(`${SHIPENGINE_API_BASE}/v1/rates`, {
            method: 'POST',
            headers: {
                'API-Key': settings.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('ShipEngine rates error:', data);
            return res.json({
                success: false,
                message: data.errors?.[0]?.message || 'Failed to get shipping rates',
                rates: [],
            });
        }

        // Transform rates to simpler format
        const rates = (data.rate_response?.rates || [])
            .filter((rate) => !rate.error_messages?.length)
            .map((rate) => {
                // Find carrier name from settings
                const carrier = enabledCarriers.find((c) => c.carrierId === rate.carrier_id);
                return {
                    rateId: rate.rate_id,
                    carrierId: rate.carrier_id,
                    carrierCode: rate.carrier_code,
                    carrierName: carrier?.name || rate.carrier_friendly_name || rate.carrier_code,
                    serviceCode: rate.service_code,
                    serviceName: rate.service_type,
                    price: rate.shipping_amount?.amount || 0,
                    currency: rate.shipping_amount?.currency || 'usd',
                    deliveryDays: rate.delivery_days,
                    estimatedDelivery: rate.estimated_delivery_date,
                    carrierDeliveryDays: rate.carrier_delivery_days,
                    isGuaranteed: rate.guaranteed_service || false,
                };
            })
            .sort((a, b) => a.price - b.price);

        res.json({
            success: true,
            rates,
            shipmentId: data.shipment_id,
        });
    } catch (error) {
        console.error('Get rates error:', error);
        next(error);
    }
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
    };

    const normalized = country.toLowerCase().trim();
    return countryMap[normalized] || country.substring(0, 2).toUpperCase();
};

module.exports = {
    getRates,
};
