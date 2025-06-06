#!/bin/bash

echo "🔍 Docker Troubleshooting Script"
echo "================================="

echo ""
echo "1️⃣ Checking Docker status..."
if docker --version > /dev/null 2>&1; then
    echo "✅ Docker is installed: $(docker --version)"
else
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

echo ""
echo "2️⃣ Checking Docker daemon..."
if docker info > /dev/null 2>&1; then
    echo "✅ Docker daemon is running"
else
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

echo ""
echo "3️⃣ Checking .env file..."
if [ -f .env ]; then
    echo "✅ .env file exists"
    echo "📋 Key variables:"
    grep -E "^(NODE_ENV|DB_|JWT_SECRET|GMAIL_)" .env | head -5
else
    echo "❌ .env file missing"
    if [ -f .env.example ]; then
        echo "📝 Creating .env from .env.example..."
        cp .env.example .env
        echo "⚠️  Please edit .env with your configuration before running docker-compose"
    fi
fi

echo ""
echo "4️⃣ Checking required files..."
files=("docker-compose.yml" "backend/Dockerfile" "frontend/Dockerfile" "backend/package.json" "frontend/package.json")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "5️⃣ Checking Docker Compose..."
if docker-compose --version > /dev/null 2>&1; then
    echo "✅ Docker Compose is available: $(docker-compose --version)"
elif docker compose version > /dev/null 2>&1; then
    echo "✅ Docker Compose (V2) is available: $(docker compose version)"
    echo "💡 Use 'docker compose' instead of 'docker-compose'"
else
    echo "❌ Docker Compose is not available"
fi

echo ""
echo "6️⃣ Cleaning up any existing containers..."
docker-compose down --remove-orphans 2>/dev/null
docker compose down --remove-orphans 2>/dev/null

echo ""
echo "7️⃣ Testing Docker Compose file..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml is valid"
elif docker compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml is valid (V2)"
else
    echo "❌ docker-compose.yml has errors"
    echo "🔍 Running validation..."
    docker-compose config 2>&1 || docker compose config 2>&1
fi

echo ""
echo "8️⃣ Checking available disk space..."
df -h . | head -2

echo ""
echo "🏁 Troubleshooting Summary:"
echo "=========================="
echo "If all checks pass, try running:"
echo "  docker-compose up -d --build"
echo "or"  
echo "  docker compose up -d --build"
echo ""
echo "If you see errors, please share the full output!"