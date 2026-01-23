const fs = require('fs');
const Product = require('../src/models/Product');
const mongoose = require('mongoose');
const path = require('path');
const { importHash } = require('../src/controllers/productCsvController');

// Mock Request/Response
const req = {
    file: {
        path: path.join(__dirname, '../product_sample.csv')
    }
};

const res = {
    status: (code) => ({
        json: (data) => console.log(`Status ${code}:`, data)
    }),
    json: (data) => console.log('Response:', JSON.stringify(data, null, 2)),
    setHeader: () => { }
};

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/salah_bn_new');
        console.log('Connected to DB');

        // Create a dummy CSV file based on user sample
        const csvContent = `SKU,Name,Alternate Id,Options,Categories,Parent Product SKU,Price,Sale Price,Currency,Description,Track Inventory,QTY,Backorder,Hidden,Image URL
TEST-SKU-001,Test Product,TP-001,"","Test Category",,100.00,80.00,USD,"Test Description",TRUE,10,FALSE,FALSE,http://example.com/image.jpg
`;
        fs.writeFileSync(req.file.path, csvContent);

        console.log('Running import...');
        await importHash(req, res);

    } catch (e) {
        console.error('Test Error:', e);
    } finally {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        await mongoose.disconnect();
    }
}

run();
