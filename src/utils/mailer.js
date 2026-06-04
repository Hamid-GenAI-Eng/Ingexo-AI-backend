import nodemailer from 'nodemailer';

/**
 * Configure SMTP Transporter based on env variables
 * Fallback to standard console logger + ethereal trial test accounts
 */
const getTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: port === '465',
      auth: { user, pass }
    });
  }

  // Fallback / Development: Attempt to initialize Ethereal mail account
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (err) {
    // Ultimate fallback if offline/no connection
    return null;
  }
};

/**
 * Send an email
 * @param {Object} options { email, subject, message }
 */
export const sendEmail = async (options) => {
  const transporter = await getTransporter();

  const mailOptions = {
    from: process.env.FROM_EMAIL || '"Ingexo AI" <no-reply@ingexo.ai>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${options.message}</p>`
  };

  if (transporter) {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Email sent to ${options.email}. ID: ${info.messageId}`);
    // If it's Ethereal, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Mailer] Ethereal Preview URL: ${previewUrl}`);
    }
    return info;
  } else {
    console.log('\n==================================================');
    console.log(`[Mailer Mock] From: ${mailOptions.from}`);
    console.log(`[Mailer Mock] To: ${mailOptions.to}`);
    console.log(`[Mailer Mock] Subject: ${mailOptions.subject}`);
    console.log(`[Mailer Mock] Body:\n${mailOptions.text}`);
    console.log('==================================================\n');
    return { mock: true, messageId: 'mock-id' };
  }
};
