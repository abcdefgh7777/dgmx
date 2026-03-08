const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    const dbDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
    this.db = new sqlite3.Database(path.join(dbDir, 'pets.db'));
    this.init();
  }

  init() {
    // Create digimon table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ascii TEXT NOT NULL,
        name TEXT NOT NULL,
        race TEXT NOT NULL,
        owner TEXT NOT NULL,
        status TEXT DEFAULT 'Happy',
        next_feed_at INTEGER DEFAULT 0,
        feed_count INTEGER DEFAULT 0,
        growth_stage TEXT DEFAULT 'Baby',
        auto_feed INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Add columns if they don't exist (for existing databases)
    const addCol = (col, def) => {
      this.db.run(`ALTER TABLE pets ADD COLUMN ${col} ${def}`, (err) => {
        if (err && !err.message.includes('duplicate column name')) { /* ignore */ }
      });
    };
    addCol('auto_feed', 'INTEGER DEFAULT 1');
    addCol('hp', 'INTEGER DEFAULT 100');
    addCol('xp', 'INTEGER DEFAULT 0');
    addCol('level', 'INTEGER DEFAULT 1');
    addCol('wins', 'INTEGER DEFAULT 0');
    addCol('losses', 'INTEGER DEFAULT 0');
    addCol('avatar', "TEXT DEFAULT ''");

    // Create replied_tweets table for X auto-reply deduplication
    this.db.run(`
      CREATE TABLE IF NOT EXISTS replied_tweets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tweet_id TEXT NOT NULL UNIQUE,
        reply_tweet_id TEXT DEFAULT '',
        from_username TEXT NOT NULL,
        tweet_content TEXT DEFAULT '',
        our_reply TEXT DEFAULT '',
        command TEXT DEFAULT '',
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Create settings table for key-value persistence
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Create pet_activities table for tracking interactions between pets
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pet_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet1_id INTEGER NOT NULL,
        pet1_name TEXT NOT NULL,
        pet1_owner TEXT NOT NULL,
        pet2_id INTEGER NOT NULL,
        pet2_name TEXT NOT NULL,
        pet2_owner TEXT NOT NULL,
        activity TEXT NOT NULL,
        tweet_id TEXT DEFAULT '',
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Create battles table for tracking battle history
    this.db.run(`
      CREATE TABLE IF NOT EXISTS battles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet1_id INTEGER NOT NULL,
        pet1_name TEXT NOT NULL,
        pet1_owner TEXT NOT NULL,
        pet2_id INTEGER NOT NULL,
        pet2_name TEXT NOT NULL,
        pet2_owner TEXT NOT NULL,
        winner_id INTEGER,
        battle_log TEXT DEFAULT '',
        tweet_id TEXT DEFAULT '',
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Create ASCII templates table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ascii_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ascii TEXT NOT NULL,
        name TEXT NOT NULL,
        race TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Insert some default ASCII templates
    this.insertDefaultTemplates();
  }

  insertDefaultTemplates() {
    const defaultTemplates = [
      {
        ascii: `    /\\_/\\  
   ( o.o ) 
    > ^ <`,
        name: 'Whiskers',
        race: 'Cat'
      },
      {
        ascii: `    /\\   /\\   
   (  . .)  
  o_)\\) (_o`,
        name: 'Buddy',
        race: 'Dog'
      },
      {
        ascii: `    .--.
   |o_o |
   |:_/ |
  //   \\ \\
 (|     | )
/'\_   _/\`\\
\\___)=(___/`,
        name: 'Robo',
        race: 'Robot'
      },
      {
        ascii: `  ,-.       .-.
 / \\ (       ) / \\
| \\ /\\.\\   /./\\ / |
 \\  )\\) ) ( ((/  /
  '  \\  ( )  /  '
     ) ) ) ( (
    ( ( ( ) ) )
     ) ) ) ( (`,
        name: 'Flutter',
        race: 'Butterfly'
      }
    ];

    // Check if templates already exist
    this.db.get('SELECT COUNT(*) as count FROM ascii_templates', (err, row) => {
      if (!err && row.count === 0) {
        const stmt = this.db.prepare('INSERT OR IGNORE INTO ascii_templates (ascii, name, race) VALUES (?, ?, ?)');
        defaultTemplates.forEach(template => {
          stmt.run(template.ascii, template.name, template.race);
        });
        stmt.finalize();
      }
    });
  }

  // Pet methods
  getAllPets() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM pets ORDER BY created_at DESC', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const pets = rows.map(pet => ({
            ...pet,
            hungerStatus: this.getHungerStatus(pet.next_feed_at),
            ownerHandle: this.extractTwitterHandle(pet.owner),
            activity: this.generateActivity(pet)
          }));
          
          // Auto-feed hungry Digimon
          this.autoFeedHungryDigimon(pets);
          
          resolve(pets);
        }
      });
    });
  }

  getPetById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM pets WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            row.hungerStatus = this.getHungerStatus(row.next_feed_at);
            row.ownerHandle = this.extractTwitterHandle(row.owner);
            row.activity = this.generateActivity(row);
          }
          resolve(row);
        }
      });
    });
  }

  getUserDigimonCount(owner) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as count FROM pets WHERE owner = ?', [owner], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  createPet(ascii, name, race, owner, status = 'Happy') {
    return new Promise((resolve, reject) => {
      // Check if user already has 3 Digimon
      this.getUserDigimonCount(owner).then(count => {
        if (count >= 3) {
          reject(new Error('Maximum Digimon limit reached (3 per tamer)'));
          return;
        }

        const stmt = this.db.prepare(`
          INSERT INTO pets (ascii, name, race, owner, status)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        stmt.run(ascii, name, race, owner, status, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
        
        stmt.finalize();
      }).catch(reject);
    });
  }

  createDigimon(gifPath, name, race, owner, status = 'Happy', avatar = '') {
    return new Promise((resolve, reject) => {
      // Check if user already has 3 Digimon
      this.getUserDigimonCount(owner).then(count => {
        if (count >= 3) {
          reject(new Error('Maximum Digimon limit reached (3 per tamer)'));
          return;
        }

        const stmt = this.db.prepare(`
          INSERT INTO pets (ascii, name, race, owner, status, avatar)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(gifPath, name, race, owner, status, avatar, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });

        stmt.finalize();
      }).catch(reject);
    });
  }

  updatePet(id, ascii, name, race, owner, status) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE pets 
        SET ascii = ?, name = ?, race = ?, owner = ?, status = ?
        WHERE id = ?
      `);
      
      stmt.run(ascii, name, race, owner, status, id, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
      
      stmt.finalize();
    });
  }

  deletePet(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM pets WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  feedPet(id) {
    return new Promise((resolve, reject) => {
      // Check current state
      this.getPetById(id).then(pet => {
        if (!pet) {
          reject(new Error('Pet not found'));
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        
        // Check if pet can be fed (1 hour cooldown)
        if (pet.next_feed_at > now) {
          const timeLeft = pet.next_feed_at - now;
          const minutesLeft = Math.ceil(timeLeft / 60);
          reject(new Error(`Pet can be fed in ${minutesLeft} minutes`));
          return;
        }

        // Feed the pet
        const newFeedCount = pet.feed_count + 1;
        const newGrowthStage = this.calculateGrowthStage(newFeedCount);
        const nextFeedAt = now + (60 * 60); // 1 hour from now

        const stmt = this.db.prepare(`
          UPDATE pets 
          SET feed_count = ?, growth_stage = ?, next_feed_at = ?, status = 'Full'
          WHERE id = ?
        `);
        
        stmt.run(newFeedCount, newGrowthStage, nextFeedAt, id, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              success: true,
              feedCount: newFeedCount,
              growthStage: newGrowthStage,
              nextFeedAt: nextFeedAt
            });
          }
        });
        
        stmt.finalize();
      }).catch(reject);
    });
  }

  // Template methods
  getAllTemplates() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM ascii_templates ORDER BY name', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getTemplateById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM ascii_templates WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Helper methods
  calculateGrowthStage(feedCount) {
    if (feedCount >= 6) return 'Adult';
    if (feedCount >= 3) return 'Teen';
    return 'Baby';
  }

  getHungerStatus(nextFeedAt) {
    const now = Math.floor(Date.now() / 1000);
    
    if (nextFeedAt <= now) {
      return 'Hungry';
    } else {
      const timeLeft = nextFeedAt - now;
      const minutesLeft = Math.ceil(timeLeft / 60);
      if (minutesLeft <= 15) {
        return 'Getting Hungry';
      } else {
        return `Next feed in ${minutesLeft}m`;
      }
    }
  }

  autoFeedHungryDigimon(pets) {
    const now = Math.floor(Date.now() / 1000);
    
    pets.forEach(pet => {
      if (pet.auto_feed && pet.next_feed_at <= now) {
        // Auto-feed this Digimon
        const newFeedCount = pet.feed_count + 1;
        const newGrowthStage = this.calculateGrowthStage(newFeedCount);
        const nextFeedAt = now + (60 * 60); // 1 hour from now

        const stmt = this.db.prepare(`
          UPDATE pets 
          SET feed_count = ?, growth_stage = ?, next_feed_at = ?, status = 'Full'
          WHERE id = ?
        `);
        
        stmt.run(newFeedCount, newGrowthStage, nextFeedAt, pet.id, function(err) {
          if (err) {
            console.error('Error auto-feeding Digimon:', err);
          } else {
            console.log(`Auto-fed ${pet.name} (${pet.race})`);
          }
        });
        
        stmt.finalize();
      }
    });
  }

  generateActivity(pet) {
    const activities = [
      // Digimon Training & Battles
      "practicing Thunder Shock", "training speed attacks", "perfecting defense moves", "learning new techniques",
      "sparring with wild Digimon", "building battle stamina", "mastering type advantages", "studying opponent moves",
      "practicing combo attacks", "strengthening special moves", "working on accuracy", "training with digital masters",
      
      // Digimon Exploration & Adventure
      "exploring digital forests", "hunting for rare data", "discovering hidden servers", "climbing digital towers",
      "swimming in data streams", "flying through cyber networks", "spelunking in code caves", "tracking legendary Digimon",
      "searching for digivolution cores", "mapping new sectors", "investigating mysterious files", "chasing rare Digimon",
      "collecting rare items", "hunting for treasure", "exploring ancient servers", "diving in data reefs",
      
      // Digimon Social & Community
      "chatting with other Digimon", "making new tamer friends", "gossiping about digital battles", "organizing Digimon contests",
      "teaching younger Digimon", "sharing battle stories", "playing digital games", "hosting Digimon parties",
      "writing in DigiDex entries", "sending messages to tamers", "planning digital challenges", "forming Digimon teams",
      
      // Digimon Creative & Artistic
      "painting with digital pixels", "composing Digimon songs", "writing haikus about tamers", "sculpting with data",
      "designing new Digimon attacks", "crafting digital accessories", "building digital homes", "creating light displays",
      "choreographing victory dances", "learning human language", "designing data patterns", "making digital art",
      
      // Digimon Relaxation & Self-Care
      "meditating in peaceful servers", "taking a power nap", "charging in digital gardens", "grooming carefully",
      "stretching after battles", "doing digital meditation", "listening to digital sounds", "cloud watching",
      "star gazing", "enjoying peaceful silence", "taking deep breaths", "practicing mindfulness",
      
      // Digimon Maintenance & Care
      "organizing data storage", "cleaning digital area", "maintaining attack accuracy", "checking health status",
      "backing up battle memories", "optimizing battle performance", "checking type effectiveness", "running health checks",
      "calibrating special attacks", "updating attack database", "archiving tamer memories", "scanning for status effects",
      
      // Digimon Playful & Fun
      "playing hide and seek", "pulling harmless pranks", "chasing other Digimon", "juggling data orbs",
      "playing fetch with items", "doing victory spins", "bouncing joyfully", "spinning in circles",
      "playing tag with tamers", "racing other Digimon", "doing happy flips", "playing with digital toys",
      
      // Digimon Learning & Growth
      "reading about Digimon types", "studying new attacks", "practicing battle strategies", "solving tamer puzzles",
      "analyzing battle patterns", "experimenting with abilities", "testing new techniques", "learning from defeats",
      "asking tamers questions", "pondering digivolution", "studying type matchups", "researching legendary Digimon",
      
      // Digimon Resource Gathering
      "foraging for data bits", "mining for digivolution cores", "collecting digital scales", "gathering power orbs",
      "harvesting rare files", "searching for data crystals", "collecting battle items", "finding lost data orbs",
      "scavenging useful data", "hunting for energy", "gathering digital materials", "collecting tamer memories"
    ];
    
    // Generate consistent activity based on pet ID and current time
    const now = new Date();
    const seed = pet.id + Math.floor(now.getTime() / (1000 * 60 * 15)); // Changes every 15 minutes
    const activityIndex = Math.abs(seed) % activities.length;
    
    return activities[activityIndex];
  }

  extractTwitterHandle(ownerLink) {
    if (!ownerLink) return '';

    // Extract handle from various Twitter URL formats
    const match = ownerLink.match(/(?:twitter\.com\/|x\.com\/)([^\/\?]+)/);
    return match ? `@${match[1]}` : ownerLink;
  }

  // ── Get pet by owner handle (for X auto-reply) ──
  getPetByOwner(ownerHandle) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM pets WHERE owner LIKE ? LIMIT 1`,
        [`%${ownerHandle}%`],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            if (row) {
              row.hungerStatus = this.getHungerStatus(row.next_feed_at);
              row.ownerHandle = this.extractTwitterHandle(row.owner);
              row.activity = this.generateActivity(row);
            }
            resolve(row || null);
          }
        }
      );
    });
  }

  // ── Get all Digimon by owner (for X auto-reply) ──
  getPetsByOwner(ownerHandle) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM pets WHERE owner LIKE ? ORDER BY created_at DESC`,
        [`%${ownerHandle}%`],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const pets = (rows || []).map(pet => ({
              ...pet,
              hungerStatus: this.getHungerStatus(pet.next_feed_at),
              ownerHandle: this.extractTwitterHandle(pet.owner),
              activity: this.generateActivity(pet)
            }));
            resolve(pets);
          }
        }
      );
    });
  }

  // ── Update avatar for all pets owned by a tamer (by handle) ──
  updateTrainerAvatar(ownerHandle, avatar) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE pets SET avatar = ? WHERE owner LIKE ? AND (avatar IS NULL OR avatar = '')`,
        [avatar, `%${ownerHandle}%`],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Get all unique tamers missing avatars
  getTrainersWithoutAvatars() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT DISTINCT owner FROM pets WHERE avatar IS NULL OR avatar = ''`,
        (err, rows) => {
          if (err) reject(err);
          else resolve((rows || []).map(r => this.extractTwitterHandle(r.owner)));
        }
      );
    });
  }

  // ── Settings methods (key-value store) ──
  getSetting(key) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
        if (err) resolve(null);
        else resolve(row ? row.value : null);
      });
    });
  }

  setSetting(key, value) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [key, value],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  // ── Replied tweets methods (auto-reply dedup) ──
  hasReplied(tweetId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT 1 FROM replied_tweets WHERE tweet_id = ?', [tweetId], (err, row) => {
        if (err) resolve(false);
        else resolve(!!row);
      });
    });
  }

  saveRepliedTweet(tweetId, fromUsername, tweetContent, ourReply, replyTweetId, command) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR IGNORE INTO replied_tweets (tweet_id, reply_tweet_id, from_username, tweet_content, our_reply, command)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tweetId, replyTweetId || '', fromUsername, tweetContent, ourReply, command || ''],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  clearFailedReplies() {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM replied_tweets WHERE our_reply LIKE '[FAILED%' OR our_reply LIKE '[ERROR%'`,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  getRecentReplies(limit = 20) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM replied_tweets ORDER BY created_at DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) resolve([]);
          else resolve(rows || []);
        }
      );
    });
  }

  countRepliesToday() {
    return new Promise((resolve, reject) => {
      const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
      this.db.get(
        `SELECT COUNT(*) as count FROM replied_tweets WHERE created_at >= ?`,
        [startOfDay],
        (err, row) => {
          if (err) resolve(0);
          else resolve(row ? row.count : 0);
        }
      );
    });
  }

  clearRepliedTweets() {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM replied_tweets', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // ── Activity methods ──
  saveActivity(pet1, owner1, pet2, owner2, activity, tweetId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO pet_activities (pet1_id, pet1_name, pet1_owner, pet2_id, pet2_name, pet2_owner, activity, tweet_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pet1.id, pet1.name, owner1, pet2.id, pet2.name, owner2, activity, tweetId || ''],
        (err) => {
          if (err) console.error('[DB] Failed to save activity:', err.message);
          resolve(true);
        }
      );
    });
  }

  // ── Battle methods ──
  saveBattle(pet1, owner1, pet2, owner2, winnerId, battleLog, tweetId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO battles (pet1_id, pet1_name, pet1_owner, pet2_id, pet2_name, pet2_owner, winner_id, battle_log, tweet_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pet1.id, pet1.name, owner1, pet2.id, pet2.name, owner2, winnerId, battleLog || '', tweetId || ''],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  updateBattleStats(petId, won) {
    return new Promise((resolve, reject) => {
      const col = won ? 'wins' : 'losses';
      const xpGain = won ? 25 : 10;
      this.db.run(
        `UPDATE pets SET ${col} = ${col} + 1, xp = xp + ?, level = CASE WHEN (xp + ?) >= level * 100 THEN level + 1 ELSE level END WHERE id = ?`,
        [xpGain, xpGain, petId],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  getRecentBattles(limit = 20) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM battles ORDER BY created_at DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) resolve([]);
          else resolve(rows || []);
        }
      );
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;