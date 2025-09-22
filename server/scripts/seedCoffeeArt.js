const mongoose = require('mongoose');
require('dotenv').config();

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

const sampleArtworks = [
  {
    title: "Morning Latte Art",
    description: "A beautiful heart design in my morning latte",
    imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090a?w=400",
    artist: { name: "Alex Johnson" },
    votes: 15,
    tags: ["latte", "heart", "morning"],
    status: "approved"
  },
  {
    title: "Coffee Bean Portrait",
    description: "Created this portrait using coffee beans and espresso",
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
    artist: { name: "Sarah Chen" },
    votes: 23,
    tags: ["portrait", "beans", "creative"],
    status: "approved"
  },
  {
    title: "Espresso Swirl",
    description: "Perfect espresso with natural crema swirls",
    imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400",
    artist: { name: "Mike Rodriguez" },
    votes: 8,
    tags: ["espresso", "crema", "swirl"],
    status: "approved"
  },
  {
    title: "Cappuccino Flower",
    description: "Delicate flower pattern in cappuccino foam",
    imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400",
    artist: { name: "Emma Wilson" },
    votes: 31,
    tags: ["cappuccino", "flower", "foam"],
    status: "approved"
  },
  {
    title: "Coffee Cup Stack",
    description: "Artistic arrangement of coffee cups",
    imageUrl: "https://images.unsplash.com/photo-1522992319-0365e5f11656?w=400",
    artist: { name: "David Kim" },
    votes: 12,
    tags: ["cups", "stack", "artistic"],
    status: "approved"
  }
];

const sampleContests = [
  {
    title: "Spring Coffee Art Contest",
    description: "Show us your best spring-themed coffee art!",
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-31'),
    prize: "$100 gift card + featured artist spot",
    theme: "Spring",
    status: "active"
  },
  {
    title: "Latte Art Championship",
    description: "Annual latte art competition for all skill levels",
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-04-30'),
    prize: "$500 cash prize + trophy",
    theme: "Free Style",
    status: "upcoming"
  }
];

async function seedCoffeeArt() {
  try {
    // Connect to MongoDB
    const uri = process.env.ATLAS_URI;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await CoffeeArt.deleteMany({});
    await CoffeeArtContest.deleteMany({});
    console.log('Cleared existing coffee art data');

    // Insert sample artworks
    const artworks = await CoffeeArt.insertMany(sampleArtworks);
    console.log(`Inserted ${artworks.length} sample artworks`);

    // Insert sample contests
    const contests = await CoffeeArtContest.insertMany(sampleContests);
    console.log(`Inserted ${contests.length} sample contests`);

    console.log('✅ Coffee art data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding coffee art data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedCoffeeArt();
