const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Social Post Schema
const socialPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  imageUrl: { type: String },
  likes: { type: Number, default: 0 },
  comments: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const SocialPost = mongoose.model('SocialPost', socialPostSchema);

// Challenge Schema
const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  reward: { type: String },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  status: { type: String, enum: ['active', 'completed', 'expired'], default: 'active' }
});

const Challenge = mongoose.model('Challenge', challengeSchema);

// Get social feed
router.get('/feed', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const posts = await SocialPost.find()
      .populate('userId', 'firstName lastName')
      .populate('comments.userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json({
      success: true,
      posts,
      totalPages: Math.ceil(await SocialPost.countDocuments() / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching social feed:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch social feed' });
  }
});

// Create social post
router.post('/post', async (req, res) => {
  try {
    const { userId, content, imageUrl, tags } = req.body;
    
    const post = new SocialPost({
      userId,
      content,
      imageUrl,
      tags: tags || []
    });
    
    await post.save();
    await post.populate('userId', 'firstName lastName');
    
    res.json({
      success: true,
      post,
      message: 'Post created successfully!'
    });
  } catch (error) {
    console.error('Error creating social post:', error);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
});

// Like a post
router.post('/post/:id/like', async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    post.likes += 1;
    await post.save();
    
    res.json({
      success: true,
      likes: post.likes,
      message: 'Post liked!'
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ success: false, message: 'Failed to like post' });
  }
});

// Get active challenges
router.get('/challenges', async (req, res) => {
  try {
    const challenges = await Challenge.find({ status: 'active' })
      .populate('participants', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      challenges
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch challenges' });
  }
});

// Join a challenge
router.post('/challenges/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }
    
    if (challenge.participants.includes(userId)) {
      return res.status(400).json({ success: false, message: 'Already joined this challenge' });
    }
    
    challenge.participants.push(userId);
    await challenge.save();
    
    res.json({
      success: true,
      message: 'Successfully joined the challenge!'
    });
  } catch (error) {
    console.error('Error joining challenge:', error);
    res.status(500).json({ success: false, message: 'Failed to join challenge' });
  }
});

module.exports = router;
