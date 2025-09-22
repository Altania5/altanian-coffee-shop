const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Coffee Art Schema
const coffeeArtSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String, required: true },
  artist: { 
    name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  votes: { type: Number, default: 0 },
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: [{ type: String }],
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'CoffeeArtContest' },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
});

const CoffeeArt = mongoose.model('CoffeeArt', coffeeArtSchema);

// Coffee Art Contest Schema
const contestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  prize: { type: String },
  theme: { type: String },
  status: { type: String, enum: ['upcoming', 'active', 'ended'], default: 'upcoming' },
  submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CoffeeArt' }],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'CoffeeArt' },
  createdAt: { type: Date, default: Date.now }
});

const CoffeeArtContest = mongoose.model('CoffeeArtContest', contestSchema);

// Get all coffee art (gallery)
router.get('/gallery', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'approved' } = req.query;
    
    const arts = await CoffeeArt.find({ status })
      .populate('artist.userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await CoffeeArt.countDocuments({ status });
    
    res.json({
      success: true,
      arts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching coffee art gallery:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch gallery' });
  }
});

// Submit new coffee art
router.post('/submit', async (req, res) => {
  try {
    const { title, description, imageUrl, artist, tags } = req.body;
    
    const art = new CoffeeArt({
      title,
      description,
      imageUrl,
      artist,
      tags: tags || []
    });
    
    await art.save();
    
    res.json({
      success: true,
      art,
      message: 'Coffee art submitted successfully!'
    });
  } catch (error) {
    console.error('Error submitting coffee art:', error);
    res.status(500).json({ success: false, message: 'Failed to submit coffee art' });
  }
});

// Vote for coffee art
router.post('/vote/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const artId = req.params.id;
    
    const art = await CoffeeArt.findById(artId);
    if (!art) {
      return res.status(404).json({ success: false, message: 'Coffee art not found' });
    }
    
    // Check if user already voted
    if (art.voters.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You have already voted for this art' });
    }
    
    art.votes += 1;
    art.voters.push(userId);
    await art.save();
    
    res.json({
      success: true,
      votes: art.votes,
      message: 'Vote recorded successfully!'
    });
  } catch (error) {
    console.error('Error voting for coffee art:', error);
    res.status(500).json({ success: false, message: 'Failed to vote' });
  }
});

// Get active contests
router.get('/contests', async (req, res) => {
  try {
    const contests = await CoffeeArtContest.find({ status: { $in: ['upcoming', 'active'] } })
      .populate('submissions')
      .sort({ startDate: 1 });
    
    res.json({
      success: true,
      contests
    });
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contests' });
  }
});

// Create new contest (admin only)
router.post('/contests', async (req, res) => {
  try {
    const { title, description, startDate, endDate, prize, theme } = req.body;
    
    const contest = new CoffeeArtContest({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      prize,
      theme
    });
    
    await contest.save();
    
    res.json({
      success: true,
      contest,
      message: 'Contest created successfully!'
    });
  } catch (error) {
    console.error('Error creating contest:', error);
    res.status(500).json({ success: false, message: 'Failed to create contest' });
  }
});

module.exports = router;
