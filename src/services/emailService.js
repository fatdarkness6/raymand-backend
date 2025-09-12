import nodemailer from 'nodemailer';

export const sendContactEmail = async (form) => {
  const emailUser = process.env.EMAIL_USERNAME || 'your@gmail.com';
  const emailPass = process.env.EMAIL_PASSWORD || 'your-app-password';

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: emailUser, pass: emailPass },
  });

  // Email to site admin
  const mailToOwner = {
    from: emailUser,
    to: emailUser,
    subject: '📬 New Contact Form Submission!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1976D2;">📥 New Contact Request</h2>
        <p>You have received a new message from your website contact form.</p>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">👤 Name:</td>
            <td style="padding: 8px;">${form.name}</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold;">📧 Email:</td>
            <td style="padding: 8px;">${form.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">📱 Phone:</td>
            <td style="padding: 8px;">${form.phone}</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold;">🕒 Submitted At:</td>
            <td style="padding: 8px;">${new Date().toLocaleString()}</td>
          </tr>
        </table>

        <p style="margin-top: 20px;">🚀 Please follow up as soon as possible.</p>
        <p style="color: #888;">Website Bot • Do not reply</p>
      </div>
    `,
  };

  // Confirmation email to customer
  const mailToUser = {
    from: emailUser,
    to: form.email,
    subject: '✅ We Received Your Message!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #4CAF50;">🙌 Thank You, ${form.name}!</h2>
        <p>We’ve received your message and will get back to you soon.</p>

        <h4 style="margin-top: 30px;">📋 Here's what you sent:</h4>
        <ul style="line-height: 1.8;">
          <li><strong>Name:</strong> ${form.name}</li>
          <li><strong>Email:</strong> ${form.email}</li>
          <li><strong>Phone:</strong> ${form.phone}</li>
        </ul>

        <p style="margin-top: 30px;">In the meantime, feel free to explore our website or reply to this email if you have urgent questions.</p>

        <p style="margin-top: 20px;">Warm regards,<br/><strong>Your Company Team 💙</strong></p>
      </div>
    `,
  };

  await transporter.sendMail(mailToOwner);
  await transporter.sendMail(mailToUser);
};
