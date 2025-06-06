#!/bin/bash

# Development startup script for Invoice Management System

echo "🚀 Starting Invoice Management System in Development Mode"
echo "========================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created. Please edit it with your configuration."
        echo "📝 Don't forget to set:"
        echo "   - Database credentials"
        echo "   - JWT_SECRET"
        echo "   - Gmail credentials"
        echo "   - Gemini API key"
        echo "   - Company information"
        echo ""
        echo "⏸️  Edit .env file and run this script again."
        exit 1
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🔧 Starting services with Docker Compose..."
echo ""

# Start services
docker-compose up -d

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
echo "=================="
docker-compose ps

echo ""
echo "🌐 Application URLs:"
echo "==================="
echo "Frontend:  http://localhost:3000"
echo "Backend:   http://localhost:5000"
echo "Database:  localhost:5432"
echo "Redis:     localhost:6379"

echo ""
echo "📋 Default Login Credentials:"
echo "============================="
echo "Email:     admin@example.com"
echo "Password:  changeme"
echo ""
echo "⚠️  Remember to change the default password after first login!"

echo ""
echo "📝 Useful Commands:"
echo "=================="
echo "View logs:           docker-compose logs -f"
echo "Stop services:       docker-compose down"
echo "Restart services:    docker-compose restart"
echo "Update containers:   docker-compose up -d --build"

echo ""
echo "✅ Development environment is ready!"
echo "🎉 Happy coding!"