import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['student', 'admin', 'teacher', 'guard'])
      .withMessage('Invalid role'),
    body('department')
      .optional()
      .custom((value) => {
        // Allow empty string or undefined
        if (!value || value.trim() === '') {
          return true;
        }
        // Validate against enum if provided
        const validDepartments = ['CS', 'IT', 'CSIT', 'DS', 'CY', 'Mechanical', 'Civil', 'Sports'];
        return validDepartments.includes(value);
      })
      .withMessage('Invalid department'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password, role, studentId, department, phone } =
        req.body;

      // Check if user already exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Check if studentId already exists (if provided and not empty)
      const trimmedStudentId = studentId?.trim();
      if (trimmedStudentId) {
        const studentIdExists = await User.findOne({ studentId: trimmedStudentId });
        if (studentIdExists) {
          return res
            .status(400)
            .json({ message: 'Student ID already exists' });
        }
      }

      // Department is required for teachers
      if (role === 'teacher' && !department) {
        return res.status(400).json({ message: 'Department is required for teachers' });
      }

      // Create user - set studentId and department to undefined if empty
      const userData = {
        name,
        email,
        password,
        role: role || 'student',
        phone,
      };

      // Only include studentId if it's not empty
      if (trimmedStudentId) {
        userData.studentId = trimmedStudentId;
      }

      // Only include department if it's not empty
      const trimmedDepartment = department?.trim();
      if (trimmedDepartment) {
        userData.department = trimmedDepartment;
      }

      const user = await User.create(userData);

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        token: generateToken(user._id),
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        token: generateToken(user._id),
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

