const ReviewerName = require('../models/ReviewerName');
const { badRequest, notFound } = require('../utils/appError');

const listReviewerNames = async (_req, res, next) => {
  try {
    const names = await ReviewerName.find({ isActive: true }).sort({ order: 1, name: 1 });
    res.json({ names: names.map((item) => item.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const createReviewerName = async (req, res, next) => {
  try {
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!rawName) {
      throw badRequest('Reviewer name is required');
    }

    const escaped = rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await ReviewerName.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    if (existing) {
      return res.json({ name: existing.toJSON() });
    }

    const created = await ReviewerName.create({ name: rawName });
    res.status(201).json({ name: created.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteReviewerName = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await ReviewerName.findById(id);
    if (!existing) {
      throw notFound('Reviewer name not found');
    }
    await ReviewerName.deleteOne({ _id: id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listReviewerNames,
  createReviewerName,
  deleteReviewerName,
};
