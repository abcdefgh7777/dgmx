# 🎮 DigiPump - Replit Deployment Guide

## 📦 Quick Setup on Replit

1. **Upload the ZIP file** to your Replit project
2. **Extract all files** in the main directory
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set environment variables** (optional):
   - Go to Secrets tab in Replit
   - Add `OPENAI_API_KEY` if you want AI pet generation
   - Add `ADMIN_PASSWORD` to change from default "admin123"

5. **Run the project**:
   ```bash
   npm start
   ```

## 🔑 Environment Variables (Optional)

- `OPENAI_API_KEY`: Your OpenAI API key for AI pet generation
- `ADMIN_PASSWORD`: Custom admin password (default: admin123)
- `PORT`: Will be set automatically by Replit

## 🚀 Features Included

- ✅ Terminal-style ASCII pet sanctuary
- ✅ Pet feeding system with cooldown
- ✅ Growth stages (Baby → Teen → Adult)
- ✅ 100+ random pet activities
- ✅ Social media card generation
- ✅ AI pet generation (with OpenAI API)
- ✅ Comprehensive documentation
- ✅ Admin panel for pet management

## 📱 URLs

- **Home**: `https://your-repl-name.replit.app/`
- **Admin**: `https://your-repl-name.replit.app/admin`
- **Docs**: `https://your-repl-name.replit.app/docs`

## 🎯 Default Admin Access

- **URL**: `/admin`
- **Password**: `admin123` (change in environment variables)

## 🔧 Database

SQLite database will be created automatically on first run. No additional setup required!

---

*DigiPump v1.0.0 - July 25, 2025*