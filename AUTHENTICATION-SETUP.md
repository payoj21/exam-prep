# Complete Setup Guide - Authentication, History, Leaderboard & Analytics

## 🎉 New Features Added

### ✅ **1. Authentication**
- Google Sign-In for Android & Web
- Apple Sign-In for iOS
- JWT-based authentication
- Secure session management

### ✅ **2. History Tab**
- View all past test attempts
- Filter by exam type
- Detailed statistics (score, time, accuracy)
- Quick stats dashboard

### ✅ **3. Leaderboard**
- Global rankings
- Filter by time period (All Time, Month, Week)
- Filter by exam type (JEE, NEET, SSC)
- Top 100 performers

### ✅ **4. Analytics**
- Subject-wise performance
- Topic-level strength analysis
- Progress over time graphs
- Difficulty-wise breakdown
- Accuracy trends

---

## 📋 Prerequisites

### New Dependencies Required:

1. **MongoDB Database**
   - For user data and test history
   - Options: MongoDB Atlas (cloud) or local MongoDB

2. **Google OAuth Credentials**
   - For Google Sign-In
   - Get from Google Cloud Console

3. **Apple Developer Account** (for iOS only)
   - For Apple Sign-In
   - Optional for web/Android

---

## 🗄️ Step 1: MongoDB Setup

### Option A: MongoDB Atlas (Cloud - Recommended)

1. **Create Account**
   ```
   Go to: https://www.mongodb.com/cloud/atlas
   Click: "Try Free"
   Sign up with email
   ```

2. **Create Cluster**
   ```
   1. Choose: FREE tier (M0)
   2. Select: Cloud provider & region
   3. Click: "Create Cluster"
   4. Wait 3-5 minutes for deployment
   ```

3. **Get Connection String**
   ```
   1. Click: "Connect" on your cluster
   2. Choose: "Connect your application"
   3. Copy connection string:
      mongodb+srv://username:<password>@cluster.mongodb.net/examplatform
   4. Replace <password> with your actual password
   ```

4. **Whitelist IP Address**
   ```
   1. Go to: "Network Access"
   2. Click: "Add IP Address"
   3. Choose: "Allow Access from Anywhere" (for development)
   4. Or add your specific IP
   ```

5. **Create Database User**
   ```
   1. Go to: "Database Access"
   2. Click: "Add New Database User"
   3. Create username and password
   4. Save credentials
   ```

### Option B: Local MongoDB

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows
# Download from: https://www.mongodb.com/try/download/community
# Install and start MongoDB service
```

**Connection String for local:**
```
mongodb://localhost:27017/examplatform
```

---

## 🔐 Step 2: Google OAuth Setup

### 1. Go to Google Cloud Console
```
https://console.cloud.google.com/
```

### 2. Create New Project
```
1. Click: "Select a project" dropdown
2. Click: "New Project"
3. Name: "Exam Platform"
4. Click: "Create"
```

### 3. Enable Google+ API
```
1. Go to: APIs & Services → Library
2. Search: "Google+ API"
3. Click: "Enable"
```

### 4. Create OAuth Credentials

**For Web:**
```
1. Go to: APIs & Services → Credentials
2. Click: "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Exam Platform Web"
5. Authorized JavaScript origins:
   - http://localhost:3000
   - https://your-production-domain.com
6. Authorized redirect URIs:
   - http://localhost:3000
   - https://your-production-domain.com
7. Click: "Create"
8. Copy: Client ID (looks like: 123456789-abc.apps.googleusercontent.com)
```

**For Android:**
```
1. Create Credentials → OAuth client ID
2. Application type: "Android"
3. Package name: com.examplatform.android
4. Get SHA-1 certificate fingerprint:

   # Debug (for development)
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # Release (for production)
   keytool -list -v -keystore /path/to/your/release.keystore -alias your-alias

