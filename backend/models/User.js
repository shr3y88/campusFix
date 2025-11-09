import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['student', 'admin', 'teacher', 'guard'],
      default: 'student',
    },
    studentId: {
      type: String,
      sparse: true,
      unique: true,
      default: undefined,
    },
    department: {
      type: String,
      enum: {
        values: ['CS', 'IT', 'CSIT', 'DS', 'CY', 'Mechanical', 'Civil', 'Sports'],
        message: 'Invalid department',
      },
      trim: true,
      default: undefined,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Convert empty studentId to undefined for sparse unique index
userSchema.pre('save', function (next) {
  if (this.studentId === '' || this.studentId === null) {
    this.studentId = undefined;
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;

