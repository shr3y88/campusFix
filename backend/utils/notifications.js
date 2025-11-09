

import User from '../models/User.js';
import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
  // Log environment variables for debugging
  console.log("📧 Email ENV Check:", {
    service: process.env.EMAIL_SERVICE,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? "✅ present" : "❌ missing",
  });

  // Validate configuration
  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail", // fallback to gmail
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // For development, return null if no credentials
  return null;
};

// Send email notification to teachers in the department
export const sendComplaintNotification = async (complaint) => {
  try {
    if (!complaint.department) return;

    // Find all teachers in the department
    const teachers = await User.find({
      role: 'teacher',
      department: complaint.department,
    });

    if (teachers.length === 0) {
      console.log(`No teachers found for department: ${complaint.department}`);
      return;
    }

    const transporter = createTransporter();

    if (!transporter) {
      console.log('=== EMAIL NOTIFICATION (Development Mode - No Email Config) ===');
      console.log('⚠️ Email service is not configured. To send real emails, set EMAIL_SERVICE, EMAIL_USER, and EMAIL_PASS in your .env file.');
      console.log(`📧 Would send email to: ${teachers.map((t) => t.email).join(', ')}`);
      console.log(`📌 Subject: New Complaint in ${complaint.department} Department`);
      console.log(`📝 Complaint: "${complaint.title}"`);
      console.log('==============================================================');
      return;
    }

    // Send email to each teacher
    const emailPromises = teachers.map((teacher) => {
      const mailOptions = {
        from: `"CampusFix Notifications" <${process.env.EMAIL_USER}>`,
        to: teacher.email,
        subject: `New Complaint in ${complaint.department} Department`,
        html: `
          <h2>New Complaint Submitted</h2>
          <p>A new complaint has been submitted in your department.</p>
          <h3>Complaint Details:</h3>
          <ul>
            <li><strong>Title:</strong> ${complaint.title}</li>
            <li><strong>Category:</strong> ${complaint.category}</li>
            <li><strong>Location:</strong> ${complaint.location}</li>
            <li><strong>Priority:</strong> ${complaint.priority}</li>
            <li><strong>Reported By:</strong> ${complaint.reportedBy?.name || 'Unknown'}</li>
          </ul>
          <p><strong>Description:</strong></p>
          <p>${complaint.description}</p>
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/complaints/${complaint._id}">
              View Complaint
            </a>
          </p>
        `,
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);
    console.log(`✅ Notification emails sent to ${teachers.length} teacher(s).`);
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
};

// Optional: Send SMS notification (requires Twilio or similar service)
export const sendSMSNotification = async (phoneNumber, message) => {
  console.log(`SMS notification (not implemented): ${phoneNumber} - ${message}`);
};

// Optional: Send WhatsApp notification (requires WhatsApp Business API or Twilio)
export const sendWhatsAppNotification = async (phoneNumber, message) => {
  console.log(`WhatsApp notification (not implemented): ${phoneNumber} - ${message}`);
};
