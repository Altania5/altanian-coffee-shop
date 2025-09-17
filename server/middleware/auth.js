const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No authentication token, authorization denied.' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    if (!verified) {
      return res.status(401).json({ msg: 'Token verification failed, authorization denied.' });
    }

    req.user = {
      id: verified.id,
      role: verified.role,
      firstName: verified.firstName
    };
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token verification failed, authorization denied.' });
  }
};

module.exports = auth;