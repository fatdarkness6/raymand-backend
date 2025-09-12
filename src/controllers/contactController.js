import { validateContactForm } from '../utils/validation.js';
import { sendContactEmail } from '../services/emailService.js';

export const handleContactForm = async (req, res) => {
  const error = validateContactForm(req.body);
  if (error) return res.status(400).json({ error });

  try {
    await sendContactEmail(req.body);
    res.json({ message: 'Message received! Email sent ✅' });
  } catch (err) {
    console.error('❌ Email send failed:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
};
