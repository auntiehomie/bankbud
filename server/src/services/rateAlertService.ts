import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface RateAlertEmailData {
  email: string;
  accountType: string;
  targetRate: number;
  matchingRates: Array<{
    bankName: string;
    rate: number;
    accountType: string;
    url?: string;
    distanceKm?: number;
  }>;
}

export async function sendRateAlertEmail(data: RateAlertEmailData): Promise<void> {
  const { email, accountType, targetRate, matchingRates } = data;

  const accountTypeLabels: Record<string, string> = {
    'savings': 'Savings',
    'high-yield-savings': 'High-Yield Savings',
    'cd': 'Certificate of Deposit (CD)',
    'checking': 'Checking',
    'money-market': 'Money Market'
  };

  const accountLabel = accountTypeLabels[accountType] || accountType;

  // Build rate cards HTML
  const rateCardsHtml = matchingRates.map(rate => `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; margin-bottom: 16px; color: white;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">${rate.bankName}</h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">${accountLabel}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 32px; font-weight: 700; line-height: 1;">${rate.rate.toFixed(2)}%</div>
          <div style="font-size: 12px; opacity: 0.9;">APY</div>
        </div>
      </div>
      ${rate.distanceKm ? `
        <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 6px 12px; border-radius: 20px; font-size: 13px; margin-bottom: 12px;">
          📍 ${rate.distanceKm < 1 ? `${(rate.distanceKm * 1000).toFixed(0)}m` : `${rate.distanceKm.toFixed(1)}km`} away
        </div>
      ` : ''}
      ${rate.url ? `
        <a href="${rate.url}" style="display: inline-block; background: white; color: #667eea; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px;">
          View Details →
        </a>
      ` : ''}
    </div>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">🎯 Rate Alert</h1>
          <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">We found rates matching your target!</p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 20px;">
          <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="margin: 0; color: #2d3748; font-size: 15px;">
              <strong>Your Alert:</strong> ${accountLabel} accounts with <strong>${targetRate.toFixed(2)}%</strong> APY or higher
            </p>
          </div>

          <h2 style="margin: 0 0 16px 0; color: #2d3748; font-size: 20px; font-weight: 700;">
            ${matchingRates.length} Matching Rate${matchingRates.length !== 1 ? 's' : ''}
          </h2>

          ${rateCardsHtml}

          <div style="margin-top: 32px; text-align: center;">
            <a href="${process.env.APP_URL}/compare" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              View All Rates
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 24px 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px;">
            You're receiving this because you set up a rate alert on BankBud
          </p>
          <p style="margin: 0; color: #718096; font-size: 13px;">
            <a href="${process.env.APP_URL}/rate-alerts" style="color: #667eea; text-decoration: none;">Manage your alerts</a> | 
            <a href="${process.env.APP_URL}" style="color: #667eea; text-decoration: none;">Visit BankBud</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"BankBud Rate Alerts" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `🎯 Rate Alert: ${matchingRates.length} bank${matchingRates.length !== 1 ? 's' : ''} match your ${targetRate.toFixed(2)}% target`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Rate alert email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending rate alert email:', error);
    throw error;
  }
}
