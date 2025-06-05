#!/bin/bash

# Invoice Management System - Production Deployment Script
# This script automates the deployment process for production environments

set -e  # Exit on any error

# Configuration
APP_NAME="invoice-management"
APP_DIR="/opt/${APP_NAME}"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/${APP_NAME}-deploy.log"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    # Check if user can run docker commands
    if ! docker ps &> /dev/null; then
        error "Cannot run Docker commands. Please add user to docker group or check Docker daemon."
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Create backup of current deployment
create_backup() {
    if [ -d "$APP_DIR" ]; then
        log "Creating backup of current deployment..."
        
        local backup_name="${APP_NAME}-backup-$(date +%Y%m%d-%H%M%S)"
        local backup_path="${BACKUP_DIR}/${backup_name}"
        
        # Create backup directory
        sudo mkdir -p "$BACKUP_DIR"
        sudo chown $USER:$USER "$BACKUP_DIR"
        
        # Create application backup
        mkdir -p "$backup_path"
        
        # Backup environment file
        if [ -f "${APP_DIR}/${ENV_FILE}" ]; then
            cp "${APP_DIR}/${ENV_FILE}" "${backup_path}/"
        fi
        
        # Backup docker-compose file
        if [ -f "${APP_DIR}/${DOCKER_COMPOSE_FILE}" ]; then
            cp "${APP_DIR}/${DOCKER_COMPOSE_FILE}" "${backup_path}/"
        fi
        
        # Create database backup
        if docker ps | grep -q "${APP_NAME}-db"; then
            log "Creating database backup..."
            docker exec "${APP_NAME}-db-1" pg_dumpall -U postgres > "${backup_path}/database-backup.sql" || true
        fi
        
        # Backup uploaded files
        if [ -d "${APP_DIR}/uploads" ]; then
            cp -r "${APP_DIR}/uploads" "${backup_path}/"
        fi
        
        log "Backup created at: $backup_path"
        echo "$backup_path" > /tmp/last_backup_path
    else
        log "No existing deployment found, skipping backup"
    fi
}

# Clone or update repository
update_code() {
    log "Updating application code..."
    
    if [ ! -d "$APP_DIR" ]; then
        log "Cloning repository..."
        sudo mkdir -p "$APP_DIR"
        sudo chown $USER:$USER "$APP_DIR"
        
        # Clone repository
        git clone "${GIT_REPO_URL:-https://github.com/yourusername/invoice-management.git}" "$APP_DIR"
    else
        log "Updating existing repository..."
        cd "$APP_DIR"
        
        # Stash any local changes
        git stash
        
        # Pull latest changes
        git pull origin main
        
        # Clean up any untracked files
        git clean -fd
    fi
    
    cd "$APP_DIR"
    log "Code updated successfully"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    cd "$APP_DIR"
    
    # Copy environment file if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example "$ENV_FILE"
            warning "Environment file created from example. Please configure it before continuing."
            warning "Edit $APP_DIR/$ENV_FILE with your production settings."
            
            # Prompt user to continue
            read -p "Press Enter after configuring the environment file..."
        else
            error "No environment template found. Please create $ENV_FILE manually."
            exit 1
        fi
    fi
    
    # Validate environment file
    if ! grep -q "NODE_ENV=production" "$ENV_FILE"; then
        warning "NODE_ENV is not set to production in $ENV_FILE"
    fi
    
    # Check for required environment variables
    required_vars=("DB_PASS" "JWT_SECRET" "GMAIL_USER" "GMAIL_PASS")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE"; then
            error "Required environment variable $var not found in $ENV_FILE"
            exit 1
        fi
    done
    
    log "Environment setup completed"
}

# Build and deploy application
deploy_application() {
    log "Deploying application..."
    
    cd "$APP_DIR"
    
    # Stop existing containers
    if docker-compose ps | grep -q "Up"; then
        log "Stopping existing containers..."
        docker-compose down
    fi
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose pull
    
    # Build custom images
    log "Building application images..."
    docker-compose build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Check service health
    check_service_health
    
    log "Application deployed successfully"
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/health &> /dev/null; then
            log "Health check passed"
            return 0
        fi
        
        info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    cd "$APP_DIR"
    
    # Wait for database to be ready
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T backend npm run migrate &> /dev/null; then
            log "Database migrations completed successfully"
            return 0
        fi
        
        info "Migration attempt $attempt/$max_attempts failed, retrying..."
        sleep 5
        ((attempt++))
    done
    
    error "Database migrations failed after $max_attempts attempts"
    return 1
}

