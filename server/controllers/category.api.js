const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ name: 1 });
        res.json({ success: true, data: categories });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Category name is required.' });
        const existing = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
        if (existing) return res.status(400).json({ success: false, message: 'Category already exists.' });
        const category = new Category({ name, description });
        await category.save();
        res.status(201).json({ success: true, message: 'Category created.', data: category });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
        res.json({ success: true, message: 'Category updated.', data: category });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        await Category.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Category deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
