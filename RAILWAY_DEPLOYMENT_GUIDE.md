# 🚂 Railway Deployment Guide

## Overview

This guide will help you deploy the Cannabis Fantasy League application to Railway, a platform that supports full-stack Node.js applications with MySQL databases and WebSocket connections.

## Prerequisites

- GitHub account
- Railway account (sign up at https://railway.app)
- SendGrid API key (for email functionality)

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway to access your GitHub account

## Step 2: Create New Project

1. Click "New Project" in Railway dashboard
2. Select "Deploy from GitHub repo"
3. Choose `justinhartfield/cannabis-fantasy-league`
4. Railway will automatically detect the Node.js application

## Step 3: Add MySQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add MySQL"
3. Railway will provision a MySQL database
4. The `DATABASE_URL` will be automatically set as an environment variable

## Step 4: Configure Environment Variables

In the Railway dashboard, go to your service → Variables tab and add:

### Required Variables

```bash
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://your-app-name.up.railway.app

# SendGrid Email
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@cannabisfantasyleague.com

# Session Secret (generate a random string)
SESSION_SECRET=your_random_32_character_string_here
```

### Optional Variables

```bash
# OAuth (if using Google login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend Environment Variables
VITE_APP_LOGO=/logo.png
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

### Generate Session Secret

Run this command to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 5: Set Up Database Schema

After the first deployment, you need to initialize the database:

### Option A: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run database migrations
railway run npm run db:push
```

### Option B: Using MySQL Client

1. Get database credentials from Railway dashboard
2. Connect using MySQL client:
   ```bash
   mysql -h <host> -u <user> -p<password> <database>
   ```
3. Run the schema file:
   ```bash
   mysql -h <host> -u <user> -p<password> <database> < drizzle/schema.sql
   ```

### Option C: Using Drizzle Studio

```bash
# Install Drizzle Kit globally
npm install -g drizzle-kit

# Set DATABASE_URL environment variable
export DATABASE_URL="mysql://user:pass@host:3306/db"

# Push schema to database
drizzle-kit push:mysql
```

## Step 6: Deploy Application

1. Railway will automatically deploy when you push to GitHub
2. Or click "Deploy" in the Railway dashboard
3. Wait for build to complete (usually 2-5 minutes)
4. Railway will provide a public URL: `https://your-app-name.up.railway.app`

## Step 7: Verify Deployment

1. Visit your Railway URL
2. Check that the homepage loads
3. Try creating a test league
4. Verify database connection works

## Build Configuration

Railway uses the following configuration files:

### `railway.toml`
```toml
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install && pnpm run build"

[deploy]
startCommand = "node dist/index.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "pnpm"]

[phases.install]
cmds = ["pnpm install --frozen-lockfile"]

[phases.build]
cmds = ["pnpm run build"]

[start]
cmd = "node dist/index.js"
```

## Troubleshooting

### Build Fails

**Issue:** Build fails with "command not found"
**Solution:** Check that `pnpm` is installed in nixpacks.toml

**Issue:** Build fails with "module not found"
**Solution:** Run `pnpm install` locally and commit `pnpm-lock.yaml`

### Database Connection Fails

**Issue:** "ECONNREFUSED" or "Access denied"
**Solution:** 
1. Verify `DATABASE_URL` is set correctly
2. Check MySQL service is running in Railway
3. Ensure database is in the same Railway project

### Application Crashes

**Issue:** App crashes immediately after deployment
**Solution:**
1. Check Railway logs: Click on your service → Deployments → View logs
2. Common issues:
   - Missing environment variables
   - Database schema not initialized
   - Port binding issues (should use `process.env.PORT`)

### WebSocket Not Working

**Issue:** Real-time features don't work
**Solution:** Railway supports WebSockets by default, but ensure:
1. Your app listens on `0.0.0.0` (already fixed in code)
2. WebSocket connection uses the Railway domain

## Monitoring

### View Logs

```bash
# Using Railway CLI
railway logs

# Or in Railway dashboard
Service → Deployments → View logs
```

### Check Metrics

Railway dashboard shows:
- CPU usage
- Memory usage
- Network traffic
- Request count

## Updating the Application

### Automatic Deployment

Railway automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

### Manual Deployment

In Railway dashboard:
1. Go to your service
2. Click "Deploy"
3. Select the commit to deploy

## Database Backups

### Automatic Backups

Railway automatically backs up MySQL databases daily.

### Manual Backup

```bash
# Using Railway CLI
railway run mysqldump > backup.sql

# Or using MySQL client
mysqldump -h <host> -u <user> -p<password> <database> > backup.sql
```

## Custom Domain

### Add Custom Domain

1. Go to Railway dashboard → Your service
2. Click "Settings" → "Domains"
3. Click "Add Domain"
4. Enter your domain (e.g., `cannabisfantasyleague.com`)
5. Add the provided CNAME record to your DNS provider

### Update Environment Variables

After adding custom domain, update:

```bash
APP_URL=https://cannabisfantasyleague.com
```

## Cost Estimation

Railway pricing (as of 2024):

- **Hobby Plan**: $5/month
  - Includes $5 of usage credits
  - ~500 hours of runtime
  - Suitable for small leagues

- **Pro Plan**: $20/month
  - Includes $20 of usage credits
  - Priority support
  - Suitable for production

### Resource Usage

Estimated monthly cost for Cannabis Fantasy League:
- **Web Service**: ~$3-5/month
- **MySQL Database**: ~$2-3/month
- **Total**: ~$5-8/month (covered by Hobby plan)

## Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Use strong session secrets** - Generate with crypto.randomBytes
3. **Rotate API keys** - Change SendGrid key periodically
4. **Enable HTTPS** - Railway provides SSL automatically
5. **Set up monitoring** - Use Railway metrics and logs

## Support

### Railway Support
- Documentation: https://docs.railway.app
- Discord: https://discord.gg/railway
- Email: team@railway.app

### Application Issues
- GitHub Issues: https://github.com/justinhartfield/cannabis-fantasy-league/issues
- Check logs first: `railway logs`

## Next Steps

After successful deployment:

1. ✅ Test league creation
2. ✅ Verify email sending works
3. ✅ Test draft functionality
4. ✅ Check WebSocket real-time updates
5. ✅ Monitor logs for errors
6. ✅ Set up custom domain (optional)
7. ✅ Configure SendGrid verified sender
8. ✅ Add integration tests

## Rollback

If deployment fails:

```bash
# Using Railway CLI
railway rollback

# Or in Railway dashboard
Deployments → Select previous deployment → Redeploy
```

---

**🎉 Your Cannabis Fantasy League is now deployed on Railway!**

Visit your app at: `https://your-app-name.up.railway.app`