5. Paste SHA-1 fingerprint
6. Click: "Create"
```

**For iOS:**
```
1. Create Credentials → OAuth client ID
2. Application type: "iOS"
3. Bundle ID: com.examplatform.ios
4. Click: "Create"
```

---

## 🍎 Step 3: Apple Sign-In Setup (iOS Only)

### 1. Apple Developer Account
```
https://developer.apple.com/account/
- Join Apple Developer Program ($99/year)
- Or use existing account
```

### 2. Configure App ID
```
1. Go to: Certificates, Identifiers & Profiles
2. Click: Identifiers → App IDs
3. Click: "+" to create new
4. Select: App
5. Description: "Exam Platform"
6. Bundle ID: com.examplatform.ios
7. Enable: "Sign in with Apple"
8. Click: "Continue" → "Register"
```

### 3. Create Service ID
```
1. Identifiers → Services IDs
2. Click: "+"
3. Description: "Exam Platform Service"
4. Identifier: com.examplatform.service
5. Enable: "Sign in with Apple"
6. Configure:
   - Primary App ID: Select your app
   - Domains: your-domain.com
   - Return URLs: https://your-domain.com/auth/apple/callback
7. Click: "Save"
```

### 4. Get Keys
```
1. Keys → "+"
2. Name: "Sign in with Apple Key"
3. Enable: "Sign in with Apple"
4. Configure: Select your App ID
5. Click: "Continue" → "Register"
6. Download .p8 file (SAVE THIS - can't download again!)
7. Note the Key ID
```

---

## ⚙️ Step 4: Configure Environment Variables

Update your `.env` file:

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here

# Server
PORT=3000

# MongoDB
# Use MongoDB Atlas connection string or local
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/examplatform

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-random-string-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com

# Apple Sign In (iOS only)
APPLE_SERVICE_ID=com.examplatform.service
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY_PATH=./AuthKey_KEYID.p8
```

### Generate JWT Secret
```bash
# macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🚀 Step 5: Install Dependencies

```bash
cd your-project-folder

# Install new dependencies
npm install

# New packages added:
# - mongoose (MongoDB ODM)
# - google-auth-library (Google OAuth)
# - jsonwebtoken (JWT authentication)
# - bcryptjs (password hashing - for future use)
```

---

## 🏃 Step 6: Run the Application

### Start Backend
```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start

# You should see:
# 🚀 Server running on http://localhost:3000
# 📚 Exam Platform API with Auth ready
# ✅ MongoDB connected
```

### Verify Backend
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Should return:
# {"status":"ok","message":"Server is running"}
```

---

## 🌐 Step 7: Update Frontend

### Update Google Client ID

Edit `public/index-with-features.html`:

```javascript
// Find this line (around line 400)
client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

// Replace with your actual Google Client ID
client_id: '123456789-abc.apps.googleusercontent.com',
```

---

## 📱 Step 8: Mobile App Setup

### Android

**Update `androidApp/build.gradle.kts`:**

```kotlin
defaultConfig {
    // ... existing config
    
    // Add Google Sign-In
    manifestPlaceholders["googleClientId"] = "YOUR_GOOGLE_CLIENT_ID"
}

dependencies {
    // ... existing dependencies
    
    // Add Google Sign-In
    implementation("com.google.android.gms:play-services-auth:20.7.0")
}
```

**Update `AndroidManifest.xml`:**

```xml
<application>
    <!-- Add this -->
    <meta-data
        android:name="com.google.android.gms.auth.api.signin.GoogleSignInOptions"
        android:value="@string/default_web_client_id" />
</application>
```

### iOS

**Update `iosApp/Info.plist`:**

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.YOUR-CLIENT-ID</string>
        </array>
    </dict>
</array>

<!-- Apple Sign In -->
<key>UIApplicationSceneManifest</key>
<dict>
    <key>UIApplicationSupportsMultipleScenes</key>
    <true/>
</dict>
```

---

## 🧪 Step 9: Test the Features

### 1. Test Authentication
```
1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Complete Google sign-in flow
4. You should see the main app
```

### 2. Take a Test
```
1. Click "Practice" tab
2. Generate and complete a test
3. Submit the test
```

### 3. View History
```
1. Click "History" tab
2. You should see your completed test
3. Stats should update
```

### 4. Check Leaderboard
```
1. Click "Leaderboard" tab
2. You should see rankings
3. Try different filters
```

### 5. View Analytics
```
1. Click "Analytics" tab
2. View subject performance
3. Check topic strengths
4. See progress over time
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Error: "MongoNetworkError"**
```bash
# Solution 1: Check connection string
# Make sure password is URL-encoded
# Replace special characters: @ → %40, # → %23

# Solution 2: Check IP whitelist
# Go to MongoDB Atlas → Network Access
# Add your current IP or allow all (0.0.0.0/0)

# Solution 3: Test connection
mongosh "mongodb+srv://cluster.mongodb.net/examplatform" --username youruser
```

### Google Sign-In Issues

**Error: "Invalid client ID"**
```
Solution:
1. Double-check Client ID in frontend code
2. Ensure authorized origins are correct
3. Make sure origin matches exactly (http:// vs https://)
```

**Error: "Redirect URI mismatch"**
```
Solution:
1. Go to Google Cloud Console
2. Check authorized redirect URIs
3. Add exact URL where your app is running
```

### Apple Sign-In Issues

**Error: "Invalid configuration"**
```
Solution:
1. Check Service ID is correct
2. Verify domains and return URLs
3. Ensure .p8 key file is accessible
```

---

## 🔒 Security Best Practices

### Production Checklist

- [ ] Change JWT_SECRET to a strong random string
- [ ] Use environment variables (never commit secrets)
- [ ] Enable MongoDB authentication
- [ ] Restrict MongoDB IP whitelist
- [ ] Use HTTPS for production
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Enable CORS properly
- [ ] Add error monitoring (Sentry)
- [ ] Regular security audits

---

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  name: String,
  authProvider: "google" | "apple",
  providerId: String,
  createdAt: Date,
  lastLogin: Date
}
```

### Attempts Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  examType: String,
  subjects: [String],
  difficulty: String,
  questions: [{
    id: String,
    subject: String,
    topic: String,
    correctAnswer: Number,
    userAnswer: Number,
    isCorrect: Boolean
  }],
  score: Number,
  maxScore: Number,
  correct: Number,
  incorrect: Number,
  unanswered: Number,
  timeTaken: Number,
  completedAt: Date
}
```

