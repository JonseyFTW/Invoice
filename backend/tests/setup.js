const { sequelize, User, Customer, Invoice, InvoiceLineItem, Expense, RecurringTemplate } = require('../src/models');
const jwt = require('jsonwebtoken');

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
  process.env.DB_NAME = 'test_db';
  
  // Sync database for tests
  await sequelize.sync({ force: true });
});

// Clean up after each test
afterEach(async () => {
  // Clean up all tables in reverse order to handle foreign keys
  await InvoiceLineItem.destroy({ where: {}, truncate: true });
  await Expense.destroy({ where: {}, truncate: true });
  await Invoice.destroy({ where: {}, truncate: true });
  await RecurringTemplate.destroy({ where: {}, truncate: true });
  await Customer.destroy({ where: {}, truncate: true });
  await User.destroy({ where: {}, truncate: true });
});

// Close database connection after all tests
afterAll(async () => {
  await sequelize.close();
});

// Test utilities
class TestUtils {
  // Create test user
  static async createTestUser(userData = {}) {
    const defaultUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    return await User.create({
      ...defaultUser,
      ...userData
    });
  }

  // Create test customer
  static async createTestCustomer(customerData = {}) {
    const defaultCustomer = {
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '555-123-4567',
      billingAddress: '123 Test St, Test City, TC 12345'
    };

    return await Customer.create({
      ...defaultCustomer,
      ...customerData
    });
  }

  // Create test invoice
  static async createTestInvoice(customerId, invoiceData = {}) {
    const defaultInvoice = {
      invoiceNumber: `INV-TEST-${Date.now()}`,
      customerId,
      invoiceDate: '2024-01-15',
      dueDate: '2024-02-15',
      taxRate: 8.25,
      status: 'Unpaid'
    };

    return await Invoice.create({
      ...defaultInvoice,
      ...invoiceData
    });
  }

  // Create test line item
  static async createTestLineItem(invoiceId, lineItemData = {}) {
    const defaultLineItem = {
      invoiceId,
      description: 'Test Service',
      quantity: 1,
      unitPrice: 100.00,
      lineTotal: 100.00
    };

    return await InvoiceLineItem.create({
      ...defaultLineItem,
      ...lineItemData
    });
  }

  // Create test expense
  static async createTestExpense(expenseData = {}) {
    const defaultExpense = {
      vendor: 'Test Vendor',
      description: 'Test expense description',
      amount: 50.00,
      expenseDate: '2024-01-15'
    };

    return await Expense.create({
      ...defaultExpense,
      ...expenseData
    });
  }

  // Create test recurring template
  static async createTestRecurringTemplate(customerId, templateData = {}) {
    const defaultTemplate = {
      customerId,
      templateName: 'Test Template',
      baseInvoiceData: {
        lineItems: [
          {
            description: 'Monthly Service',
            quantity: 1,
            unitPrice: 100.00
          }
        ],
        notes: 'Recurring monthly service'
      },
      taxRate: 8.25,
      frequency: 'MONTHLY',
      startDate: '2024-01-01',
      nextRunDate: '2024-02-01',
      isActive: true,
      completedOccurrences: 0
    };

    return await RecurringTemplate.create({
      ...defaultTemplate,
      ...templateData
    });
  }

