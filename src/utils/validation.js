export const validateContactForm = ({ name, email, phone }) => {
  if (!name || !email || !phone) return 'All fields are required';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email format';

  const phoneRegex = /^\d{10,15}$/;
  if (!phoneRegex.test(phone)) return 'Invalid phone number format';

  return null;
};
