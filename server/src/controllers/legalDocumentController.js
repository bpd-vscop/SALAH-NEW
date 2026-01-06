const LegalDocument = require('../models/LegalDocument');

// Get all legal documents
exports.list = async (req, res) => {
  try {
    const documents = await LegalDocument.find().sort({ type: 1 });
    res.json({ documents });
  } catch (error) {
    console.error('Error fetching legal documents:', error);
    res.status(500).json({ error: { message: 'Failed to fetch legal documents' } });
  }
};

// Get a single legal document by type
exports.getByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!['privacy-policy', 'terms-of-service', 'return-policy', 'shipping-policy'].includes(type)) {
      return res.status(400).json({ error: { message: 'Invalid document type' } });
    }

    const document = await LegalDocument.findOne({ type });

    if (!document) {
      return res.status(404).json({ error: { message: 'Document not found' } });
    }

    res.json({ document });
  } catch (error) {
    console.error('Error fetching legal document:', error);
    res.status(500).json({ error: { message: 'Failed to fetch legal document' } });
  }
};

// Update or create a legal document
exports.update = async (req, res) => {
  try {
    const { type } = req.params;
    const { title, content, lastUpdated } = req.body;

    if (!['privacy-policy', 'terms-of-service', 'return-policy', 'shipping-policy'].includes(type)) {
      return res.status(400).json({ error: { message: 'Invalid document type' } });
    }

    if (!title || !content) {
      return res.status(400).json({ error: { message: 'Title and content are required' } });
    }

    const updateData = {
      type,
      title: title.trim(),
      content,
      lastUpdated: lastUpdated ? new Date(lastUpdated) : new Date(),
    };

    const document = await LegalDocument.findOneAndUpdate(
      { type },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ document });
  } catch (error) {
    console.error('Error updating legal document:', error);
    res.status(500).json({ error: { message: 'Failed to update legal document' } });
  }
};
