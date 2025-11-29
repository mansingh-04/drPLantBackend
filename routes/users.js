const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/middleware');
const userController = require('../controllers/userController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Get current user's profile
router.get('/profile', authenticateToken, userController.getProfile);

// Update user profile (name and/or email)
router.put('/profile', authenticateToken, express.json(), userController.updateProfile);

// Upload profile image
router.post('/profile/image', authenticateToken, upload.single('image'), userController.uploadProfileImage);

// Delete profile image
router.delete('/profile/image', authenticateToken, userController.deleteProfileImage);

// Get profile image by user ID
router.get('/profile-image/:userId', userController.getProfileImage);

module.exports = router;
