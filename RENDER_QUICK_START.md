# Render Quick Start - Step by Step

Follow these steps exactly to deploy your Cannabis Fantasy League app to Render.

## Before You Start

**Time needed:** 15-20 minutes

**You'll need:**
- GitHub account (you have this)
- SendGrid account with new API key
- Email address for notifications

---

## Step 1: Get a New SendGrid API Key (5 minutes)

Your old API key was exposed and needs to be replaced.

1. Go to https://app.sendgrid.com/settings/api_keys
2. Find your old key (if you remember the name) and click "Delete"
3. Click "Create API Key"
4. Name it: `Cannabis Fantasy League - Render`
5. Choose "Restricted Access"
6. Enable only: **Mail Send** → Full Access
7. Click "Create & View"
8. **COPY THE KEY NOW** (starts with `SG.`) - you won't see it again!
9. Save it somewhere safe temporarily (you'll paste it into Render soon)

---

## Step 2: Create Render Account (2 minutes)

1. Go to https://render.com
2. Click "Get Started for Free"
3. Click "Sign up with GitHub"
4. Authorize Render to access your GitHub account
5. You'll be taken to the Render Dashboard

---

## Step 3: Create MySQL Database (3 minutes)

1. From Render Dashboard, click the blue "New +" button (top right)
2. Select "MySQL"
3. Fill in the form:
   - **Name:** `cannabis-fantasy-league-db`
   - **Database:** `cannabis_fantasy_league`
   - **User:** (leave auto-generated)
   - **Region:** Oregon (or closest to you)
   - **MySQL Version:** 8.0 (default)
   - **Plan:** Free
4. Click "Create Database"
5. Wait 1-2 minutes for it to be created
6. You'll see "Available" when ready
7. **Keep this tab open** - you'll need it in Step 5

---

## Step 4: Create Web Service (5 minutes)

1. Click the blue "New +" button again
2. Select "Web Service"
3. You'll see "Connect a repository"

**If this is your first time:**
4. Click "Connect GitHub"
5. Authorize Render
6. You'll see a list of your repositories

**Connect your repository:**
7. Find `justinhartfield/cannabis-fantasy-league`
8. Click "Connect"

**Configure the service:**
9. Fill in the form:
   - **Name:** `cannabis-fantasy-league`
   - **Region:** Oregon (same as database!)
   - **Branch:** `main`
   - **Root Directory:** (leave blank)
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Plan:** Free

10. **Don't click "Create Web Service" yet!** Scroll down to environment variables first.

---

## Step 5: Set Environment Variables (5 minutes)

Still on the "Create Web Service" page, scroll to "Environment Variables" section.

**Add these variables one by one:**

### Variable 1: NODE_ENV
- Click "Add Environment Variable"
- Key: `NODE_ENV`
- Value: `production`

### Variable 2: DATABASE_URL
- Click "Add Environment Variable"
- Key: `DATABASE_URL`
- **Important:** Click the "Add from Database" button (looks like a database icon)
- Select your database: `cannabis-fantasy-league-db`
- Select: "Internal Database URL" (more secure and faster)
- It will auto-populate with: `${{cannabis-fantasy-league-db.DATABASE_URL}}`

### Variable 3: SESSION_SECRET
- Click "Add Environment Variable"
- Key: `SESSION_SECRET`
- Click "Generate" button (Render will create a random secure value)
- Or paste your own random 32+ character string

### Variable 4: SENDGRID_API_KEY
- Click "Add Environment Variable"
- Key: `SENDGRID_API_KEY`
- Value: Paste the API key you got in Step 1 (starts with `SG.`)

### Variable 5: SENDGRID_FROM_EMAIL
- Click "Add Environment Variable"
- Key: `SENDGRID_FROM_EMAIL`
- Value: Your verified sender email (e.g., `noreply@yourdomain.com`)

### Variable 6: APP_URL
- Click "Add Environment Variable"
- Key: `APP_URL`
- Value: `https://cannabis-fantasy-league.onrender.com`
- (You can update this later if you want a different name)

**Double-check all 6 variables are set correctly!**

---

## Step 6: Deploy! (5-10 minutes)

1. Scroll to the bottom
2. Click "Create Web Service"
3. Render will start building your app
4. You'll see the deployment logs in real-time

**What you'll see:**
- "Build started"
- "Installing dependencies" (npm install)
- "Building application" (npm run build)
- "Build succeeded"
- "Starting service" (npm run start)
- "Service is live"

**If it fails:** Check the logs for errors and verify all environment variables are set correctly.

**When successful:** You'll see "Your service is live" with a green checkmark.

---

## Step 7: Initialize Database (2 minutes)

After the first successful deployment, you need to create the database tables.

### Option A: Using Render Shell (Easiest)

1. In your web service page, click "Shell" in the left sidebar
2. Wait for the shell to connect
3. Type this command and press Enter:
   ```bash
   npm run db:push
   ```
4. Wait for it to complete (you'll see "Tables created successfully" or similar)
5. Type `exit` and press Enter

### Option B: Temporary Build Command

1. Go to your web service settings
2. Find "Build Command"
3. Change it to: `npm install && npm run build && npm run db:push`
4. Click "Save Changes" (this triggers a redeploy)
5. Wait for deployment to complete
6. Go back to settings and change Build Command back to: `npm install && npm run build`
7. Save again

**You only need to do this ONCE!**

---

## Step 8: Test Your App! (5 minutes)

1. Click on your service URL (e.g., `https://cannabis-fantasy-league.onrender.com`)
2. You should see the Cannabis Fantasy League homepage
3. Try these tests:

**Test 1: Create Account**
- Click "Sign Up"
- Create a test account
- Verify you can log in

**Test 2: Create League**
- Click "Create League"
- Fill in league details
- Click "Create"
- Verify league is created

**Test 3: Send Invitation**
- In your league, try to invite someone
- Check if email is sent (check SendGrid dashboard)

**Test 4: Draft System**
- Try to start a draft
- Verify WebSocket connection works

---

## Troubleshooting

### Build Fails

**Check:**
- Are all dependencies in package.json?
- Does `npm run build` work locally?
- Check build logs for specific errors

**Fix:**
- Review the error in deployment logs
- Make fixes locally
- Push to GitHub
- Render auto-deploys on push

### App Crashes on Start

**Check:**
- Are all 6 environment variables set?
- Is DATABASE_URL using "Add from Database" (not typed manually)?
- Check deployment logs for error messages

**Fix:**
- Verify DATABASE_URL is `${{cannabis-fantasy-league-db.DATABASE_URL}}`
- Verify all other variables are correct
- Click "Manual Deploy" → "Clear build cache & deploy"

### Database Connection Error

**Check:**
- Is database status "Available"?
- Is DATABASE_URL set correctly?
- Are database and web service in the same region?

**Fix:**
- Go to database settings
- Copy the "Internal Connection String"
- Update DATABASE_URL variable in web service
- Redeploy

### Email Not Sending

**Check:**
- Is SENDGRID_API_KEY correct?
- Is sender email verified in SendGrid?
- Check SendGrid Activity Feed

**Fix:**
- Verify API key has "Mail Send" permission
- Verify sender email in SendGrid dashboard
- Check SendGrid error logs

### Cold Start (App Slow to Load)

**This is normal on free tier!**
- App sleeps after 15 minutes of inactivity
- First request takes 30-60 seconds to wake up
- Subsequent requests are instant

**Fix:**
- Upgrade to $7/month plan to keep app always running
- Or just wait the 30-60 seconds on first load

---

## What's Next?

### Immediate:
- ✅ Test all features thoroughly
- ✅ Invite friends to test
- ✅ Monitor deployment logs for errors

### Soon:
- 🔧 Set up custom domain (optional)
- 🔧 Configure SendGrid sender authentication for better deliverability
- 🔧 Set up monitoring and alerts

### When Ready:
- 💰 Upgrade to $7/month plan to eliminate cold starts
- 💰 Or upgrade database for more storage
- 💰 Or migrate to DigitalOcean for production ($20/month)

---

## Your App is Live! 🎉

**URL:** https://cannabis-fantasy-league.onrender.com
(or whatever name you chose)

**Dashboard:** https://dashboard.render.com

**Logs:** Click on your service → "Logs" tab

**Metrics:** Click on your service → "Metrics" tab

---

## Need Help?

- **Render Docs:** https://render.com/docs
- **Render Community:** https://community.render.com
- **Status Page:** https://status.render.com

---

## Summary Checklist

- [ ] Got new SendGrid API key
- [ ] Created Render account
- [ ] Created MySQL database
- [ ] Created web service
- [ ] Set all 6 environment variables
- [ ] Deployed successfully
- [ ] Initialized database (ran db:push)
- [ ] Tested app in browser
- [ ] Verified league creation works
- [ ] Verified email sending works
- [ ] Verified draft system works

**All done? Congratulations! Your app is live! 🚀**
