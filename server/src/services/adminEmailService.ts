import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const APP_URL = process.env.APP_URL || 'https://bankbud.vercel.app';

let transporter: nodemailer.Transporter | null = null;

// Initialize email transporter
function initTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('⚠️  Email service not configured. Set SMTP_USER and SMTP_PASS in .env');
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

transporter = initTransporter();

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  if (!transporter) {
    throw new Error('Email service not configured');
  }

  const resetLink = `${APP_URL}/admin/reset-password?token=${resetToken}`;

  try {
    const mailOptions = {
      from: `"BankBud Admin" <${SMTP_USER}>`,
      to: email,
      subject: '🔐 Admin Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Password Reset Request</h2>
          
          <p>You requested to reset your admin password for BankBud.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Or copy and paste this link in your browser:<br>
            <a href="${resetLink}" style="color: #6366f1; word-break: break-all;">${resetLink}</a>
          </p>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #78350f;"><strong>⚠️ Important:</strong></p>
            <p style="margin: 5px 0 0 0; color: #78350f;">
              This link will expire in <strong>1 hour</strong>. If you didn't request this reset, please ignore this email.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              This is an automated email from BankBud Admin System. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Sent password reset email to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