# Setup SSL certificates
setup_ssl() {
    if [ -n "$DOMAIN_NAME" ]; then
        log "Setting up SSL certificates for $DOMAIN_NAME..."
        
        # Check if certbot is installed
        if command -v certbot &> /dev/null; then
            # Stop nginx temporarily
            docker-compose stop nginx
            
            # Obtain certificate
            sudo certbot certonly --standalone -d "$DOMAIN_NAME" --non-interactive --agree-tos --email "$SSL_EMAIL"
            
            # Copy certificates to nginx directory
            sudo mkdir -p "${APP_DIR}/nginx/ssl"
            sudo cp "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" "${APP_DIR}/nginx/ssl/cert.pem"
            sudo cp "/etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem" "${APP_DIR}/nginx/ssl/key.pem"
            sudo chown $USER:$USER "${APP_DIR}/nginx/ssl/"*
            
            # Restart nginx
            docker-compose start nginx
            
            log "SSL certificates configured successfully"
        else
            warning "Certbot not installed. SSL setup skipped."
        fi
    else
        info "DOMAIN_NAME not set, skipping SSL setup"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    cd "$APP_DIR"
    
    # Create monitoring scripts directory
    mkdir -p scripts/monitoring
    
    # Create health check script
    cat > scripts/monitoring/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost/health"
LOG_FILE="/var/log/invoice-health.log"

if curl -f "$HEALTH_URL" &> /dev/null; then
    echo "$(date): Health check PASSED" >> "$LOG_FILE"
    exit 0
else
    echo "$(date): Health check FAILED" >> "$LOG_FILE"
    exit 1
fi
EOF
    
    chmod +x scripts/monitoring/health-check.sh
    
    # Setup cron job for health checks
    (crontab -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/scripts/monitoring/health-check.sh") | crontab -
    
    log "Monitoring setup completed"
}

# Cleanup old Docker images and containers
cleanup_docker() {
    log "Cleaning up Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    log "Docker cleanup completed"
}

# Rollback function
rollback() {
    error "Deployment failed. Starting rollback..."
    
    if [ -f "/tmp/last_backup_path" ]; then
        local backup_path=$(cat /tmp/last_backup_path)
        
        if [ -d "$backup_path" ]; then
            log "Rolling back to backup: $backup_path"
            
            cd "$APP_DIR"
            
            # Stop current deployment
            docker-compose down
            
            # Restore environment file
            if [ -f "${backup_path}/${ENV_FILE}" ]; then
                cp "${backup_path}/${ENV_FILE}" "${APP_DIR}/"
            fi
            
            # Restore docker-compose file
            if [ -f "${backup_path}/${DOCKER_COMPOSE_FILE}" ]; then
                cp "${backup_path}/${DOCKER_COMPOSE_FILE}" "${APP_DIR}/"
            fi
            
            # Restore database
            if [ -f "${backup_path}/database-backup.sql" ]; then
                docker-compose up -d db
                sleep 10
                docker exec -i "${APP_NAME}-db-1" psql -U postgres < "${backup_path}/database-backup.sql"
            fi
            
            # Start services
            docker-compose up -d
            
            log "Rollback completed"
        else
            error "Backup not found at $backup_path"
        fi
    else
        error "No backup information found"
    fi
}

# Main deployment function
main() {
    log "Starting deployment of $APP_NAME..."
    
    # Check if we're running in CI/CD
    if [ "$CI" == "true" ]; then
        log "Running in CI/CD environment"
    fi
    
    # Trap errors and rollback
    trap 'rollback' ERR
    
    check_root
    check_prerequisites
    create_backup
    update_code
    setup_environment
    deploy_application
    run_migrations
    setup_ssl
    setup_monitoring
    cleanup_docker
    
    log "Deployment completed successfully!"
    log "Application is available at: ${DOMAIN_NAME:-http://localhost}"
    
    # Remove error trap
    trap - ERR
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -d, --domain NAME   Set domain name for SSL"
    echo "  -e, --email EMAIL   Set email for SSL certificates"
    echo "  -r, --repo URL      Set Git repository URL"
    echo ""
    echo "Environment variables:"
    echo "  DOMAIN_NAME         Domain name for the application"
    echo "  SSL_EMAIL           Email for SSL certificate registration"
    echo "  GIT_REPO_URL        Git repository URL"
    echo ""
    echo "Examples:"
    echo "  $0 --domain example.com --email admin@example.com"
    echo "  DOMAIN_NAME=example.com SSL_EMAIL=admin@example.com $0"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -d|--domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        -e|--email)
            SSL_EMAIL="$2"
            shift 2
            ;;
        -r|--repo)
            GIT_REPO_URL="$2"
            shift 2
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"