# Firebase Service Account Setup Guide

## Step 1: Get Service Account JSON

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com/
   - Select your project: `thuranth`

2. **Navigate to Project Settings**
   - Click the gear icon ⚙️ next to "Project Overview"
   - Select "Project settings"

3. **Service Accounts Tab**
   - Click on "Service accounts" tab
   - You'll see "Firebase Admin SDK"

4. **Generate Private Key**
   - Click "Generate new private key"
   - Click "Generate key" in the popup
   - A JSON file will be downloaded

5. **Copy the JSON Content**
   - Open the downloaded JSON file
   - Copy the entire content
   - It should look like this:

```json
{
  "type": "service_account",
  "project_id": "thuranth",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@thuranth.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## Step 2: Enable Authentication Methods

1. **Go to Authentication**
   - In Firebase Console, click "Authentication" in sidebar
   - Click "Get started" if not already enabled

2. **Sign-in Method Tab**
   - Click "Sign-in method" tab
   - Enable these providers:

   **Email/Password:**
   - Click "Email/Password"
   - Toggle "Enable"
   - Click "Save"

   **Phone:**
   - Click "Phone"
   - Toggle "Enable" 
   - Click "Save"

## Step 3: Create Test Users

1. **Users Tab**
   - Click "Users" tab in Authentication
   - Click "Add user"

2. **Create These Users:**
   ```
   Email: admin@pdcp.com
   Password: Admin123!
   
   Email: dispatcher@pdcp.com  
   Password: Dispatch123!
   
   Email: driver1@pdcp.com
   Password: Driver123!
   ```

## Step 4: Mobile App Configuration (Optional for now)

If you want to test mobile authentication later:

1. **Add Android App**
   - In Project Settings, click "Add app" → Android icon
   - Package name: `com.pdcp.driver`
   - Download `google-services.json`

2. **Add iOS App**
   - Click "Add app" → iOS icon  
   - Bundle ID: `com.pdcp.driver`
   - Download `GoogleService-Info.plist`

## What to Provide Next

Please share the **Service Account JSON content** (from Step 1) so I can:
- Configure the backend Firebase Admin SDK
- Set up authentication verification
- Test the complete authentication flow
- Enable secure API access for all services

**Security Note:** Keep the Service Account JSON secure - it provides admin access to your Firebase project!