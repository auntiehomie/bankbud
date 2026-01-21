import nodemailer from 'nodemailer';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bankbud2026@gmail.com';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');

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
    secure: false, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

transporter = initTransporter();

export interface RateSubmissionData {
  bankName: string;
  accountType: string;
  rate: number;
  apy?: number;
  minDeposit?: number;
  term?: number;
  features?: string[];
  source?: string;
  notes?: string;
  submittedAt: Date;
}

export interface RateReportData {
  bankName: string;
  accountType: string;
  rate: number;
  reason: string;
  reportedAt: Date;
  rateId: string;
}

export async function sendRateSubmissionEmail(data: RateSubmissionData): Promise<void> {
  if (!transporter) {
    console.log('Email service not configured - skipping submission notification');
    return;
  }

  try {
    const mailOptions = {
      from: `"BankBud Notifications" <${SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `🆕 New Rate Submission: ${data.bankName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">New Rate Submission</h2>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.bankName}</h3>
            <p><strong>Account Type:</strong> ${data.accountType}</p>
            <p><strong>Rate:</strong> ${data.rate}%</p>
            ${data.apy ? `<p><strong>APY:</strong> ${data.apy}%</p>` : ''}
            ${data.minDeposit !== undefined ? `<p><strong>Min. Deposit:</strong> $${data.minDeposit.toLocaleString()}</p>` : ''}
            ${data.term ? `<p><strong>Term:</strong> ${data.term} months</p>` : ''}
          </div>
          
          ${data.features && data.features.length > 0 ? `
            <div style="margin: 20px 0;">
              <h4>Features:</h4>
              <ul>
                ${data.features.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${data.source ? `<p><strong>Source:</strong> ${data.source}</p>` : ''}
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Submitted: ${data.submittedAt.toLocaleString()}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated notification from BankBud. Review this submission in your admin panel.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Sent rate submission email for ${data.bankName}`);
  } catch (error) {
    console.error('Error sending rate submission email:', error);
  }
}

export async function sendRateReportEmail(data: RateReportData): Promise<void> {
  if (!transporter) {
    console.log('Email service not configured - skipping report notification');
    return;
  }

  try {
    const mailOptions = {
      from: `"BankBud Notifications" <${SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `⚠️ Rate Report: ${data.bankName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Rate Reported</h2>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin-top: 0;">${data.bankName}</h3>
            <p><strong>Account Type:</strong> ${data.accountType}</p>
            <p><strong>Current Rate:</strong> ${data.rate}%</p>
            <p><strong>Rate ID:</strong> ${data.rateId}</p>
          </div>
          
          <div style="background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #f59e0b;">Report Reason:</h4>
            <p>${data.reason}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Reported: ${data.reportedAt.toLocaleString()}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated notification from BankBud. Review and take action on this report.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Sent rate report email for ${data.bankName}`);
  } catch (error) {
    console.error('Error sending rate report email:', error);
  }
}
