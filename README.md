# 🎮 DigiPump - Digital Pet Sanctuary

A minimalist terminal-style digital pet sanctuary where ASCII creatures come to life! Experience clean command-line aesthetics, AI-powered pet generation, and retro terminal interface in this next-generation Tamagotchi-style application.

## ✨ Features

### 🔷 Public Page (/)
- Display all pets in styled cards
- Shows ASCII art, name, race, owner (linked to X profile)
- Growth stages: Baby → Teen → Adult (based on feed count)
- Hunger status with real-time cooldowns
- Auto-refresh every 5 minutes

### 🔐 Admin Panel (/admin)
- Password-protected administration
- **Pet Management**: Create, edit, delete pets
- **Feeding System**: Feed pets with 1-hour cooldown
- **ASCII Templates**: Pre-saved templates for quick pet creation  
- **AI Generation**: Generate unique pets using OpenAI API
- **Preview System**: Review AI-generated pets before adding

### 🧠 Growth & Feeding System
- **Baby** (0-2 feeds) → **Teen** (3-5 feeds) → **Adult** (6+ feeds)
- 1-hour feeding cooldown per pet
- Hunger status: Hungry → Getting Hungry → Full
- Feed count tracking and display

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- OpenAI API key (optional, for AI generation)

### Installation

1. **Clone or download the project**
   ```bash
   cd ascii-pet-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables (optional)**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

4. **Start the application**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

5. **Open your browser**
   - Public page: http://localhost:5000
   - Admin panel: http://localhost:5000/admin
   - Default admin password: `admin123`

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# OpenAI API Key for AI pet generation
OPENAI_API_KEY=your_openai_api_key_here

# Admin password (default: admin123)
ADMIN_PASSWORD=your_secure_password

# Server port (default: 5000, matches deployment port mapping)
PORT=5000
```

### Getting OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or sign in
3. Generate a new API key
4. Add it to your `.env` file

**Note**: AI generation works without the API key using fallback templates.

## 🎮 How to Use

### For Admins

1. **Access Admin Panel**: Go to `/admin` and enter password
2. **Add Pets**: Use the "Add Pet" tab or templates
3. **AI Generation**: Enter Twitter/X link and generate unique pets
4. **Manage Pets**: Edit, delete, or feed existing pets
5. **Templates**: Use pre-made ASCII templates for quick setup

### For Visitors

1. **View Pets**: Browse all pets on the homepage
2. **Check Status**: See hunger levels and growth stages
3. **Owner Links**: Click owner handles to visit their X profiles

## 🏗️ Project Structure

```
ascii-pet-website/
├── server.js          # Main Express server
├── database.js        # SQLite database handler
├── package.json       # Dependencies and scripts
├── pets.db           # SQLite database (auto-created)
├── views/            # EJS templates
│   ├── home.ejs      # Public homepage
│   ├── admin.ejs     # Admin panel
│   └── admin-login.ejs # Admin login
├── public/           # Static files (if needed)
└── .env.example      # Environment variables template
```

## 🎨 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Frontend**: EJS templates, TailwindCSS
- **AI Integration**: OpenAI GPT-3.5-turbo
- **Session Management**: Express-session

## 🔒 Security Features

- Password-protected admin panel
- Session-based authentication
- Input validation and sanitization
- SQL injection protection with prepared statements

## 📝 Default ASCII Templates

The application comes with 4 pre-loaded templates:
- 🐱 **Whiskers** (Cat)
- 🐶 **Buddy** (Dog)  
- 🤖 **Robo** (Robot)
- 🦋 **Flutter** (Butterfly)

## 🛠️ Development

### Scripts
```bash
npm start       # Production server
npm run dev     # Development with nodemon
```

### Adding New Templates
Templates are stored in the `ascii_templates` table. You can add new ones via the admin panel or directly in the database.

### Customizing Growth Stages
Edit the `calculateGrowthStage` function in `database.js`:
- Baby: 0-2 feeds
- Teen: 3-5 feeds  
- Adult: 6+ feeds

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   ```bash
   npm install
   ```

2. **Database errors**
   - Delete `pets.db` file to reset database
   - Restart the application

3. **AI generation not working**
   - Check OPENAI_API_KEY in `.env`
   - Verify API key is valid and has credits

4. **Port already in use**
   - Change PORT in `.env` or use:
   ```bash
   PORT=5001 npm start
   ```

### Debug Mode
Set `NODE_ENV=development` for detailed error logs.

## 🚀 Deployment

### Local Production
```bash
NODE_ENV=production npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📄 License

MIT License - feel free to use for personal or educational projects.

## 🤝 Contributing

This is a fun demo project! Feel free to:
- Add new ASCII art templates
- Improve the UI/UX
- Add new pet characteristics
- Enhance the AI prompts

## 🎉 Enjoy Your ASCII Pets!

Create, feed, and watch your digital companions grow! 🐾✨