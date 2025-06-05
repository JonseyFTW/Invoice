#!/bin/bash

# Invoice Management System - Health Monitoring Script
# This script monitors the health of all application components

set -e

# Configuration
APP_NAME="invoice-management"
LOG_FILE="/var/log/${APP_NAME}-health.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
HEALTH_CHECK_URL="http://localhost/health"
API_BASE_URL="http://localhost/api"
MAX_RESPONSE_TIME=5000  # milliseconds
MIN_DISK_SPACE=1000000  # KB (1GB)
MAX_MEMORY_USAGE=80     # percentage
MAX_CPU_USAGE=80        # percentage

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health status
OVERALL_STATUS="healthy"
ISSUES=()

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    OVERALL_STATUS="unhealthy"
    ISSUES+=("$1")
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
    if [ "$OVERALL_STATUS" == "healthy" ]; then
        OVERALL_STATUS="degraded"
    fi
    ISSUES+=("$1")
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if Docker services are running
check_docker_services() {
    info "Checking Docker services..."
    
    local services=("${APP_NAME}-backend-1" "${APP_NAME}-frontend-1" "${APP_NAME}-db-1" "${APP_NAME}-redis-1" "${APP_NAME}-nginx-1")
    
    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$service"; then
            log "✓ $service is running"
        else
            error "✗ $service is not running"
        fi
    done
}

# Check application health endpoint
check_health_endpoint() {
    info "Checking health endpoint..."
    
    local start_time=$(date +%s%3N)
    local response
    local http_code
    
    if response=$(curl -s -w "%{http_code}" -o /tmp/health_response "$HEALTH_CHECK_URL" 2>/dev/null); then
        http_code="${response: -3}"
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        
        if [ "$http_code" == "200" ]; then
            if [ "$response_time" -lt "$MAX_RESPONSE_TIME" ]; then
                log "✓ Health endpoint responding (${response_time}ms)"
            else
                warning "⚠ Health endpoint slow response (${response_time}ms)"
            fi
        else
            error "✗ Health endpoint returned HTTP $http_code"
        fi
    else
        error "✗ Health endpoint unreachable"
    fi
}

# Check database connectivity
check_database() {
    info "Checking database connectivity..."
    
    if docker exec "${APP_NAME}-db-1" pg_isready -U postgres >/dev/null 2>&1; then
        log "✓ Database is accepting connections"
        
        # Check database size
        local db_size
        db_size=$(docker exec "${APP_NAME}-db-1" psql -U postgres -d invoice_db -t -c "SELECT pg_size_pretty(pg_database_size('invoice_db'));" 2>/dev/null | xargs)
        
        if [ -n "$db_size" ]; then
            info "Database size: $db_size"
        fi
        
        # Check active connections
        local active_connections
        active_connections=$(docker exec "${APP_NAME}-db-1" psql -U postgres -d invoice_db -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs)
        
        if [ -n "$active_connections" ]; then
            info "Active database connections: $active_connections"
            
            if [ "$active_connections" -gt 50 ]; then
                warning "High number of active database connections: $active_connections"
            fi
        fi
        
    else
        error "✗ Database is not accepting connections"
    fi
}