### TopicStrengths Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  examType: String,
  subject: String,
  topicBreakdown: [{
    topic: String,
    correct: Number,
    total: Number,
    accuracy: Number
  }],
  lastUpdated: Date
}
```

---

## 🎯 API Endpoints Reference

### Authentication
```
POST   /api/auth/google        - Google sign-in
POST   /api/auth/apple         - Apple sign-in
GET    /api/auth/me            - Get current user
```

### Exam
```
POST   /api/generate-questions - Generate questions (requires auth)
```

### History
```
POST   /api/attempts           - Submit test attempt
GET    /api/attempts           - Get user's attempts
GET    /api/attempts/:id       - Get specific attempt
```

### Leaderboard
```
GET    /api/leaderboard        - Get rankings
       ?period=all|month|week
       &examType=jee|neet|ssc
```

### Analytics
```
GET    /api/analytics          - Get user analytics
       ?examType=jee|neet|ssc
```

---

## 🚀 Deployment Updates

When deploying with new features:

### Environment Variables on Platform

**Railway:**
```bash
railway variables set MONGODB_URI="your-connection-string"
railway variables set JWT_SECRET="your-jwt-secret"
railway variables set GOOGLE_CLIENT_ID="your-client-id"
```

**Render:**
```
Go to: Service → Environment
Add each variable manually
```

**Heroku:**
```bash
heroku config:set MONGODB_URI="your-connection-string"
heroku config:set JWT_SECRET="your-jwt-secret"
heroku config:set GOOGLE_CLIENT_ID="your-client-id"
```

---

## ✅ Success Checklist

- [ ] MongoDB connected successfully
- [ ] Google OAuth configured
- [ ] Google Sign-In working on web
- [ ] User can sign in
- [ ] Test attempt saves to database
- [ ] History tab shows past attempts
- [ ] Leaderboard displays rankings
- [ ] Analytics shows performance data
- [ ] Mobile apps authenticate correctly
- [ ] All features work end-to-end

---

## 🎉 You're All Set!

Your exam platform now includes:
✅ Authentication (Google & Apple)
✅ Persistent user data
✅ Complete test history
✅ Global leaderboards
✅ Detailed analytics
✅ Topic-level insights

**Ready for production! 🚀**
