const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authenticateToken } = require('../middleware/middleware');
const { identifyPlant } = require('../services/aiService');

router.post('/', authenticateToken, express.json({ limit: '10mb' }), async (req, res) => {
  const { name, species, imageBase64 } = req.body;

  try {
    const newPlant = await prisma.plant.create({
      data: {
        name,
        species,
        userId: req.user.userId,
        images: imageBase64 ? {
          create: [{
            imageData: Buffer.from(imageBase64, 'base64')
          }]
        } : undefined
      },
      include: { images: true }
    });

    res.status(201).json(newPlant);
  } catch (error) {
    console.error('Error creating plant:', error);
    res.status(500).json({ error: 'Failed to create plant' });
  }
});



router.get('/', authenticateToken, async (req, res) => {
  try {
    const plants = await prisma.plant.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: { images: true }
    });
    
    res.json(plants);
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
      include: { images: true, logs: true, recommendations: true }
    });

    if (!plant) return res.status(404).json({ error: 'Plant not found' });

    res.json(plant);
  } catch (error) {
    console.error('Error fetching plant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.put('/:id', authenticateToken, express.json({ limit: '10mb' }), async (req, res) => {
  const plantId = parseInt(req.params.id);
  const { name, species, imageBase64 } = req.body;

  try {
    const plant = await prisma.plant.findFirst({ where: { id: plantId, userId: req.user.userId } });
    if (!plant) return res.status(404).json({ error: 'Plant not found' });

    const updatedData = { name, species };

    const updatedPlant = await prisma.plant.update({
      where: { id: plantId },
      data: updatedData,
      include: { images: true }
    });

    if (imageBase64) {
      const newImage = await prisma.plantImage.create({
        data: {
          plantId: plantId,
          imageData: Buffer.from(imageBase64, 'base64'),
        }
      });
      updatedPlant.images.push(newImage);
    }

    res.json(updatedPlant);
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


router.post('/:id/ai-recommendations', express.json({ limit: '15mb' }), async (req, res) => {
  const plantId = parseInt(req.params.id);
  const { image, species } = req.body;

  try {
    // const plant = await prisma.plant.findFirst({ where: { id: plantId, userId: req.user.userId } });
    // if (!plant) return res.status(404).json({ error: 'Plant not found' });
    // const recentLogs = await prisma.plantLog.findMany({
    //   where: { plantId },
    //   orderBy: { logDate: 'desc' },
    //   take: 5
    // });
    // const logsSummary = recentLogs.map(log => {
    //   return `${log.logType}${log.logValue ? `: ${log.logValue}` : ''}${log.note ? ` (${log.note})` : ''}`;
    // }).join('; ');
    // const prompt = species
    //   ? `This is a ${species} leaf. Recent care activities: ${logsSummary}. What disease does this leaf have and what should I do?`
    //   : `Recent care activities: ${logsSummary}. What disease does this leaf have and what should I do?`;

    const aiResult = await identifyPlant(image);
    console.log(aiResult)

    // const newRecommendation = await prisma.aIRecommendation.create({
    //   data: {
    //     plantId,
    //     species: species || null,
    //     disease: aiResult.disease ?? null,
    //     suggestionText: aiResult.suggestion ?? JSON.stringify(aiResult),
    //     imageUrl: null
    //   }
    // });

    res.status(201).json(aiResult);

  } catch (error) {
    console.error('Error creating AI recommendation:', error);
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




router.put('/api/logs/:logId', authenticateToken, express.json(), async (req, res) => {
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


module.exports = router