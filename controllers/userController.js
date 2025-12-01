const prisma = require('../prismaClient');

// Get current user's profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        profileImage: false // Don't send raw bytes in profile data
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has a profile image
    const userImageCount = await prisma.user.count({
      where: { id: userId, profileImage: { not: null } }
    });

    res.json({
      ...user,
      hasProfileImage: userImageCount > 0,
      profileImageUrl: userImageCount > 0 ? `/users/profile-image/${userId}` : null
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update user profile (name and/or email)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      updateData.email = email;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        profileImage: imageFile.buffer
      }
    });

    res.json({ 
      message: 'Profile image uploaded successfully',
      profileImageUrl: `/users/profile-image/${userId}`
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
};

// Get profile image
exports.getProfileImage = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileImage: true }
    });

    if (!user || !user.profileImage) {
      return res.status(404).json({ error: 'Profile image not found' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.send(Buffer.from(user.profileImage));
  } catch (error) {
    console.error('Error serving profile image:', error);
    res.status(500).json({ error: 'Failed to serve profile image' });
  }
};

// Delete profile image
exports.deleteProfileImage = async (req, res) => {
  try {
    const userId = req.user.userId;

    await prisma.user.update({
      where: { id: userId },
      data: {
        profileImage: null
      }
    });

    res.json({ 
      message: 'Profile image removed successfully'
    });
  } catch (error) {
    console.error('Error removing profile image:', error);
    res.status(500).json({ error: 'Failed to remove profile image' });
  }
};
