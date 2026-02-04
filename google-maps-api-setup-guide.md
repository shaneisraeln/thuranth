# 🗺️ Google Maps API Setup Guide - Step by Step

## Step 1: Go to Google Cloud Console

1. **Open your web browser**
2. **Navigate to**: https://console.cloud.google.com/
3. **Sign in** with your Google account (same one you used for Firebase if possible)

## Step 2: Create or Select a Project

### Option A: Create New Project
1. Click **"Select a project"** dropdown at the top
2. Click **"NEW PROJECT"**
3. **Project name**: `PDCP-Maps` (or any name you prefer)
4. **Organization**: Leave as default
5. Click **"CREATE"**
6. Wait for project creation (30-60 seconds)

### Option B: Use Existing Project
1. Click **"Select a project"** dropdown
2. Choose your existing project (like `thuranth` if you want to keep everything together)

## Step 3: Enable Required APIs

1. **In the left sidebar**, click **"APIs & Services"** → **"Library"**
2. **Search and enable these 4 APIs** (one by one):

### API 1: Maps JavaScript API
- Search: `Maps JavaScript API`
- Click on it
- Click **"ENABLE"**
- Wait for it to enable

### API 2: Directions API
- Search: `Directions API`
- Click on it
- Click **"ENABLE"**
- Wait for it to enable

### API 3: Distance Matrix API
- Search: `Distance Matrix API`
- Click on it
- Click **"ENABLE"**
- Wait for it to enable

### API 4: Geocoding API
- Search: `Geocoding API`
- Click on it
- Click **"ENABLE"**
- Wait for it to enable

## Step 4: Create API Key

1. **Go to**: APIs & Services → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"API key"**
4. **Copy the API key** that appears (it looks like: `AIzaSyC...`)
5. Click **"CLOSE"** (don't restrict it yet)

## Step 5: Configure API Key Restrictions (Important for Security)

1. **In the Credentials page**, find your newly created API key
2. Click the **pencil icon** (Edit) next to your API key
3. **API key name**: Change to `PDCP-Maps-Key`

### Application Restrictions:
4. Select **"HTTP referrers (web sites)"**
5. **Add these referrers**:
   ```
   http://localhost:3000/*
   http://localhost:8080/*
   https://your-domain.com/*
   ```
   (Replace `your-domain.com` with your actual domain if you have one)

### API Restrictions:
6. Select **"Restrict key"**
7. **Check these APIs**:
   - ✅ Maps JavaScript API
   - ✅ Directions API
   - ✅ Distance Matrix API
   - ✅ Geocoding API

8. Click **"SAVE"**

## Step 6: Enable Billing (Required for Production)

⚠️ **Important**: Google Maps requires billing to be enabled, but you get $200 free credits per month.

1. **Go to**: Billing in the left sidebar
2. **Link a billing account** or create a new one
3. **Add a payment method** (credit/debit card)
4. **Don't worry**: You get $200 free usage per month, which is plenty for development and testing

## Step 7: Test Your API Key

1. **Copy your API key** (from Step 4)
2. **Open this URL** in your browser (replace `YOUR_API_KEY` with your actual key):
   ```
   https://maps.googleapis.com/maps/api/geocode/json?address=Mumbai,India&key=YOUR_API_KEY
   ```
3. **You should see JSON response** with Mumbai's coordinates
4. **If you see an error**, check that:
   - Billing is enabled
   - APIs are enabled
   - API key is correct

## Step 8: Provide the API Key

**Copy your API key** and paste it here. It should look like:
```
AIzaSyC4E6Ac02_example_key_here_xyz123
```

## 🔒 Security Best Practices

✅ **API Key Restrictions**: Always restrict your API keys
✅ **Billing Alerts**: Set up billing alerts to monitor usage
✅ **Environment Variables**: Never commit API keys to code
✅ **Regular Rotation**: Rotate API keys periodically

## 💰 Cost Information

- **Free Tier**: $200 credit per month
- **Typical Usage**: Development/testing uses ~$5-20/month
- **Production**: Depends on traffic, usually $50-200/month for logistics apps

## 🚨 Troubleshooting

### "This API project is not authorized to use this API"
- **Solution**: Make sure you enabled all 4 APIs in Step 3

### "The provided API key is expired"
- **Solution**: Create a new API key

### "REQUEST_DENIED"
- **Solution**: Enable billing and check API restrictions

### "OVER_QUERY_LIMIT"
- **Solution**: Check billing account and increase quotas if needed

## 📋 Summary Checklist

Before providing the API key, make sure you completed:

- [ ] Created/selected Google Cloud project
- [ ] Enabled Maps JavaScript API
- [ ] Enabled Directions API  
- [ ] Enabled Distance Matrix API
- [ ] Enabled Geocoding API
- [ ] Created API key
- [ ] Set up API key restrictions
- [ ] Enabled billing account
- [ ] Tested API key with sample request

Once you provide the API key, I'll configure it in the PDCP system and we can start all the services! 🚀