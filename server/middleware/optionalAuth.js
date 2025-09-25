const jwt = require('jsonwebtoken');

const optionalAuth = (req, res, next) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) return next();

    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    if (verified) {
      req.user = {
        id: verified.id,
        role: verified.role,
        firstName: verified.firstName
      };
    }
  } catch (err) {
    // Ignore token errors for optional auth
  }
  next();
};

module.exports = optionalAuth;


