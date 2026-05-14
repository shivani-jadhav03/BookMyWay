# Deployment Guide for BookMyWay

This guide will help you deploy your BookMyWay application to production.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Firebase project with Authentication enabled
- Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Options

### Option 1: Render.com (Recommended - Free Tier)

Render is a cloud platform that makes it easy to deploy web services. It offers a free tier for small applications.

#### Steps:

1. **Prepare your code**
   ```bash
   # Build the project locally first
   npm run build
   ```

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

3. **Create Render account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

4. **Create new Web Service**
   - Click "New +" button
   - Select "Web Service"
   - Connect your GitHub repository
   - Select the BookMyWay repository

5. **Configure Build & Deploy**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: `18` (or higher)

6. **Add Environment Variables**
   In Render dashboard, add these environment variables:
   ```
   FIREBASE_API_KEY=your_actual_api_key
   FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   FIREBASE_APP_ID=your_app_id
   ```

   For Firebase Admin, you'll need to:
   - Download service account key from Firebase Console > Project Settings > Service Accounts
   - Convert the entire JSON content to a single line and set as `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable
   - Example: `GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key":"...",...}`
   - Make sure to properly escape quotes and newlines when converting to a single line

7. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your application
   - You'll get a URL like `https://bookmyway.onrender.com`

### Option 2: Railway

Railway is another great option for deploying Node.js applications.

#### Steps:

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize project**
   ```bash
   railway init
   ```

4. **Add environment variables**
   ```bash
   railway variables set FIREBASE_API_KEY=your_key
   railway variables set FIREBASE_PROJECT_ID=your_project_id
   # Add all other Firebase variables
   ```

5. **Deploy**
   ```bash
   railway up
   ```

### Option 3: Vercel

Vercel is optimized for frontend but can handle Node.js backends.

#### Steps:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow the prompts** to configure your project

## Firebase Setup for Production

1. **Enable Authentication**
   - Go to Firebase Console
   - Enable Email/Password sign-in method

2. **Get Configuration**
   - Go to Project Settings > General
   - Copy your web app configuration

3. **Service Account Key**
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Download JSON file
   - For Render: Convert the entire JSON content to a single line and set as `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable
   - For Railway: Set as environment variable `GOOGLE_APPLICATION_CREDENTIALS_JSON` with the JSON content
   - Important: The firebaseAdminConfig.js file now reads from `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable

## Post-Deployment Checklist

- [ ] Test user signup/login
- [ ] Test admin dashboard access
- [ ] Test booking report download
- [ ] Verify all pages load correctly
- [ ] Check console for errors
- [ ] Test responsive design on mobile

## Troubleshooting

### Build Errors
- Ensure Node.js version is >= 18.0.0
- Check that all dependencies are installed
- Verify TypeScript compilation works locally

### Runtime Errors
- Check environment variables are set correctly
- Verify Firebase credentials are valid
- Check server logs for specific error messages

### Firebase Issues
- Ensure Authentication is enabled in Firebase Console
- Verify service account key has correct permissions
- Check Firebase project ID matches configuration

## Domain Configuration (Optional)

To use a custom domain:

1. **Purchase domain** (e.g., from Namecheap, GoDaddy)
2. **Configure DNS** to point to your deployment platform
3. **Add domain** in your deployment platform dashboard
4. **SSL certificate** will be automatically configured

## Monitoring

Most platforms provide:
- Server logs
- Error tracking
- Performance metrics
- Uptime monitoring

Check your platform's dashboard for these features.

## Support

For platform-specific issues:
- Render: https://render.com/docs
- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs

For Firebase issues:
- https://firebase.google.com/docs
- https://console.firebase.google.com
