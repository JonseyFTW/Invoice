# Railway Deployment Guide

This guide walks you through deploying the Invoice Management System on Railway.

## Overview

The application consists of:
- **Backend**: Node.js/Express API (Port 5000)
- **Frontend**: React SPA served with static server (Port 3000)
- **Database**: PostgreSQL 15
- **Cache**: Redis

## Step 1: Railway Project Setup

1. Create a new Railway project
2. Connect your GitHub repository to Railway
3. You'll need to deploy multiple services:
   - PostgreSQL Database
   - Redis Cache
   - Backend API
   - Frontend App

## Step 2: Add Database Services

### PostgreSQL Database
1. In Railway dashboard, click "Add Service" → "Database" → "PostgreSQL"
2. Railway will automatically create a PostgreSQL instance
3. Note the connection details from the "Variables" tab

### Redis Cache
1. Click "Add Service" → "Database" → "Redis"
2. Railway will automatically create a Redis instance
3. Note the Redis URL from the "Variables" tab

## Step 3: Deploy Backend Service

1. Click "Add Service" → "GitHub Repo" → Select your repository
2. **IMPORTANT**: In the service settings, go to "Settings" → "Source" and set:
   - **Root Directory**: `backend`
3. Set the following build settings:
   - **Build Command**: `npm ci --only=production`  
   - **Start Command**: `npm run railway:start`

### Environment Variables:
```
NODE_ENV=production
PORT=5000
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASS=${{Postgres.PGPASSWORD}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=your-super-secret-jwt-key-change-this
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
GEMINI_API_KEY=your-gemini-api-key
COMPANY_NAME=Your Company Name
COMPANY_ADDRESS=123 Main St, City, State 12345
COMPANY_PHONE=(555) 123-4567
COMPANY_EMAIL=info@yourcompany.com
DEFAULT_TAX_RATE=8.25
FRONTEND_URL=${{Frontend.RAILWAY_STATIC_URL}}
```

### Networking:
- Railway will automatically assign a domain
- The service will be accessible via the generated Railway URL

## Step 4: Deploy Frontend Service

1. Click "Add Service" → "GitHub Repo" → Select your repository (create separate service)
2. **IMPORTANT**: In the service settings, go to "Settings" → "Source" and set:
   - **Root Directory**: `frontend`
3. Set the following build settings:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `serve -s build -l $PORT`

### Environment Variables:
```
NODE_ENV=production
PORT=3000
REACT_APP_API_URL=${{Backend.RAILWAY_STATIC_URL}}/api
REACT_APP_COMPANY_NAME=Your Company Name
```

## Step 5: Configure Service Dependencies

Ensure services start in the correct order:
1. PostgreSQL (starts automatically)
2. Redis (starts automatically)
3. Backend (depends on PostgreSQL and Redis)
4. Frontend (depends on Backend)

## Step 6: Domain Configuration

### Custom Domain (Optional):
1. In Railway dashboard, go to your Frontend service
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### Internal Service Communication:
- Backend will use Railway's internal networking
- Frontend connects to Backend via the Railway URL

## Environment Variables Reference

### Required Backend Variables:
- `JWT_SECRET`: Secure random string for JWT tokens
- `DB_*`: Database connection (auto-provided by Railway)
- `REDIS_URL`: Redis connection (auto-provided by Railway)
- `GMAIL_USER` & `GMAIL_PASS`: Gmail SMTP credentials
- `GEMINI_API_KEY`: Google AI API key for receipt parsing
- Company details for invoice generation

### Required Frontend Variables:
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_COMPANY_NAME`: Company name for branding

## Railway Settings Summary

### Networking:
- All services automatically get Railway domains
- Internal communication via service names
- HTTPS enabled by default

### Build:
- Nixpacks builder (automatic detection)
- Custom build commands specified in package.json
- Health checks configured for backend

### Deploy:
- Auto-deploy on git push (configurable)
- Zero-downtime deployments
- Rollback capability

### Config-as-Code:
- `railway.json` file in repository root
- Environment variables managed via Railway dashboard
- Service configuration in JSON format

### Feature Flags:
- Use Railway's environment variables for feature toggles
- Example: `FEATURE_AI_PARSING=true/false`

## Post-Deployment Steps

1. **Database Migration**: Backend will auto-run migrations on startup
2. **Health Checks**: Verify all services are healthy
3. **Test Features**: 
   - User registration/login
   - Invoice generation and PDF export
   - Email functionality
   - AI receipt parsing
4. **Monitor Logs**: Check Railway logs for any issues

## Troubleshooting

### Common Issues:

1. **Nixpacks Build Failed**: 
   - **Error**: "Nixpacks was unable to generate a build plan for this app"
   - **Solution**: Each service must point to its subdirectory. In Railway:
     - Go to service "Settings" → "Source" 
     - Set **Root Directory** to `backend` or `frontend`
     - This tells Nixpacks to look in the subdirectory where package.json exists

2. **Build Failures**: Check build logs and ensure all dependencies are in package.json

3. **Database Connection**: Verify environment variables match Railway's provided values

4. **CORS Issues**: Ensure FRONTEND_URL is set correctly in backend

5. **Email Issues**: Verify Gmail credentials and app passwords

6. **AI Parsing**: Check Gemini API key validity

### Logs:
- Access logs via Railway dashboard
- Backend logs show API requests and database operations
- Frontend logs show build process and runtime issues

## Cost Considerations

Railway pricing is based on:
- Resource usage (CPU, Memory, Network)
- Database storage
- Bandwidth

For production workloads, consider:
- Right-sizing your services
- Monitoring resource usage
- Using Railway's usage dashboard

## Security Notes

- All connections use HTTPS by default
- Database credentials are auto-generated and secure
- Store sensitive environment variables in Railway (not in code)
- Regularly rotate JWT secrets and API keys