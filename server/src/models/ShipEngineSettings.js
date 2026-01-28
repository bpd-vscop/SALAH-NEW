const mongoose = require('mongoose');

const carrierSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        carrierId: {
            type: String,
            required: true,
            trim: true,
        },
        carrierCode: {
            type: String,
            trim: true,
        },
        isEnabled: {
            type: Boolean,
            default: true,
        },
    },
    { _id: false }
);

const shipEngineSettingsSchema = new mongoose.Schema(
    {
        apiKey: {
            type: String,
            trim: true,
            default: '',
        },
        warehouseId: {
            type: String,
            trim: true,
            default: '',
        },
        isSandbox: {
            type: Boolean,
            default: true,
        },
        carriers: {
            type: [carrierSchema],
            default: [],
        },
        defaultCarrierId: {
            type: String,
            trim: true,
            default: '',
        },
        // Ship-from address (warehouse)
        shipFromAddress: {
            name: { type: String, trim: true },
            companyName: { type: String, trim: true },
            phone: { type: String, trim: true },
            addressLine1: { type: String, trim: true },
            addressLine2: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            postalCode: { type: String, trim: true },
            country: { type: String, trim: true, default: 'US' },
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        minimize: false,
        toJSON: {
            virtuals: false,
            transform: (_doc, ret) => {
                ret.id = ret._id.toString();
                // Mask API key for security (show only last 4 chars)
                if (ret.apiKey && ret.apiKey.length > 4) {
                    ret.apiKeyMasked = '****' + ret.apiKey.slice(-4);
                } else {
                    ret.apiKeyMasked = ret.apiKey ? '****' : '';
                }
                ret.hasApiKey = Boolean(ret.apiKey && ret.apiKey.length > 0);
                ret.carriers = Array.isArray(ret.carriers)
                    ? ret.carriers.map((c) => ({
                        name: c.name,
                        carrierId: c.carrierId,
                        carrierCode: c.carrierCode || null,
                        isEnabled: c.isEnabled !== false,
                    }))
                    : [];
                ret.warehouseId = ret.warehouseId || '';
                ret.isSandbox = typeof ret.isSandbox === 'boolean' ? ret.isSandbox : true;
                ret.defaultCarrierId = ret.defaultCarrierId || '';
                // Always return a complete shipFromAddress object
                const sfa = ret.shipFromAddress || {};
                ret.shipFromAddress = {
                    name: sfa.name || '',
                    companyName: sfa.companyName || '',
                    phone: sfa.phone || '',
                    addressLine1: sfa.addressLine1 || '',
                    addressLine2: sfa.addressLine2 || '',
                    city: sfa.city || '',
                    state: sfa.state || '',
                    postalCode: sfa.postalCode || '',
                    country: sfa.country || 'US',
                };
                ret.createdAt = ret.createdAt ? new Date(ret.createdAt).toISOString() : null;
                ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
                delete ret._id;
                delete ret.__v;
                // Don't expose full API key in response
                delete ret.apiKey;
                return ret;
            },
        },
    }
);

shipEngineSettingsSchema.pre('save', function updateTimestamp(next) {
    this.updatedAt = new Date();
    next();
});

// Singleton pattern - always get/update the single settings document
shipEngineSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

shipEngineSettingsSchema.statics.updateSettings = async function (data) {
    let settings = await this.findOne();
    if (!settings) {
        settings = new this();
    }

    if (data.apiKey !== undefined) settings.apiKey = data.apiKey;
    if (data.warehouseId !== undefined) settings.warehouseId = data.warehouseId;
    if (data.isSandbox !== undefined) settings.isSandbox = data.isSandbox;
    if (data.carriers !== undefined) settings.carriers = data.carriers;
    if (data.defaultCarrierId !== undefined) settings.defaultCarrierId = data.defaultCarrierId;
    if (data.shipFromAddress !== undefined) settings.shipFromAddress = data.shipFromAddress;

    await settings.save();
    return settings;
};

module.exports = mongoose.model('ShipEngineSettings', shipEngineSettingsSchema);
