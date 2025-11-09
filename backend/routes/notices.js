import express from 'express';
import { body, validationResult } from 'express-validator';
import Notice from '../models/Notice.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/notices
// @desc    Create a new notice (Teachers only)
// @access  Private (Teacher, Admin)
router.post(
  '/',
  protect,
  authorize('teacher', 'admin'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content, department } = req.body;

      // Teachers can post notices for any department (visible to all)
      // No department restriction for teachers

      const notice = await Notice.create({
        title,
        content,
        department,
        postedBy: req.user._id,
      });

      const populatedNotice = await Notice.findById(notice._id).populate(
        'postedBy',
        'name email role'
      );

      res.status(201).json(populatedNotice);
    } catch (error) {
      console.error('Create notice error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   GET /api/notices
// @desc    Get all notices (filtered by department for students)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { department, page = 1, limit = 10 } = req.query;

    const query = { isActive: true };

    // Notices are visible to all students and teachers (no department filtering)
    // Admin can filter by department if needed
    if (department && (req.user.role === 'admin' || req.user.role === 'teacher')) {
      query.department = department;
    }
    // For students, teachers, guards - show all notices

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notices = await Notice.find(query)
      .populate('postedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notice.countDocuments(query);

    res.json({
      notices,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/notices/:id
// @desc    Get single notice
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id).populate(
      'postedBy',
      'name email role'
    );

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // All users can view notices (no department restriction)

    res.json(notice);
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/notices/:id
// @desc    Update notice
// @access  Private (Teacher, Admin)
router.put(
  '/:id',
  protect,
  authorize('teacher', 'admin'),
  [
    body('title').optional().trim().notEmpty(),
    body('content').optional().trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const notice = await Notice.findById(req.params.id);

      if (!notice) {
        return res.status(404).json({ message: 'Notice not found' });
      }

      // Teachers can only update their own notices
      if (
        req.user.role === 'teacher' &&
        notice.postedBy.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updatedNotice = await Notice.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('postedBy', 'name email role');

      res.json(updatedNotice);
    } catch (error) {
      console.error('Update notice error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   DELETE /api/notices/:id
// @desc    Delete notice (soft delete by setting isActive to false)
// @access  Private (Teacher, Admin)
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Teachers can only delete their own notices
    if (
      req.user.role === 'teacher' &&
      notice.postedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    notice.isActive = false;
    await notice.save();

    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

