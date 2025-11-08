import express from 'express';
import { body, validationResult } from 'express-validator';
import Complaint from '../models/Complaint.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// @route   POST /api/complaints
// @desc    Create a new complaint
// @access  Private (Student, Staff, Admin)
router.post(
  '/',
  protect,
  upload.array('images', 5),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category')
      .isIn(['maintenance', 'safety', 'electrical', 'plumbing', 'cleaning', 'other'])
      .withMessage('Invalid category'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, category, location, priority } = req.body;

      // Get image paths
      const images = req.files
        ? req.files.map((file) => `/uploads/${file.filename}`)
        : [];

      const complaint = await Complaint.create({
        title,
        description,
        category,
        location,
        priority: priority || 'medium',
        reportedBy: req.user._id,
        images,
      });

      const populatedComplaint = await Complaint.findById(complaint._id)
        .populate('reportedBy', 'name email role')
        .populate('assignedTo', 'name email role');

      res.status(201).json(populatedComplaint);
    } catch (error) {
      console.error('Create complaint error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   GET /api/complaints
// @desc    Get all complaints (with filters)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      assignedTo,
      reportedBy,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Role-based filtering
    if (req.user.role === 'student') {
      query.reportedBy = req.user._id;
    } else if (req.user.role === 'staff') {
      query.$or = [
        { assignedTo: req.user._id },
        { assignedTo: null },
        { status: 'pending' },
      ];
    }
    // Admin can see all

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (reportedBy) query.reportedBy = reportedBy;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const complaints = await Complaint.find(query)
      .populate('reportedBy', 'name email role studentId')
      .populate('assignedTo', 'name email role department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(query);

    res.json({
      complaints,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/complaints/:id
// @desc    Get single complaint
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('reportedBy', 'name email role studentId')
      .populate('assignedTo', 'name email role department');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check access
    if (
      req.user.role === 'student' &&
      complaint.reportedBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(complaint);
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/complaints/:id
// @desc    Update complaint
// @access  Private
router.put(
  '/:id',
  protect,
  upload.array('images', 5),
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('category')
      .optional()
      .isIn(['maintenance', 'safety', 'electrical', 'plumbing', 'cleaning', 'other']),
    body('status')
      .optional()
      .isIn(['pending', 'assigned', 'in-progress', 'resolved', 'closed']),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' });
      }

      // Check access
      if (req.user.role === 'student') {
        if (complaint.reportedBy.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Access denied' });
        }
        // Students can only update title, description, location
        const allowedFields = ['title', 'description', 'location'];
        Object.keys(req.body).forEach((key) => {
          if (!allowedFields.includes(key)) {
            delete req.body[key];
          }
        });
      }

      // Handle new images
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file) => `/uploads/${file.filename}`);
        req.body.images = [...(complaint.images || []), ...newImages];
      }

      // Handle status change to resolved
      if (req.body.status === 'resolved' && complaint.status !== 'resolved') {
        req.body.resolvedAt = new Date();
      }

      const updatedComplaint = await Complaint.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      )
        .populate('reportedBy', 'name email role studentId')
        .populate('assignedTo', 'name email role department');

      res.json(updatedComplaint);
    } catch (error) {
      console.error('Update complaint error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   DELETE /api/complaints/:id
// @desc    Delete complaint
// @access  Private (Admin or Reporter)
router.delete('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check access
    if (
      req.user.role !== 'admin' &&
      complaint.reportedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Complaint.findByIdAndDelete(req.params.id);

    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/complaints/:id/assign
// @desc    Assign complaint to staff
// @access  Private (Admin, Staff)
router.put(
  '/:id/assign',
  protect,
  authorize('admin', 'staff'),
  [body('assignedTo').notEmpty().withMessage('Staff ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' });
      }

      complaint.assignedTo = req.body.assignedTo;
      complaint.status = 'assigned';

      await complaint.save();

      const populatedComplaint = await Complaint.findById(complaint._id)
        .populate('reportedBy', 'name email role studentId')
        .populate('assignedTo', 'name email role department');

      res.json(populatedComplaint);
    } catch (error) {
      console.error('Assign complaint error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   PUT /api/complaints/:id/resolve
// @desc    Resolve complaint
// @access  Private (Admin, Staff)
router.put(
  '/:id/resolve',
  protect,
  authorize('admin', 'staff'),
  [body('resolutionNotes').optional().trim()],
  async (req, res) => {
    try {
      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' });
      }

      complaint.status = 'resolved';
      complaint.resolutionNotes = req.body.resolutionNotes || '';
      complaint.resolvedAt = new Date();

      await complaint.save();

      const populatedComplaint = await Complaint.findById(complaint._id)
        .populate('reportedBy', 'name email role studentId')
        .populate('assignedTo', 'name email role department');

      res.json(populatedComplaint);
    } catch (error) {
      console.error('Resolve complaint error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   GET /api/complaints/stats/overview
// @desc    Get complaint statistics
// @access  Private (Admin)
router.get('/stats/overview', protect, authorize('admin'), async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'pending' });
    const inProgress = await Complaint.countDocuments({ status: 'in-progress' });
    const resolved = await Complaint.countDocuments({ status: 'resolved' });
    const closed = await Complaint.countDocuments({ status: 'closed' });

    const byCategory = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);

    const byPriority = await Complaint.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    const recentComplaints = await Complaint.find()
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      total,
      statusCounts: {
        pending,
        inProgress,
        resolved,
        closed,
      },
      byCategory,
      byPriority,
      recentComplaints,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

