#!/bin/bash

# Production startup script for Invoice Management System

echo "🚀 Starting Invoice Management System in Production Mode"
echo "=========================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it with production values."
    echo "📋 Required environment variables:"
    echo "   - NODE_ENV=production"
    echo "   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS"
    echo "   - JWT_SECRET (minimum 32 characters)"
    echo "   - GMAIL_USER, GMAIL_PASS"
    echo "   - GEMINI_API_KEY"
    echo "   - Company information"
    echo "   - FRONTEND_URL (your domain)"
    exit 1
fi

# Source environment variables
source .env

# Validate critical environment variables
if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
    echo "❌ JWT_SECRET must be at least 32 characters long"
    exit 1
fi

if [ -z "$DB_PASS" ]; then
    echo "❌ DB_PASS is required"
    exit 1
fi

if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  NODE_ENV is not set to 'production'"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if SSL certificates exist (if HTTPS is configured)
if [ ! -z "$FRONTEND_URL" ] && [[ "$FRONTEND_URL" == https* ]]; then
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        echo "⚠️  HTTPS configured but SSL certificates not found in nginx/ssl/"
        echo "📋 Please ensure you have:"
        echo "   - nginx/ssl/cert.pem"
        echo "   - nginx/ssl/key.pem"
        echo ""
        echo "💡 For Let's Encrypt:"
        echo "   sudo certbot certonly --standalone -d yourdomain.com"
        echo "   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem"
        echo "   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem"
    fi
fi

echo "🔧 Starting production services..."
echo ""

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose pull

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 15

# Check service health
echo ""
echo "🏥 Health Check:"
echo "================"

# Check backend health
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Backend: Healthy"
else
    echo "❌ Backend: Unhealthy"
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: Healthy"
else
    echo "❌ Frontend: Unhealthy"
fi

# Check database connection
if docker-compose exec -T db pg_isready -U ${DB_USER:-postgres} > /dev/null 2>&1; then
    echo "✅ Database: Connected"
else
    echo "❌ Database: Connection failed"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis: Connected"
else
    echo "❌ Redis: Connection failed"
fi

echo ""
echo "📊 Service Status:"
echo "=================="
docker-compose ps

echo ""
echo "📝 Production Monitoring:"
echo "========================"
echo "View logs:            docker-compose logs -f"
echo "Backend logs:         docker-compose logs -f backend"
echo "Frontend logs:        docker-compose logs -f frontend"
echo "Database logs:        docker-compose logs -f db"
echo "Health check:         curl http://localhost:5000/api/health"

if [ ! -z "$FRONTEND_URL" ]; then
    echo ""
    echo "🌐 Application URL: $FRONTEND_URL"
else
    echo ""
    echo "🌐 Application URLs:"
    echo "Frontend:  http://localhost:3000"
    echo "Backend:   http://localhost:5000"
fi

echo ""
echo "🛡️  Security Reminders:"
echo "======================="
echo "- Change default admin password"
echo "- Regularly update dependencies"
echo "- Monitor logs for suspicious activity"
echo "- Backup database regularly"
echo "- Keep SSL certificates updated"

echo ""
echo "✅ Production environment is running!"