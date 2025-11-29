const prisma = require('../prismaClient');

exports.getImage = async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);
    
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const image = await prisma.plantImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Assuming images are JPEGs for now, or we could store mime type in DB
    // But for this capstone, just setting a generic image type or detecting it would be good.
    // Since we just store Bytes, we'll default to image/jpeg or image/png.
    // Browsers are usually smart enough to detect.
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(Buffer.from(image.imageData));
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
};