# Check Redis connectivity
check_redis() {
    info "Checking Redis connectivity..."
    
    if docker exec "${APP_NAME}-redis-1" redis-cli ping >/dev/null 2>&1; then
        log "✓ Redis is responding"
        
        # Check Redis memory usage
        local memory_info
        memory_info=$(docker exec "${APP_NAME}-redis-1" redis-cli info memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        
        if [ -n "$memory_info" ]; then
            info "Redis memory usage: $memory_info"
        fi
        
        # Check connected clients
        local connected_clients
        connected_clients=$(docker exec "${APP_NAME}-redis-1" redis-cli info clients 2>/dev/null | grep connected_clients | cut -d: -f2 | tr -d '\r')
        
        if [ -n "$connected_clients" ]; then
            info "Redis connected clients: $connected_clients"
        fi
        
    else
        error "✗ Redis is not responding"
    fi
}

# Check API endpoints
check_api_endpoints() {
    info "Checking critical API endpoints..."
    
    local endpoints=("/auth/profile" "/customers" "/invoices" "/reports/summary")
    local auth_token
    
    # Try to get auth token (assuming test user exists)
    auth_token=$(curl -s -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@example.com","password":"changeme"}' 2>/dev/null | \
        grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$auth_token" ]; then
        log "✓ Authentication working"
        
        for endpoint in "${endpoints[@]}"; do
            local url="$API_BASE_URL$endpoint"
            local start_time=$(date +%s%3N)
            local http_code
            
            http_code=$(curl -s -w "%{http_code}" -o /dev/null \
                -H "Authorization: Bearer $auth_token" \
                "$url" 2>/dev/null)
            
            local end_time=$(date +%s%3N)
            local response_time=$((end_time - start_time))
            
            if [ "$http_code" == "200" ]; then
                log "✓ $endpoint responding (${response_time}ms)"
            else
                warning "⚠ $endpoint returned HTTP $http_code"
            fi
        done
    else
        warning "⚠ Could not authenticate for API endpoint tests"
    fi
}

# Check system resources
check_system_resources() {
    info "Checking system resources..."
    
    # Check CPU usage
    local cpu_usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d'u' -f1)
    
    if [ -n "$cpu_usage" ]; then
        if (( $(echo "$cpu_usage > $MAX_CPU_USAGE" | bc -l) )); then
            warning "High CPU usage: ${cpu_usage}%"
        else
            log "✓ CPU usage: ${cpu_usage}%"
        fi
    fi
    
    # Check memory usage
    local memory_info
    memory_info=$(free | grep Mem)
    local total_mem=$(echo $memory_info | awk '{print $2}')
    local used_mem=$(echo $memory_info | awk '{print $3}')
    local memory_percent=$((used_mem * 100 / total_mem))
    
    if [ "$memory_percent" -gt "$MAX_MEMORY_USAGE" ]; then
        warning "High memory usage: ${memory_percent}%"
    else
        log "✓ Memory usage: ${memory_percent}%"
    fi
    
    # Check disk space
    local disk_usage
    disk_usage=$(df / | tail -1 | awk '{print $4}')
    
    if [ "$disk_usage" -lt "$MIN_DISK_SPACE" ]; then
        warning "Low disk space: ${disk_usage}KB available"
    else
        log "✓ Disk space: ${disk_usage}KB available"
    fi
}

