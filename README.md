# Home Repair Invoice Management System

A comprehensive full-stack web application for managing invoices, customers, and expenses with automatic receipt parsing using AI.

## Features

- **Customer Management**: Add, edit, and manage customer information
- **Invoice Creation**: Create professional invoices with line items and tax calculation
- **Recurring Invoices**: Set up automatic recurring invoice generation
- **Receipt Scanning**: AI-powered receipt parsing using Google Gemini
- **Email Integration**: Send invoices via Gmail with PDF attachments
- **Expense Tracking**: Track expenses and link them to invoices
- **Reporting & Analytics**: View business performance with charts and metrics
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React, React Router, Tailwind CSS, Recharts
- **Backend**: Node.js, Express, PostgreSQL, Sequelize ORM
- **Authentication**: JWT tokens
- **PDF Generation**: Puppeteer
- **Email**: Nodemailer with Gmail
- **AI Integration**: Google Gemini for receipt parsing
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Gmail account with App Password enabled
- Google Gemini API key

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd invoice-app
   ```

2. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables**
   Edit `.env` file with your settings:
   ```env
   # Database
   DB_PASS=your_secure_password_here
   
   # Email (Gmail App Password)
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASS=your-app-password
   
   # Gemini API
   GEMINI_API_KEY=your-gemini-api-key
   
   # Company Info
   COMPANY_NAME=Your Business Name
   COMPANY_ADDRESS=Your Address
   COMPANY_PHONE=Your Phone
   COMPANY_EMAIL=your-email@gmail.com
   
   # Security
   JWT_SECRET=your-super-secret-jwt-key-change-this
   ```

4. **Start the application**
   ```bash
   docker-compose up -d
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

6. **Login with default credentials**
   - Email: admin@example.com
   - Password: changeme

## Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"
4. Use this password in the `GMAIL_PASS` environment variable

## Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the key to `GEMINI_API_KEY` in your environment

## Development

### Running locally without Docker

1. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Database**
   Set up PostgreSQL locally and update connection settings in `.env`

### Database Migrations

```bash
cd backend
npm run migrate
```

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `PATCH /api/invoices/:id/mark-paid` - Mark as paid
- `GET /api/invoices/:id/pdf` - Download PDF
- `POST /api/invoices/:id/send-email` - Send email

### Expenses
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense (with file upload)
- `GET /api/expenses/:id` - Get expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Reports
- `GET /api/reports/summary` - Business summary
- `GET /api/reports/monthly` - Monthly data
- `GET /api/reports/top-customers` - Top customers

## Production Deployment

### Environment Configuration

Update the following for production:

```env
NODE_ENV=production
JWT_SECRET=secure-random-key-for-production
DB_PASS=secure-database-password
```

### SSL/HTTPS Setup

1. Add an SSL proxy (nginx or Cloudflare)
2. Update CORS settings in backend
3. Configure secure cookies

### Performance Optimization

- Enable gzip compression
- Set up CDN for static assets
- Configure database connection pooling
- Implement caching strategies

## Troubleshooting

### Common Issues

1. **Gemini API not working**
   - Verify API key is correct
   - Check API quotas and billing
   - Ensure image format is supported (JPEG, PNG, PDF)

2. **Email not sending**
   - Verify Gmail app password
   - Check 2FA is enabled
   - Test SMTP connection

3. **Database connection issues**
   - Ensure PostgreSQL is running
   - Check connection credentials
   - Verify network connectivity

4. **PDF generation failing**
   - Check Puppeteer dependencies in Docker
   - Verify Chrome/Chromium installation
   - Check memory limitations

### Logs

View application logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation