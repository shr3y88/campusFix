import express from 'express';
import { body, validationResult } from 'express-validator';
import Complaint from '../models/Complaint.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// @route   POST /api/complaints
// @desc    Create a new complaint
// @access  Private (Student, Admin) - Teachers cannot create complaints
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
      // Teachers cannot create complaints
      if (req.user.role === 'teacher') {
        return res.status(403).json({ message: 'Teachers cannot file complaints' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, category, location, priority, department } = req.body;

      // Department is required for students when creating complaints
      if (req.user.role === 'student' && !department) {
        return res.status(400).json({ message: 'Department is required when creating a complaint' });
      }

      // Get image paths
      const images = req.files
        ? req.files.map((file) => `/uploads/${file.filename}`)
        : [];

      const complaint = await Complaint.create({
        title,
        description,
        category,
        location,
        department: department || req.user.department,
        priority: priority || 'medium',
        reportedBy: req.user._id,
        images,
      });

      const populatedComplaint = await Complaint.findById(complaint._id)
        .populate('reportedBy', 'name email role department')
        .populate('assignedTo', 'name email role department');

      // Send notification to teachers in the department
      if (populatedComplaint.department) {
        try {
          const { sendComplaintNotification } = await import('../utils/notifications.js');
          sendComplaintNotification(populatedComplaint).catch((err) => {
            console.error('Failed to send notification:', err);
          });
        } catch (importError) {
          console.error('Failed to import notification utility:', importError);
        }
      }

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
    } else if (req.user.role === 'teacher') {
      // Teachers can only see complaints from their department
      if (req.user.department) {
        query.department = req.user.department;
      } else {
        // If teacher has no department, return empty results
        query.department = null;
      }
    }
    // Admin can see all

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (reportedBy) query.reportedBy = reportedBy;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const complaints = await Complaint.find(query)
      .populate('reportedBy', 'name email role studentId department')
      .populate('assignedTo', 'name email role department')
      .populate('replies.repliedBy', 'name email role')
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
      .populate('reportedBy', 'name email role studentId department')
      .populate('assignedTo', 'name email role department')
      .populate('replies.repliedBy', 'name email role');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check access
    if (req.user.role === 'student') {
      if (complaint.reportedBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'teacher') {
      // Teachers can only access complaints from their department
      if (!req.user.department || complaint.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied' });
      }
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
      } else if (req.user.role === 'teacher') {
        // Teachers can only update complaints from their department
        if (!req.user.department || complaint.department !== req.user.department) {
          return res.status(403).json({ message: 'Access denied' });
        }
        // Teachers cannot update certain fields
        const restrictedFields = ['reportedBy', 'assignedTo'];
        Object.keys(req.body).forEach((key) => {
          if (restrictedFields.includes(key)) {
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
        .populate('reportedBy', 'name email role studentId department')
        .populate('assignedTo', 'name email role department')
        .populate('replies.repliedBy', 'name email role');

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
// @desc    Assign complaint to teacher
// @access  Private (Admin, Teacher)
router.put(
  '/:id/assign',
  protect,
  authorize('admin', 'teacher'),
  [body('assignedTo').notEmpty().withMessage('Teacher ID is required')],
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
        .populate('reportedBy', 'name email role studentId department')
        .populate('assignedTo', 'name email role department')
        .populate('replies.repliedBy', 'name email role');

      res.json(populatedComplaint);
    } catch (error) {
      console.error('Assign complaint error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   PUT /api/complaints/:id/resolve
// @desc    Resolve complaint
// @access  Private (Admin, Teacher)
router.put(
  '/:id/resolve',
  protect,
  authorize('admin', 'teacher'),
  [body('resolutionNotes').optional().trim()],
  async (req, res) => {
    try {
      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' });
      }

      // Check access for teachers
      if (req.user.role === 'teacher') {
        if (!req.user.department || complaint.department !== req.user.department) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }

      complaint.status = 'resolved';
      complaint.resolutionNotes = req.body.resolutionNotes || '';
      complaint.resolvedAt = new Date();

      await complaint.save();

      const populatedComplaint = await Complaint.findById(complaint._id)
        .populate('reportedBy', 'name email role studentId department')
        .populate('assignedTo', 'name email role department')
        .populate('replies.repliedBy', 'name email role');

      res.json(populatedComplaint);
    } catch (error) {
      console.error('Resolve complaint error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   POST /api/complaints/:id/reply
// @desc    Add a reply to a complaint (Teachers can reply)
// @access  Private (Teacher, Admin)
router.post(
  '/:id/reply',
  protect,
  authorize('teacher', 'admin'),
  [body('message').trim().notEmpty().withMessage('Message is required')],
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

      // Check access for teachers
      if (req.user.role === 'teacher') {
        if (!req.user.department || complaint.department !== req.user.department) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }

      complaint.replies.push({
        repliedBy: req.user._id,
        message: req.body.message,
      });

      await complaint.save();

      const populatedComplaint = await Complaint.findById(complaint._id)
        .populate('reportedBy', 'name email role studentId department')
        .populate('assignedTo', 'name email role department')
        .populate('replies.repliedBy', 'name email role');

      res.json(populatedComplaint);
    } catch (error) {
      console.error('Reply to complaint error:', error);
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

