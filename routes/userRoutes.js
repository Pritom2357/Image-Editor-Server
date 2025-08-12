const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/register', UserController.register);
router.post('/login', UserController.login);
 
router.post('/logout', authenticateToken, UserController.logout);
router.get('/profile/:userId', authenticateToken, UserController.getProfile);
router.put('/profile/:userId', authenticateToken, UserController.updateProfile);
router.get('/credits/:userId', authenticateToken, UserController.checkCredits);
router.post('/credits/:userId/use', authenticateToken, UserController.useCredits);
router.get('/uuid/:uuid', authenticateToken, UserController.getUserByUuid);
router.get('/usage/:uuid', UserController.getUsage);
router.post('/verify-token', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: {
      id: req.user.id,
      uuid: req.user.uuid,
      username: req.user.username,
      email: req.user.email
    }
  });
});

module.exports = router;