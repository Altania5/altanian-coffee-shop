const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Health Data Schema
const healthDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  caffeineIntake: { type: Number, default: 0 }, // in mg
  sleepHours: { type: Number, default: 0 },
  sleepQuality: { type: Number, min: 1, max: 10 }, // 1-10 scale
  mood: { type: String, enum: ['excellent', 'good', 'okay', 'poor', 'terrible'] },
  energyLevel: { type: Number, min: 1, max: 10 }, // 1-10 scale
  waterIntake: { type: Number, default: 0 }, // in ml
  exerciseMinutes: { type: Number, default: 0 },
  notes: { type: String }
});

const HealthData = mongoose.model('HealthData', healthDataSchema);

// Get user's health data
router.get('/data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const healthData = await HealthData.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: -1 });
    
    res.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    console.error('Error fetching health data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch health data' });
  }
});

// Add health data entry
router.post('/data', async (req, res) => {
  try {
    const healthEntry = new HealthData(req.body);
    await healthEntry.save();
    
    res.json({
      success: true,
      data: healthEntry,
      message: 'Health data recorded successfully!'
    });
  } catch (error) {
    console.error('Error recording health data:', error);
    res.status(500).json({ success: false, message: 'Failed to record health data' });
  }
});

// Get health insights/analytics
router.get('/insights/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const healthData = await HealthData.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: 1 });
    
    // Calculate insights
    const insights = {
      avgCaffeineIntake: healthData.reduce((sum, entry) => sum + entry.caffeineIntake, 0) / healthData.length || 0,
      avgSleepHours: healthData.reduce((sum, entry) => sum + entry.sleepHours, 0) / healthData.length || 0,
      avgSleepQuality: healthData.reduce((sum, entry) => sum + (entry.sleepQuality || 0), 0) / healthData.length || 0,
      avgEnergyLevel: healthData.reduce((sum, entry) => sum + (entry.energyLevel || 0), 0) / healthData.length || 0,
      totalWaterIntake: healthData.reduce((sum, entry) => sum + entry.waterIntake, 0),
      totalExerciseMinutes: healthData.reduce((sum, entry) => sum + entry.exerciseMinutes, 0),
      moodDistribution: healthData.reduce((acc, entry) => {
        if (entry.mood) {
          acc[entry.mood] = (acc[entry.mood] || 0) + 1;
        }
        return acc;
      }, {}),
      recommendations: []
    };
    
    // Generate recommendations
    if (insights.avgCaffeineIntake > 400) {
      insights.recommendations.push("Consider reducing caffeine intake - you're consuming more than the recommended daily limit.");
    }
    
    if (insights.avgSleepHours < 7) {
      insights.recommendations.push("Try to get at least 7-8 hours of sleep for better health.");
    }
    
    if (insights.avgSleepQuality < 6) {
      insights.recommendations.push("Consider improving sleep hygiene - avoid caffeine 6 hours before bedtime.");
    }
    
    if (insights.totalWaterIntake < 2000 * days) {
      insights.recommendations.push("Increase water intake - aim for at least 2L per day.");
    }
    
    res.json({
      success: true,
      insights
    });
  } catch (error) {
    console.error('Error generating health insights:', error);
    res.status(500).json({ success: false, message: 'Failed to generate insights' });
  }
});

module.exports = router;
