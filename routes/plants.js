const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authenticateToken } = require('../middleware/middleware');
const { identifyPlant } = require('../services/aiService');
const { getPlantCareTips } = require('../services/geminiService');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const imageController = require('../controllers/imageController');

router.get('/images/:id', imageController.getImage);

router.put('/logs/:logId', authenticateToken, express.json(), async (req, res) => {
  const logId = parseInt(req.params.logId);
  const { logType, logValue, logDate, note } = req.body;

  try {
    const logEntry = await prisma.plantLog.findUnique({
      where: { id: logId },
      include: { plant: true }
    });

    if (!logEntry) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

    if (logEntry.plant.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to update this log' });
    }
    const updatedLog = await prisma.plantLog.update({
      where: { id: logId },
      data: {
        logType: logType || logEntry.logType,
        logValue: logValue !== undefined ? logValue : logEntry.logValue,
        logDate: logDate ? new Date(logDate) : logEntry.logDate,
        note: note !== undefined ? note : logEntry.note
      }
    });

    res.json(updatedLog);
  } catch (error) {
    console.error('Error updating log entry:', error);
    res.status(500).json({ error: 'Failed to update log entry' });
  }
});

router.delete('/logs/:logId', authenticateToken, async (req, res) => {
  const logId = parseInt(req.params.logId);

  try {
    const logEntry = await prisma.plantLog.findUnique({
      where: { id: logId },
      include: { plant: true }
    });

    if (!logEntry) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

    if (logEntry.plant.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this log' });
    }

    await prisma.plantLog.delete({
      where: { id: logId }
    });

    res.json({ message: 'Log deleted successfully' });
  } catch (error) {
    console.error('Error deleting log entry:', error);
    res.status(500).json({ error: 'Failed to delete log entry' });
  }
});

router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  const { name, species } = req.body;
  const imageFile = req.file;

  try {
    const newPlant = await prisma.plant.create({
      data: {
        name,
        species,
        userId: req.user.userId,
        images: imageFile ? {
          create: [{
            imageData: imageFile.buffer
          }]
        } : undefined
      },
      include: { 
        images: {
          select: { id: true, plantId: true, createdAt: true }
        }
      }
    });

    // Convert image data to URL for frontend
    const plantWithImages = {
      ...newPlant,
      images: newPlant.images.map(image => ({
        ...image,
        imageUrl: `/plants/images/${image.id}`
      }))
    };

    res.status(201).json(plantWithImages);
  } catch (error) {
    console.error('Error creating plant:', error);
    res.status(500).json({ error: 'Failed to create plant' });
  }
});



