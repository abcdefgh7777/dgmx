require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const Database = require('./database');
const OpenAI = require('openai');
const autoReply = require('./auto-reply');

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Initialize AI client (Kimi/Moonshot if available, otherwise OpenAI)
const aiClient = process.env.KIMI_API_KEY ? new OpenAI({
  apiKey: process.env.KIMI_API_KEY,
  baseURL: 'https://api.moonshot.ai/v1',
}) : process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Initialize database
const db = new Database();

// Initialize X auto-reply agent
autoReply.init(db, aiClient);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'ascii-pet-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Routes
app.get('/', async (req, res) => {
  try {
    const pets = await db.getAllPets();
    res.render('home', { pets });
  } catch (error) {
    console.error('Error fetching pets:', error);
    res.status(500).send('Server error');
  }
});

// Documentation page
app.get('/docs', (req, res) => {
  res.render('docs');
});

// Admin authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

// Admin routes
app.get('/admin/login', (req, res) => {
  res.render('admin-login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    res.redirect('/admin');
  } else {
    res.render('admin-login', { error: 'Invalid password' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/admin', requireAuth, async (req, res) => {
  try {
    const pets = await db.getAllPets();
    const templates = await db.getAllTemplates();
    res.render('admin', { pets, templates });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Server error');
  }
});

// API routes
app.post('/api/pets', requireAuth, async (req, res) => {
  try {
    const { ascii, name, race, owner, status } = req.body;
    const petId = await db.createPet(ascii, name, race, owner, status);
    res.json({ success: true, petId });
  } catch (error) {
    console.error('Error creating pet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/pets/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { ascii, name, race, owner, status } = req.body;
    await db.updatePet(id, ascii, name, race, owner, status);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating pet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/pets/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.deletePet(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate feeding message based on Digimon type
function generateFeedingMessage(pet) {
  const messages = {
    cat: [
      `${pet.name} purrs contentedly as ${pet.ownerHandle} serves fresh tuna! \ud83d\udc31\ud83c\udf7d\ufe0f`,
      `Meow! ${pet.name} happily munches on salmon treats prepared by ${pet.ownerHandle}! \ud83d\udc1f`,
      `${pet.ownerHandle} opens a can of premium cat food and ${pet.name} comes running! \ud83c\udf7d\ufe0f`,
      `${pet.name} rubs against ${pet.ownerHandle}'s leg after enjoying a delicious meal! \ud83d\ude38`,
      `Fresh milk and kibble! ${pet.name} shows appreciation with gentle head bumps to ${pet.ownerHandle}! \ud83e\udd5b`
    ],
    dog: [
      `Woof! ${pet.name} wags tail excitedly as ${pet.ownerHandle} fills the food bowl! \ud83d\udc36\ud83c\udf56`,
      `${pet.ownerHandle} prepares a hearty stew and ${pet.name} does happy spins! \ud83c\udf72`,
      `Bone-shaped treats! ${pet.name} gives ${pet.ownerHandle} grateful puppy eyes! \ud83e\uddfe`,
      `${pet.name} sits patiently as ${pet.ownerHandle} serves premium dog food! \ud83c\udf7d\ufe0f`,
      `Adventure time! ${pet.ownerHandle} and ${pet.name} share jerky after a long walk! \ud83e\udd69`
    ],
    dragon: [
      `${pet.name} breathes satisfied smoke rings after ${pet.ownerHandle} brings flaming coals! \ud83d\udd25`,
      `Roasted gems! ${pet.ownerHandle} feeds ${pet.name} precious stones heated to perfection! \ud83d\udc8e`,
      `${pet.name} purrs like thunder as ${pet.ownerHandle} offers ancient magical herbs! \u2728`,
      `Fire-grilled phoenix meat! ${pet.name} shows appreciation with gentle flame bursts! \ud83d\udd25\ud83d\udc24`,
      `${pet.ownerHandle} ventures to molten caves to gather volcanic delicacies for ${pet.name}! \ud83c\udf0b`
    ],
    robot: [
      `Beep beep! ${pet.name} processes high-grade oil delivered by ${pet.ownerHandle}! \ud83e\udd16\u26a1`,
      `${pet.ownerHandle} installs fresh energy cells and ${pet.name}'s LED eyes brighten! \ud83d\udd0b`,
      `Premium lubricants! ${pet.name} runs diagnostics and reports 100% satisfaction to ${pet.ownerHandle}! \ud83d\udd27`,
      `${pet.name} charges efficiently as ${pet.ownerHandle} provides quantum battery cores! \u26a1`,
      `System update complete! ${pet.ownerHandle} feeds ${pet.name} optimized data packets! \ud83d\udcbe`
    ],
    bird: [
      `Tweet tweet! ${pet.name} chirps melodiously as ${pet.ownerHandle} offers sunflower seeds! \ud83d\udc26\ud83c\udf3b`,
      `${pet.ownerHandle} scatters millet and ${pet.name} performs a grateful flight dance! \ud83c\udf3e`,
      `Fresh berries! ${pet.name} shares sweet chirps with ${pet.ownerHandle}! \ud83e\uded0`,
      `${pet.name} preens happily after ${pet.ownerHandle} provides mineral-rich seeds! \ud83c\udf31`,
      `Morning hunt successful! ${pet.ownerHandle} and ${pet.name} share freshly caught insects! \ud83d\udc1b`
    ],
    fish: [
      `Splash! ${pet.name} creates happy bubbles as ${pet.ownerHandle} drops premium flakes! \ud83d\udc20\ud83d\udca8`,
      `${pet.ownerHandle} adds live brine shrimp and ${pet.name} darts around excitedly! \ud83e\udd90`,
      `Seaweed feast! ${pet.name} swims in circles to thank ${pet.ownerHandle}! \ud83c\udf3f`,
      `${pet.name} glides gracefully as ${pet.ownerHandle} provides nutrient-rich algae! \ud83c\udf31`,
      `Deep sea delicacies! ${pet.ownerHandle} brings plankton and ${pet.name} glows with happiness! \u2728`
    ],
    cosmic: [
      `${pet.name} shimmers with stardust as ${pet.ownerHandle} offers cosmic energy! \u2728\ud83c\udf0c`,
      `Nebula nectar! ${pet.ownerHandle} and ${pet.name} share ethereal space delicacies! \ud83c\udf0c`,
      `${pet.name} pulsates with joy as ${pet.ownerHandle} provides quantum sustenance! \u269b\ufe0f`,
      `Solar wind feast! ${pet.ownerHandle} channels starlight to nourish ${pet.name}! \u2600\ufe0f`,
      `${pet.name} creates tiny galaxies of gratitude after ${pet.ownerHandle}'s celestial offering! \ud83c\udf0c`
    ],
    sea: [
      `Bubble dance! ${pet.name} creates whirlpools of joy as ${pet.ownerHandle} brings kelp! \ud83c\udf0a`,
      `${pet.ownerHandle} dives deep to gather sea treasures for ${pet.name}! \ud83d\udc1a`,
      `Ocean feast! ${pet.name} glides gracefully after ${pet.ownerHandle}'s generous offering! \ud83c\udf0a`,
      `${pet.name} sings whale songs of appreciation to ${pet.ownerHandle}! \ud83d\udc33`,
      `Coral garden harvest! ${pet.ownerHandle} and ${pet.name} share underwater delicacies! \ud83e\udeb8`
    ]
  };
  
  // Determine Digimon element from race field  
  const element = pet.race.toLowerCase();
  let category = 'normal'; // default
  
  if (element === 'fire') category = 'fire';
  else if (element === 'water') category = 'water';
  else if (element === 'grass') category = 'grass';
  else if (element === 'electric') category = 'electric';
  else if (element === 'psychic') category = 'psychic';
  else if (element === 'flying') category = 'flying';
  else if (element === 'rock') category = 'rock';
  else if (element === 'ice') category = 'ice';
  else if (element === 'fighting') category = 'fighting';
  else if (element === 'poison') category = 'poison';
  else if (element === 'ground') category = 'ground';
  else if (element === 'ghost') category = 'ghost';
  else if (element === 'steel') category = 'steel';
  else if (element === 'bug') category = 'bug';
  else if (element === 'dragon') category = 'dragon';
  
  const categoryMessages = messages[category] || messages['normal'];
  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
}

app.post('/api/pets/:id/feed', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the pet to ensure it exists
    const pet = await db.getPetById(id);
    if (!pet) {
      return res.status(404).json({ success: false, error: 'Pet not found' });
    }
    
    try {
      const result = await db.feedPet(id);
      
      // If feeding was successful
      if (result.success) {
        // Get updated pet data
        const updatedPet = await db.getPetById(id);
        result.pet = updatedPet || pet;
        result.feedingMessage = generateFeedingMessage(updatedPet || pet);
      }
      
      res.json(result);
    } catch (feedError) {
      // Handle cooldown error
      const errorMessage = feedError.message;
      const cooldownMatch = errorMessage.match(/(\d+)/);
      const cooldownMinutes = cooldownMatch ? parseInt(cooldownMatch[1]) : 60;
      
      res.json({ 
        success: false, 
        error: errorMessage,
        pet: pet,
        cooldownMinutes: cooldownMinutes
      });
    }
  } catch (error) {
    console.error('Error feeding pet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single pet for editing
app.get('/api/pets/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const pet = await db.getPetById(id);
    if (pet) {
      res.json({ success: true, pet });
    } else {
      res.status(404).json({ success: false, error: 'Pet not found' });
    }
  } catch (error) {
    console.error('Error fetching pet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get template by ID
app.get('/api/templates/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const template = await db.getTemplateById(id);
    if (template) {
      res.json({ success: true, template });
    } else {
      res.status(404).json({ success: false, error: 'Template not found' });
    }
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Evolution stage folders and their level names
const STAGE_FOLDERS = ['Baby', 'Child', 'Adult', 'Perfect', 'Ultimate', 'Additions'];
const STAGE_LEVELS = {
  'Baby': 'Baby',
  'Child': 'Rookie',
  'Adult': 'Champion',
  'Perfect': 'Ultimate',
  'Ultimate': 'Mega',
  'Additions': 'Variable',
};

// Helper function to get Digimon from GIF files (all stage folders)
async function getRandomDigimonFromGifs() {
  const fs = require('fs');
  const path = require('path');

  try {
    let gifFiles = [];

    for (const folder of STAGE_FOLDERS) {
      const dir = path.join(__dirname, 'public', 'digimon', folder);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(file => file.endsWith('.gif'));
        gifFiles = gifFiles.concat(files.map(file => ({ file, folder, stage: STAGE_LEVELS[folder] || 'Unknown' })));
      }
    }

    if (gifFiles.length === 0) {
      return { file: 'Agumon.gif', folder: 'Child', stage: 'Rookie' };
    }

    // Random selection
    const randomIndex = Math.floor(Math.random() * gifFiles.length);
    return gifFiles[randomIndex];
  } catch (error) {
    console.error('Error reading Digimon GIFs:', error);
    return { file: 'Agumon.gif', folder: 'Child', stage: 'Rookie' };
  }
}

// Get random Baby stage Digimon only
async function getRandomBabyDigimon() {
  const fs = require('fs');
  const path = require('path');
  try {
    const dir = path.join(__dirname, 'public', 'digimon', 'Baby');
    if (!fs.existsSync(dir)) return { file: 'Koromon.gif', folder: 'Baby', stage: 'Baby' };
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.gif'));
    if (files.length === 0) return { file: 'Koromon.gif', folder: 'Baby', stage: 'Baby' };
    const pick = files[Math.floor(Math.random() * files.length)];
    return { file: pick, folder: 'Baby', stage: 'Baby' };
  } catch (e) {
    return { file: 'Koromon.gif', folder: 'Baby', stage: 'Baby' };
  }
}

app.post('/api/capture-digimon', requireAuth, async (req, res) => {
  try {
    const { ownerLink } = req.body;
    
    if (!ownerLink) {
      return res.json({ success: false, error: 'Tamer link is required' });
    }

    // Check if user already has a Digimon (limit: 1 per tamer)
    const digimonCount = await db.getUserDigimonCount(ownerLink);
    if (digimonCount >= 1) {
      return res.json({
        success: false,
        error: 'You already have a Digimon! Feed and battle to grow it, or "format device" to start over.',
        type: 'limit_reached'
      });
    }

    // 30% chance of catching failure
    const catchSuccess = Math.random() > 0.3;
    
    if (!catchSuccess) {
      return res.json({
        success: false,
        error: 'The Digimon escaped from the Digital World!',
        type: 'catch_failed',
        message: 'Better luck next time, tamer!'
      });
    }
    
    // Get random Baby stage Digimon from GIF files
    const digimonGif = await getRandomBabyDigimon();
    
    // Extract Digimon name from filename (remove .gif extension)
    const rawName = digimonGif.file.replace('.gif', '');
    const digimonName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    // Get element from DIGIMON_ELEMENTS in auto-reply or use folder-based stage
    const element = autoReply.getDigimonElement ? autoReply.getDigimonElement(rawName) : 'Unknown';
    const level = digimonGif.stage || 'Rookie';

    // Create the Digimon data using GIF instead of ASCII
    const digimonResult = {
      gifPath: `/digimon/${digimonGif.folder}/${digimonGif.file}`,
      name: digimonName,
      element: element,
      level: level,
      generatedAt: new Date().toISOString()
    };

    // Save the Digimon to database
    try {
      const digimonId = await db.createDigimon(digimonResult.gifPath, digimonResult.name, digimonResult.element, ownerLink);
      digimonResult.id = digimonId;
      
      res.json({ 
        success: true, 
        type: 'catch_success',
        message: 'Congratulations! You successfully captured a Digimon!',
        digimon: digimonResult
      });
    } catch (dbError) {
      console.error('Error saving Digimon to database:', dbError);
      res.status(500).json({ success: false, error: 'Failed to save Digimon' });
    }
    
  } catch (error) {
    console.error('Error generating pet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Animation demo route
app.get('/demo', (req, res) => {
  res.render('animation-demo');
});

// ── X Auto-Reply Agent Admin Routes ──

// Start the X agent
app.post('/api/admin/agent/start', requireAuth, (req, res) => {
  const result = autoReply.startAutoReply();
  res.json(result);
});

// Stop the X agent
app.post('/api/admin/agent/stop', requireAuth, (req, res) => {
  const result = autoReply.stopAutoReply();
  res.json(result);
});

// Get agent status
app.get('/api/admin/agent/status', requireAuth, (req, res) => {
  const status = autoReply.getAutoReplyStatus();
  res.json(status);
});

// Get recent agent replies
app.get('/api/admin/agent/replies', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const replies = await autoReply.getRecentReplies(limit);
    res.json({ replies });
  } catch (err) {
    res.json({ replies: [] });
  }
});

// Test agent reply (simulate an X mention without posting to X)
app.post('/api/admin/agent/test', requireAuth, async (req, res) => {
  try {
    const { username, message } = req.body;
    if (!message) return res.json({ ok: false, error: 'Message is required' });

    const testUsername = (username || 'testuser').replace(/^@/, '');
    const tweetText = `@${process.env.X_BOT_USERNAME || 'digimononx'} ${message}`;

    const fakeTweet = {
      id: 'test_' + Date.now(),
      text: tweetText,
      authorUsername: testUsername,
      authorAvatar: '',
      createdAt: new Date().toISOString(),
    };

    const result = await autoReply.processMention(fakeTweet);

    const response = {
      ok: true,
      command: result.command,
      text: result.text,
      image: null,
    };

    if (result.image) {
      response.image = 'data:image/png;base64,' + result.image.toString('base64');
    }

    res.json(response);
  } catch (err) {
    console.error('Agent test error:', err);
    res.json({ ok: false, error: err.message });
  }
});

// Clear agent reply logs
app.post('/api/admin/agent/clear-replies', requireAuth, async (req, res) => {
  try {
    await db.clearRepliedTweets();
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// Backfill avatars for tamers missing profile pictures
app.post('/api/admin/agent/backfill-avatars', requireAuth, async (req, res) => {
  try {
    const result = await autoReply.backfillAvatars();
    res.json(result);
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// Clear failed replies so they get retried
app.post('/api/admin/agent/clear-failed', requireAuth, async (req, res) => {
  try {
    const count = await db.clearFailedReplies();
    res.json({ ok: true, cleared: count });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// Get recent battles
app.get('/api/battles', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const battles = await db.getRecentBattles(limit);
    res.json({ battles });
  } catch (err) {
    res.json({ battles: [] });
  }
});

// Public agent activity feed
app.get('/api/agent/activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    const replies = await autoReply.getRecentReplies(limit);
    const filtered = (replies || []).filter(r => r.our_reply && !r.our_reply.startsWith('['));
    res.json({ activity: filtered });
  } catch (err) {
    res.json({ activity: [] });
  }
});

// Serve icon folder listing
app.get('/api/icons', (req, res) => {
  const fs = require('fs');
  const iconDir = path.join(__dirname, 'public', 'icon');
  try {
    if (!fs.existsSync(iconDir)) return res.json({ icons: [] });
    const files = fs.readdirSync(iconDir).filter(f => /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(f));
    res.json({ icons: files });
  } catch (e) {
    res.json({ icons: [] });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Animation demo: http://0.0.0.0:${PORT}/demo`);
  console.log(`X Agent: configured=${autoReply.getAutoReplyStatus().configured}`);
});