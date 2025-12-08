// Create custom error with status code
export const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Async handler wrapper to avoid try-catch in every controller
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Placeholder for email sending (console log instead of actual email)
export const sendEmail = async ({ to, subject, text, html }) => {
  console.log('========== EMAIL PLACEHOLDER ==========');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Text: ${text}`);
  if (html) console.log(`HTML: ${html}`);
  console.log('=======================================');
  return true;
};

// Generate a random color for avatars
export const generateAvatarColor = () => {
  const colors = [
    '#f87171', '#fb923c', '#fbbf24', '#a3e635',
    '#34d399', '#22d3d8', '#60a5fa', '#a78bfa',
    '#f472b6', '#e879f9',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Sanitize user object for response
export const sanitizeUser = (user) => {
  const { password, refreshToken, __v, ...sanitized } = user.toObject ? user.toObject() : user;
  return sanitized;
};