router.get('/', authenticateToken, async (req, res) => {
  const { searchTerm, page, limit, sortBy, sortOrder } = req.query;

  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const skip = (currentPage - 1) * itemsPerPage;

  const whereClause = {
    userId: req.user.userId,
  };

  if (searchTerm) {
    whereClause.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { species: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }


  // Construct orderBy based on sortBy and sortOrder
  let orderBy = { createdAt: 'desc' }; // Default
  if (sortBy === 'name') {
    orderBy = { name: sortOrder === 'asc' ? 'asc' : 'desc' };
  } else if (sortBy === 'createdAt') {
    orderBy = { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' };
  }

  try {
    const totalPlants = await prisma.plant.count({ where: whereClause });

    const plants = await prisma.plant.findMany({
      where: whereClause,
      orderBy: orderBy,
      include: { 
        images: {
          select: { id: true, plantId: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: { select: { logs: true } },
        recommendations: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      skip: skip,
      take: itemsPerPage,
    });
    
    // Convert image data to URL for frontend
    const plantsWithImages = plants.map(plant => ({
      ...plant,
      logCount: plant._count.logs,
      images: plant.images.map(image => ({
        ...image,
        imageUrl: `/plants/images/${image.id}`
      }))
    }));

    res.json({ plants: plantsWithImages, total: totalPlants });
  } catch (error) {
    console.error('Error fetching plants:', error);
    res.status(500).json({ error: 'Failed to fetch plants' });
  }
});




router.get('/:id', authenticateToken, async (req, res) => {
  const plantId = parseInt(req.params.id);

  try {
    const plant = await prisma.plant.findFirst({
      where: { id: plantId, userId: req.user.userId },
      include: { 
        images: { 
          select: { id: true, plantId: true, createdAt: true },
          orderBy: { createdAt: 'desc' } 
        }, 
        logs: { orderBy: { logDate: 'desc' } }, 
        recommendations: { 
            include: { plantImage: { select: { id: true } } },
            orderBy: { createdAt: 'desc' }
        },
        careTips: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!plant) return res.status(404).json({ error: 'Plant not found' });

    const plantWithImages = {
      ...plant,
      images: plant.images.map(image => ({
        ...image,
        imageUrl: `/plants/images/${image.id}`
      }))
    };

    res.json(plantWithImages);
  } catch (error) {
    console.error('Error fetching plant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  const plantId = parseInt(req.params.id);
  const { name, species } = req.body;
  const imageFile = req.file;

  try {
    const plant = await prisma.plant.findFirst({ where: { id: plantId, userId: req.user.userId } });
    if (!plant) return res.status(404).json({ error: 'Plant not found' });

    const updatedData = { name, species };

    if (imageFile) {
      // Get current image count
      const imageCount = await prisma.plantImage.count({ where: { plantId } });
      
      // If we have 5 or more, delete the oldest ones until we have space (we want to keep 4, so adding 1 makes 5)
      if (imageCount >= 5) {
        const imagesToDelete = await prisma.plantImage.findMany({
          where: { plantId },
          orderBy: { createdAt: 'asc' },
          take: imageCount - 4 // Delete enough to leave 4
        });
        
        const idsToDelete = imagesToDelete.map(img => img.id);
        if (idsToDelete.length > 0) {
            await prisma.plantImage.deleteMany({
                where: { id: { in: idsToDelete } }
            });
        }
      }

      await prisma.plantImage.create({
        data: {
          plantId: plantId,
          imageData: imageFile.buffer,
        }
      });
    }

    const updatedPlant = await prisma.plant.update({
      where: { id: plantId },
      data: updatedData,
      include: { 
        images: {
          select: { id: true, plantId: true, createdAt: true }
        }
      }
    });
    
    // Convert image data to URL for frontend
    const plantWithImages = {
      ...updatedPlant,
      images: updatedPlant.images.map(image => ({
        ...image,
        imageUrl: `/plants/images/${image.id}`
      }))
    };

    res.json(plantWithImages);
  } catch (error) {
    console.error('Error updating plant:', error);
    res.status(500).json({ error: 'Failed to update plant' });
  }
});



router.delete('/:id', authenticateToken, async (req, res) => {
  const plantId = parseInt(req.params.id);

  try {
    const plant = await prisma.plant.findFirst({
      where: { id: plantId, userId: req.user.userId }
    });

    if (!plant) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    await prisma.plantImage.deleteMany({ where: { plantId } });
    await prisma.plantLog.deleteMany({ where: { plantId } });
    await prisma.aIRecommendation.deleteMany({ where: { plantId } });
    await prisma.plant.delete({ where: { id: plantId } });

    res.json({ message: 'Plant deleted successfully' });
  } catch (error) {
    console.error('Error deleting plant:', error);
    res.status(500).json({ error: 'Failed to delete plant' });
  }
});


router.post('/:id/ai-recommendations', authenticateToken, express.json(), async (req, res) => {
  const plantId = parseInt(req.params.id);
  const { force } = req.body;
  console.log(`AI Rec request for plant ${plantId}, force: ${force}`);

  try {
    const plant = await prisma.plant.findFirst({ 
      where: { id: plantId, userId: req.user.userId },
      include: { images: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    
    if (!plant) return res.status(404).json({ error: 'Plant not found' });
    
    const latestImage = plant.images[0];
    if (!latestImage) return res.status(400).json({ error: 'Plant has no image to analyze' });

    // Check for existing recommendation for this image
    const existingRec = await prisma.aIRecommendation.findFirst({
      where: { plantImageId: latestImage.id },
      orderBy: { createdAt: 'desc' }
    });

    if (existingRec && !force) {
      console.log('Returning cached recommendation');
      return res.status(200).json({ 
        status: 'cached', 
        message: 'Analysis already exists for this image',
        data: {
            ...existingRec,
            suggestionText: existingRec.suggestionText // It's already a string in DB, but check if it needs parsing if we stored JSON
        }
      });
    }

    const imageBase64 = Buffer.from(latestImage.imageData).toString('base64');
    const aiResult = await identifyPlant(`data:image/jpeg;base64,${imageBase64}`);
    
    if (aiResult instanceof Error) {
        throw aiResult;
    }

    const newRecommendation = await prisma.aIRecommendation.create({
      data: {
        plantId,
        species: aiResult["Plant Name"],
        disease: aiResult["Diseases"].join(', '),
        suggestionText: JSON.stringify(aiResult),
        imageUrl: null, 
        plantImageId: latestImage.id
      }
    });

    // Auto-update plant species if it was not provided
    if (!plant.species || plant.species.trim() === '') {
        await prisma.plant.update({
            where: { id: plantId },
            data: { species: aiResult["Plant Name"] }
        });
    }

    res.status(201).json({ status: 'new', data: newRecommendation });

  } catch (error) {
    console.error('Error creating AI recommendation:', error);
    if (error.message.includes("does not appear to be a plant")) {
        return res.status(400).json({ error: error.message });
    }
    if (error.message.includes("quota exceeded")) {
        return res.status(429).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create AI recommendation' });
  }
});


router.post('/:id/logs', authenticateToken, express.json(), async (req, res) => {
  const plantId = parseInt(req.params.id);
  const logs = req.body.logs; 
  if (!Array.isArray(logs) || logs.length === 0) {
    return res.status(400).json({ error: 'Logs must be a non-empty array' });
  }

  try {
    const plant = await prisma.plant.findFirst({
      where: { id: plantId, userId: req.user.userId }
    });

    if (!plant) {
      return res.status(404).json({ error: 'Plant not found' });
    }
    const logsData = logs.map(log => ({
      plantId,
      logType: log.logType,
      logValue: log.logValue || null,
      logDate: log.logDate ? new Date(log.logDate) : new Date(),
      note: log.note || null
    }));
    const createdLogs = await prisma.plantLog.createMany({
      data: logsData
    });

    res.status(201).json({ message: `${logs.length} logs added successfully` });
  } catch (error) {
    console.error('Error adding plant logs:', error);
    res.status(500).json({ error: 'Failed to add plant logs' });
  }
});







router.post('/:id/care-tips', authenticateToken, express.json(), async (req, res) => {
  const plantId = parseInt(req.params.id);


  try {
    const plant = await prisma.plant.findFirst({
      where: { id: plantId, userId: req.user.userId },
      include: { 
        images: { orderBy: { createdAt: 'desc' }, take: 1 },
        recommendations: { orderBy: { createdAt: 'desc' }, take: 1 },
        careTips: { orderBy: { createdAt: 'desc' }, take: 1 }, // Get latest care tip
        logs: { orderBy: { logDate: 'desc' }, take: 10 } // Get last 10 logs
      }
    });

    if (!plant) return res.status(404).json({ error: 'Plant not found' });

    const latestRec = plant.recommendations[0];
    const diseaseInfo = latestRec ? latestRec.disease : "Unknown condition";
    
    // Format logs from DB
    let logsText = "";
    if (plant.logs && plant.logs.length > 0) {
        logsText = plant.logs.map(log => 
            `- ${new Date(log.logDate).toLocaleDateString()}: ${log.logType} (${log.logValue || 'N/A'}) - ${log.note || ''}`
        ).join('\n');
    } else {
        // If no logs, we can still generate tips but they will be generic
        logsText = "No specific care logs recorded yet.";
    }

    // Caching Logic
    const latestCareTip = plant.careTips[0];
    const recId = latestRec ? latestRec.id : null;

    // Check if we have a previous tip, and if the inputs (logs and recommendation) are the same
    if (latestCareTip) {
        const logsMatch = (latestCareTip.logsUsed || "") === logsText;
        const recMatch = latestCareTip.recommendationId === recId;

        if (logsMatch && recMatch) {
            return res.json({ 
                status: 'cached', 
                careTips: latestCareTip.tips 
            });
        }
    }

    const careTips = await getPlantCareTips(plant.name, diseaseInfo, logsText);

    // Save to DB
    await prisma.careTip.create({
        data: {
            plantId,
            tips: careTips,
            logsUsed: logsText,
            recommendationId: recId
        }
    });

    res.json({ status: 'new', careTips });

  } catch (error) {
    console.error('Error generating care tips:', error);
    res.status(500).json({ error: 'Failed to generate care tips' });
  }
});

module.exports = router