# Check Docker container resources
check_container_resources() {
    info "Checking container resources..."
    
    local containers=("${APP_NAME}-backend-1" "${APP_NAME}-frontend-1" "${APP_NAME}-db-1" "${APP_NAME}-redis-1")
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            local stats
            stats=$(docker stats "$container" --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" | tail -1)
            
            if [ -n "$stats" ]; then
                local cpu_perc=$(echo "$stats" | awk '{print $1}' | sed 's/%//')
                local mem_usage=$(echo "$stats" | awk '{print $2}')
                
                if (( $(echo "$cpu_perc > 80" | bc -l) 2>/dev/null )); then
                    warning "$container high CPU: ${cpu_perc}%"
                else
                    info "$container - CPU: ${cpu_perc}%, Memory: $mem_usage"
                fi
            fi
        fi
    done
}

# Check log files for errors
check_logs() {
    info "Checking recent logs for errors..."
    
    # Check application logs for errors in the last 5 minutes
    local error_count
    error_count=$(docker logs "${APP_NAME}-backend-1" --since="5m" 2>&1 | grep -i "error\|exception\|fail" | wc -l)
    
    if [ "$error_count" -gt 0 ]; then
        warning "Found $error_count error(s) in application logs (last 5 minutes)"
    else
        log "✓ No recent errors in application logs"
    fi
    
    # Check nginx logs for errors
    local nginx_errors
    nginx_errors=$(docker logs "${APP_NAME}-nginx-1" --since="5m" 2>&1 | grep -i "error" | wc -l)
    
    if [ "$nginx_errors" -gt 0 ]; then
        warning "Found $nginx_errors error(s) in nginx logs (last 5 minutes)"
    else
        log "✓ No recent errors in nginx logs"
    fi
}

# Check SSL certificate expiration
check_ssl_certificate() {
    if [ -n "$DOMAIN_NAME" ]; then
        info "Checking SSL certificate for $DOMAIN_NAME..."
        
        local cert_expiry
        cert_expiry=$(echo | openssl s_client -servername "$DOMAIN_NAME" -connect "$DOMAIN_NAME:443" 2>/dev/null | \
                     openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        
        if [ -n "$cert_expiry" ]; then
            local expiry_epoch=$(date -d "$cert_expiry" +%s)
            local current_epoch=$(date +%s)
            local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
            
            if [ "$days_until_expiry" -lt 30 ]; then
                warning "SSL certificate expires in $days_until_expiry days"
            else
                log "✓ SSL certificate expires in $days_until_expiry days"
            fi
        fi
    fi
}

# Send alert notifications
send_alerts() {
    if [ "$OVERALL_STATUS" != "healthy" ] && [ ${#ISSUES[@]} -gt 0 ]; then
        local message="🚨 Invoice Management System Health Alert\n\nStatus: $OVERALL_STATUS\n\nIssues found:\n"
        
        for issue in "${ISSUES[@]}"; do
            message="${message}- $issue\n"
        done
        
        message="${message}\nTime: $(date)\nServer: $(hostname)"
        
        # Send email alert if configured
        if [ -n "$ALERT_EMAIL" ] && command -v mail >/dev/null 2>&1; then
            echo -e "$message" | mail -s "Health Alert: $APP_NAME" "$ALERT_EMAIL"
            info "Alert email sent to $ALERT_EMAIL"
        fi
        
        # Send Slack notification if configured
        if [ -n "$SLACK_WEBHOOK" ]; then
            local slack_payload=$(cat <<EOF
{
    "text": "Invoice Management System Health Alert",
    "color": "danger",
    "fields": [
        {
            "title": "Status",
            "value": "$OVERALL_STATUS",
            "short": true
        },
        {
            "title": "Issues",
            "value": "$(printf '%s\\n' "${ISSUES[@]}")",
            "short": false
        }
    ]
}
EOF
            )
            
            curl -X POST -H 'Content-type: application/json' \
                 --data "$slack_payload" \
                 "$SLACK_WEBHOOK" >/dev/null 2>&1
            
            info "Slack notification sent"
        fi
    fi
}

# Generate health report
generate_report() {
    local report_file="/tmp/${APP_NAME}-health-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "$OVERALL_STATUS",
    "issues_count": ${#ISSUES[@]},
    "issues": $(printf '%s\n' "${ISSUES[@]}" | jq -R . | jq -s .),
    "hostname": "$(hostname)",
    "uptime": "$(uptime | awk '{print $3,$4}' | sed 's/,//')"
}
EOF
    
    info "Health report generated: $report_file"
    
    # Keep only last 10 reports
    find /tmp -name "${APP_NAME}-health-report-*.json" -type f | \
        sort | head -n -10 | xargs rm -f 2>/dev/null || true
}

# Main health check function
main() {
    log "Starting health check for $APP_NAME..."
    
    check_docker_services
    check_health_endpoint
    check_database
    check_redis
    check_api_endpoints
    check_system_resources
    check_container_resources
    check_logs
    check_ssl_certificate
    
    # Summary
    if [ "$OVERALL_STATUS" == "healthy" ]; then
        log "✅ All health checks passed - System is healthy"
    elif [ "$OVERALL_STATUS" == "degraded" ]; then
        warning "⚠️  System is degraded - ${#ISSUES[@]} issue(s) found"
    else
        error "❌ System is unhealthy - ${#ISSUES[@]} issue(s) found"
    fi
    
    send_alerts
    generate_report
    
    log "Health check completed"
    
    # Exit with appropriate code
    case "$OVERALL_STATUS" in
        "healthy")
            exit 0
            ;;
        "degraded")
            exit 1
            ;;
        "unhealthy")
            exit 2
            ;;
    esac
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -q, --quiet             Run in quiet mode (less output)"
    echo "  -v, --verbose           Run in verbose mode (more output)"
    echo "  --email EMAIL           Set alert email address"
    echo "  --slack-webhook URL     Set Slack webhook URL"
    echo "  --domain DOMAIN         Set domain name for SSL check"
    echo ""
    echo "Environment variables:"
    echo "  ALERT_EMAIL             Email address for alerts"
    echo "  SLACK_WEBHOOK           Slack webhook URL"
    echo "  DOMAIN_NAME             Domain name for SSL certificate check"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -q|--quiet)
            exec > /dev/null
            shift
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        --email)
            ALERT_EMAIL="$2"
            shift 2
            ;;
        --slack-webhook)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        --domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"