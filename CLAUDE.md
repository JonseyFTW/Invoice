# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack invoice management system with Docker-based deployment:

- **Frontend**: React 18 SPA with Tailwind CSS served via Nginx
- **Backend**: Node.js/Express API with JWT authentication  
- **Database**: PostgreSQL 15 with Sequelize ORM
- **Cache**: Redis for session storage and performance optimization
- **Services**: PDF generation (Puppeteer), AI receipt parsing (Google Gemini), email (Nodemailer)

## Development Commands

### Backend (`/backend`)
```bash
npm run dev          # Start development server with nodemon
npm run migrate      # Run database migrations
npm test             # Run Jest tests
npm run test:coverage # Run tests with coverage
npm run lint         # ESLint checking
npm run lint:fix     # Auto-fix ESLint issues
npm run backup       # Manual database backup
npm run health       # Health check endpoint
```

### Frontend (`/frontend`)  
```bash
npm start            # Start development server (port 3000)
npm run build        # Production build
npm test             # Run React tests
npm run test:coverage # Run tests with coverage  
npm run lint         # ESLint checking
npm run format       # Prettier formatting
npm run analyze      # Bundle analysis
```

### Docker Operations
```bash
docker-compose up -d        # Start all services
docker-compose logs -f      # View logs
docker-compose down         # Stop all services
```

## Core Application Structure

### Backend Architecture
- **Models**: Sequelize models in `/src/models/` (User, Customer, Invoice, InvoiceLineItem, Expense, RecurringTemplate)
- **Controllers**: Business logic in `/src/controllers/` handling CRUD operations
- **Services**: External integrations (`pdfService.js`, `emailService.js`, `geminiService.js`, `cacheService.js`)
- **Middleware**: Authentication, validation, rate limiting, error handling
- **Routes**: API endpoints organized by resource type

### Frontend Architecture  
- **Pages**: Main application screens in `/src/pages/`
- **Components**: Reusable UI components with shared components in `/src/components/shared/`
- **Contexts**: React Context for authentication (`AuthContext.js`)
- **Hooks**: Custom React hooks in `/src/hooks/`
- **Services**: API client (`api.js`) with Axios interceptors

### Key Features
- **Invoice Management**: Complete CRUD with PDF generation, email sending, payment tracking
- **Recurring Templates**: Full CRUD for recurring invoice templates with automated generation via cron jobs (`cronService.js`)
- **Expense Management**: Complete expense tracking with AI-powered receipt parsing using Google Gemini
- **Customer Management**: Full customer database with contact information and billing addresses
- **Business Analytics**: Comprehensive reporting with charts and business insights
- **Rate Limiting**: Redis-backed rate limiting with different tiers
- **Caching**: Strategic Redis caching for performance optimization

## Database Schema

PostgreSQL database with these core relationships:
- Users → Customers (one-to-many)
- Customers → Invoices (one-to-many)  
- Invoices → InvoiceLineItems (one-to-many)
- Users → Expenses (one-to-many)
- Users → RecurringTemplates (one-to-many)

## Authentication & Security

- JWT tokens for stateless authentication
- bcrypt password hashing with configurable rounds
- Session management via Redis
- Rate limiting per IP with Redis backend
- Input validation with express-validator and Joi
- File upload restrictions and MIME type validation

## Environment Requirements

Critical environment variables needed:
- `JWT_SECRET`: Secure token signing key
- `DB_PASS`: PostgreSQL password
- `GMAIL_USER`/`GMAIL_PASS`: Email service credentials
- `GEMINI_API_KEY`: Google AI API key for receipt parsing
- Company details: `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_PHONE`, `COMPANY_EMAIL`

## Testing Strategy

- **Backend**: Jest tests in `/backend/tests/` with Supertest for API testing
- **Frontend**: React Testing Library tests in component `__tests__/` directories
- Coverage requirements: 70% threshold for branches, functions, lines, statements
- Test commands run in parallel where possible

## Performance Considerations

- Redis caching for frequently accessed data (customers, invoices, reports)
- Database connection pooling via Sequelize
- Nginx reverse proxy with compression and static file serving
- React code splitting and lazy loading for frontend optimization
- Pagination for large datasets

## Development Setup

### Quick Start
```bash
# Copy environment configuration
cp .env.example .env
# Edit .env with your settings

# Development mode
./start-dev.sh

# Production mode  
./start-prod.sh
```

### Manual Setup
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend  
cd frontend && npm install && npm start

# Database
docker-compose up -d db redis
```

## Common Workflows

When implementing new features:
1. Add database models/migrations if needed
2. Create controller logic with proper validation
3. Add API routes with authentication middleware
4. Implement frontend components following existing patterns
5. Add tests for both backend and frontend
6. Run lint and type checking before committing

The application follows RESTful API conventions with comprehensive error handling and logging via Winston.

## Available Pages

Frontend includes complete implementations for:
- **Dashboard**: Business overview with charts and recent activity
- **Customers**: Full customer management with search and pagination
- **Invoices**: Complete invoice lifecycle with PDF generation and email
- **Recurring Templates**: Automated recurring invoice management
- **Expenses**: Expense tracking with AI receipt parsing and categorization
- **Reports**: Business analytics with exportable reports