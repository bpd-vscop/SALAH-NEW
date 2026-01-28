const ShipEngineSettings = require('../models/ShipEngineSettings');
const { forbidden } = require('../utils/appError');

/**
 * Get ShipEngine settings (without full API key)
 */
const getSettings = async (req, res, next) => {
    try {
        const settings = await ShipEngineSettings.getSettings();
        res.json({ settings: settings.toJSON() });
    } catch (error) {
        next(error);
    }
};

/**
 * Update ShipEngine settings
 */
const updateSettings = async (req, res, next) => {
    try {
        const data = req.body || {};

        const updateData = {};

        // Only update fields that are provided
        if (typeof data.apiKey === 'string') {
            updateData.apiKey = data.apiKey.trim();
        }
        if (typeof data.warehouseId === 'string') {
            updateData.warehouseId = data.warehouseId.trim();
        }
        if (typeof data.isSandbox === 'boolean') {
            updateData.isSandbox = data.isSandbox;
        }
        if (typeof data.defaultCarrierId === 'string') {
            updateData.defaultCarrierId = data.defaultCarrierId.trim();
        }
        if (Array.isArray(data.carriers)) {
            updateData.carriers = data.carriers
                .filter((c) => c && typeof c.carrierId === 'string' && c.carrierId.trim())
                .map((c) => ({
                    name: (typeof c.name === 'string' && c.name.trim()) ? c.name.trim() : c.carrierId.trim(),
                    carrierId: c.carrierId.trim(),
                    carrierCode: typeof c.carrierCode === 'string' ? c.carrierCode.trim() : '',
                    isEnabled: c.isEnabled !== false,
                }));
        }
        if (data.shipFromAddress && typeof data.shipFromAddress === 'object') {
            updateData.shipFromAddress = {
                name: data.shipFromAddress.name || '',
                companyName: data.shipFromAddress.companyName || '',
                phone: data.shipFromAddress.phone || '',
                addressLine1: data.shipFromAddress.addressLine1 || '',
                addressLine2: data.shipFromAddress.addressLine2 || '',
                city: data.shipFromAddress.city || '',
                state: data.shipFromAddress.state || '',
                postalCode: data.shipFromAddress.postalCode || '',
                country: data.shipFromAddress.country || 'US',
            };
        }

        const settings = await ShipEngineSettings.updateSettings(updateData);
        res.json({ settings: settings.toJSON(), message: 'Settings updated successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Test ShipEngine connection with current settings
 */
const testConnection = async (req, res, next) => {
    try {
        const settings = await ShipEngineSettings.getSettings();

        if (!settings.apiKey) {
            return res.json({
                success: false,
                message: 'No API key configured'
            });
        }

        // Test the connection by making a simple API call
        const response = await fetch('https://api.shipengine.com/v1/carriers', {
            method: 'GET',
            headers: {
                'API-Key': settings.apiKey,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            const carriers = (data.carriers || []).map((c) => ({
                carrierId: c.carrier_id,
                name: c.friendly_name || c.carrier_code,
                carrierCode: c.carrier_code,
            }));

            res.json({
                success: true,
                message: 'Connection successful',
                carriers,
            });
        } else {
            const errorData = await response.json().catch(() => ({}));
            res.json({
                success: false,
                message: errorData.errors?.[0]?.message || 'Failed to connect to ShipEngine'
            });
        }
    } catch (error) {
        res.json({
            success: false,
            message: error.message || 'Connection test failed'
        });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    testConnection,
};
