const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const fs = require('fs');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Mapping helpers
const HEADERS = [
    'SKU', 'Name', 'Alternate Id', 'Options', 'Categories', 'Parent Product SKU',
    'Price', 'Sale Price', 'Currency', 'Description', 'Track Inventory',
    'QTY', 'Backorder', 'Hidden', 'Image URL'
];

const parseCurrency = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/[$,]/g, '')) || 0;
};

const formatCurrency = (num) => {
    if (num === undefined || num === null) return '';
    return `$${num.toFixed(2)}`;
};

const getBool = (val) => {
    if (typeof val === 'boolean') return val;
    if (!val) return false;
    const s = String(val).toUpperCase();
    return s === 'TRUE' || s === 'YES' || s === '1';
};

const exportsCsvController = {
    // EXPORT
    async exportHash(req, res) {
        try {
            const products = await Product.find().populate('categoryIds');

            const rows = products.map(p => {
                // Map Categories to "Name;Name"
                const categoryNames = p.categoryIds
                    ? p.categoryIds.map(c => c.name).join(';')
                    : '';

                // Images
                const imageUrls = p.images ? p.images.join(';') : '';

                return [
                    p.sku || '',
                    p.name || '',
                    p.productCode || '',
                    '', // Options (not implemented)
                    categoryNames,
                    '', // Parent Product SKU (not implemented)
                    formatCurrency(p.price),
                    formatCurrency(p.salePrice),
                    'USD',
                    p.description || '',
                    p.manageStock ? 'TRUE' : 'FALSE',
                    p.inventory ? p.inventory.quantity : 0,
                    p.inventory && p.inventory.allowBackorder ? 'TRUE' : 'FALSE',
                    p.visibility === 'hidden' ? 'TRUE' : 'FALSE',
                    imageUrls
                ];
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');

            stringify([HEADERS, ...rows], { header: false }).pipe(res);

        } catch (error) {
            console.error('Export CSV Error:', error);
            res.status(500).json({ message: 'Failed to export CSV' });
        }
    },

    // IMPORT
    async importHash(req, res) {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results = [];
        const errors = [];
        let processedCount = 0;

        // Cache categories for lookup
        const allCategories = await Category.find();
        // Map Name -> ID (lowercase for loose matching)
        const categoryMap = new Map(
            allCategories.map(c => [c.name.toLowerCase(), c._id])
        );

        const parser = fs.createReadStream(req.file.path).pipe(parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
            bom: true
        }));

        for await (const row of parser) {
            processedCount++;
            try {
                const sku = row['SKU'];
                if (!sku) {
                    // Skip rows without SKU? Or generate one?
                    // For now simple skip
                    continue;
                }

                // Map Categories
                const catIds = [];
                if (row['Categories']) {
                    const names = row['Categories'].split(';').map(s => s.trim());
                    for (const name of names) {
                        const lower = name.toLowerCase();
                        if (categoryMap.has(lower)) {
                            catIds.push(categoryMap.get(lower));
                        }
                        // If not found, ignore? or create? Ignoring for safety.
                    }
                }

                // Map Inventory
                const manageStock = getBool(row['Track Inventory']);

                // Map Status
                const isHidden = getBool(row['Hidden']);
                const visibility = isHidden ? 'hidden' : 'catalog-and-search';
                const status = isHidden ? 'private' : 'published';

                // Map Images
                const images = row['Image URL'] ? row['Image URL'].split(';').map(s => s.trim()).filter(Boolean) : [];

                const payload = {
                    name: row['Name'],
                    sku: sku,
                    productCode: row['Alternate Id'],
                    price: parseCurrency(row['Price']),
                    salePrice: parseCurrency(row['Sale Price']),
                    description: row['Description'],
                    manageStock: manageStock,
                    inventory: {
                        quantity: parseInt(row['QTY'] || '0', 10),
                        allowBackorder: getBool(row['Backorder']),
                        status: parseInt(row['QTY'] || '0', 10) > 0 ? 'in_stock' : 'out_of_stock'
                    },
                    visibility: visibility,
                    status: status,
                    categoryIds: catIds,
                    categoryId: catIds[0] || null, // Primary category
                    images: images,
                    // Defaults for required fields that might be missing
                    slug: row['Name'] ? row['Name'].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : `product-${Date.now()}`,
                    productType: 'simple',
                    requiresB2B: false // Default
                };

                // UPSERT
                await Product.findOneAndUpdate(
                    { sku: sku },
                    payload,
                    { upsert: true, new: true, runValidators: false } // Skip strict validators for CSV import speed/lenience
                );

            } catch (err) {
                console.error(`Import Error Row ${processedCount}:`, err);
                // Also log the actual row causing trouble if possible
                // console.error('Row data:', row); 
                errors.push(`Row ${processedCount}: ${err.message}`);
            }
        }

        // Cleanup uploaded file
        fs.unlink(req.file.path, () => { });

        res.json({
            message: 'Import completed',
            processed: processedCount,
            errors: errors.length > 0 ? errors : undefined
        });
    }
};

module.exports = exportsCsvController;