  // Generate JWT token for testing
  static generateTestToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }

  // Create authenticated user and return token
  static async createAuthenticatedUser(userData = {}) {
    const user = await this.createTestUser(userData);
    const token = this.generateTestToken(user.id);
    return { user, token };
  }

  // Create complete test invoice with line items
  static async createCompleteTestInvoice(customerId, options = {}) {
    const invoice = await this.createTestInvoice(customerId, options.invoiceData);
    
    const lineItems = options.lineItems || [
      { description: 'Service 1', quantity: 1, unitPrice: 100.00 },
      { description: 'Service 2', quantity: 2, unitPrice: 50.00 }
    ];

    const createdLineItems = [];
    for (const lineItemData of lineItems) {
      const lineItem = await this.createTestLineItem(invoice.id, lineItemData);
      createdLineItems.push(lineItem);
    }

    return { invoice, lineItems: createdLineItems };
  }

  // Wait for async operations
  static async wait(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock external services
  static mockEmailService() {
    const emailService = require('../src/services/emailService');
    jest.spyOn(emailService, 'sendInvoiceEmail').mockResolvedValue(true);
    jest.spyOn(emailService, 'testConnection').mockResolvedValue(true);
    return emailService;
  }

  static mockGeminiService() {
    const geminiService = require('../src/services/geminiService');
    jest.spyOn(geminiService, 'parseReceipt').mockResolvedValue({
      merchant: 'Test Store',
      date: '2024-01-15',
      total: 25.99,
      lineItems: [
        {
          description: 'Test Item',
          quantity: 1,
          unitPrice: 25.99,
          lineTotal: 25.99
        }
      ]
    });
    jest.spyOn(geminiService, 'isAvailable').mockResolvedValue(true);
    return geminiService;
  }

  static mockCacheService() {
    const cacheService = require('../src/services/cacheService');
    jest.spyOn(cacheService, 'get').mockResolvedValue(null);
    jest.spyOn(cacheService, 'set').mockResolvedValue(true);
    jest.spyOn(cacheService, 'del').mockResolvedValue(true);
    jest.spyOn(cacheService, 'isConnected').mockReturnValue(false);
    return cacheService;
  }

  // Database transaction helper
  static async withTransaction(callback) {
    const transaction = await sequelize.transaction();
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Assert response structure
  static assertValidApiResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.headers['content-type']).toMatch(/json/);
  }

  static assertValidPaginatedResponse(response, expectedStatus = 200) {
    this.assertValidApiResponse(response, expectedStatus);
    expect(response.body).toHaveProperty('totalPages');
    expect(response.body).toHaveProperty('currentPage');
    expect(response.body).toHaveProperty('totalCount');
  }

  static assertValidErrorResponse(response, expectedStatus = 400) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('error');
  }

  // Generate test data sets
  static generateCustomerTestData(count = 5) {
    const customers = [];
    for (let i = 1; i <= count; i++) {
      customers.push({
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        phone: `555-000-000${i}`,
        billingAddress: `${i}00 Test St, Test City, TC 1234${i}`
      });
    }
    return customers;
  }

  static generateInvoiceTestData(customerId, count = 5) {
    const invoices = [];
    for (let i = 1; i <= count; i++) {
      invoices.push({
        invoiceNumber: `INV-TEST-${i.toString().padStart(4, '0')}`,
        customerId,
        invoiceDate: `2024-01-${i.toString().padStart(2, '0')}`,
        dueDate: `2024-02-${i.toString().padStart(2, '0')}`,
        taxRate: 8.25,
        status: i % 2 === 0 ? 'Paid' : 'Unpaid'
      });
    }
    return invoices;
  }

  // Performance testing helpers
  static async measureExecutionTime(fn) {
    const start = Date.now();
    const result = await fn();
    const end = Date.now();
    return {
      result,
      executionTime: end - start
    };
  }

  // Memory usage helper
  static getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024)
    };
  }

  // File upload helpers
  static createMockFile(filename = 'test.jpg', mimetype = 'image/jpeg', size = 1024) {
    return {
      fieldname: 'receipt',
      originalname: filename,
      encoding: '7bit',
      mimetype,
      destination: '/tmp/uploads',
      filename: `mock-${Date.now()}-${filename}`,
      path: `/tmp/uploads/mock-${Date.now()}-${filename}`,
      size,
      buffer: Buffer.alloc(size)
    };
  }

  // Date helpers
  static getDateRange(days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  // Random data generators
  static randomString(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  }

  static randomEmail() {
    return `test${this.randomString(5)}@example.com`;
  }

  static randomPhoneNumber() {
    return `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  static randomAmount(min = 10, max = 1000) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  // Validation helpers
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidInvoiceNumber(invoiceNumber) {
    const invoiceRegex = /^INV-\d{4}-\d{4}$/;
    return invoiceRegex.test(invoiceNumber);
  }

  // Async test helpers
  static async expectAsyncError(asyncFn, expectedError) {
    let error;
    try {
      await asyncFn();
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    if (expectedError) {
      expect(error.message).toContain(expectedError);
    }
  }

  // Rate limiting test helper
  static async testRateLimit(request, maxRequests = 5) {
    const promises = [];
    for (let i = 0; i < maxRequests + 1; i++) {
      promises.push(request());
    }
    
    const responses = await Promise.all(promises);
    
    // Check that the last request was rate limited
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429);
    
    return responses;
  }

  // Database constraint testing
  static async testUniqueConstraint(model, field, value) {
    const data = { [field]: value };
    
    // First create should succeed
    const first = await model.create(data);
    expect(first).toBeDefined();
    
    // Second create should fail
    await expect(model.create(data)).rejects.toThrow();
  }

  // Cleanup helpers
  static async cleanupTestFiles(directory = '/tmp/test-uploads') {
    const fs = require('fs').promises;
    try {
      const files = await fs.readdir(directory);
      await Promise.all(
        files.map(file => fs.unlink(`${directory}/${file}`))
      );
    } catch (error) {
      // Directory might not exist, ignore
    }
  }
}

module.exports = TestUtils;