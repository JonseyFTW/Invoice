const request = require('supertest');
const app = require('../src/app');
const {
  sequelize, User, Customer, Invoice, InvoiceLineItem,
} = require('../src/models');

describe('Invoice API', () => {
  let authToken;
  let testUser;
  let testCustomer;

  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.token;

    // Create test customer
    testCustomer = await Customer.create({
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '555-123-4567',
      billingAddress: '123 Test St, Test City, TC 12345',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/invoices', () => {
    it('should create a new invoice', async () => {
      const invoiceData = {
        customerId: testCustomer.id,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        taxRate: 8.25,
        notes: 'Test invoice',
        lineItems: [
          {
            description: 'Test Service',
            quantity: 1,
            unitPrice: 100.00,
          },
          {
            description: 'Additional Service',
            quantity: 2,
            unitPrice: 50.00,
          },
        ],
      };

      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      expect(response.body.invoice).toHaveProperty('id');
      expect(response.body.invoice).toHaveProperty('invoiceNumber');
      expect(response.body.invoice.customerId).toBe(testCustomer.id);
      expect(response.body.invoice.lineItems).toHaveLength(2);
      expect(response.body.invoice.subtotal).toBe(200.00);
      expect(response.body.invoice.taxAmount).toBe(16.50);
      expect(response.body.invoice.grandTotal).toBe(216.50);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Valid customer ID is required',
          }),
        ]),
      );
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/invoices')
        .send({
          customerId: testCustomer.id,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
        })
        .expect(401);
    });

    it('should validate line items', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomer.id,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          lineItems: [],
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'At least one line item is required',
          }),
        ]),
      );
    });
  });

  describe('GET /api/invoices', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'INV-2024-0001',
        customerId: testCustomer.id,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        taxRate: 8.25,
        status: 'Unpaid',
      });

      await InvoiceLineItem.create({
        invoiceId: testInvoice.id,
        description: 'Test Service',
        quantity: 1,
        unitPrice: 100.00,
        lineTotal: 100.00,
      });
    });

    afterEach(async () => {
      await InvoiceLineItem.destroy({ where: {} });
      await Invoice.destroy({ where: {} });
    });

    it('should get list of invoices', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('invoices');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('currentPage');
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body.invoices).toHaveLength(1);
      expect(response.body.invoices[0].invoiceNumber).toBe('INV-2024-0001');
    });

    it('should filter invoices by status', async () => {
      const response = await request(app)
        .get('/api/invoices?status=Unpaid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.invoices).toHaveLength(1);
      expect(response.body.invoices[0].status).toBe('Unpaid');
    });

    it('should paginate results', async () => {
      // Create additional invoices
      for (let i = 2; i <= 15; i++) {
        const invoice = await Invoice.create({
          invoiceNumber: `INV-2024-${i.toString().padStart(4, '0')}`,
          customerId: testCustomer.id,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          taxRate: 8.25,
          status: 'Unpaid',
        });

        await InvoiceLineItem.create({
          invoiceId: invoice.id,
          description: 'Test Service',
          quantity: 1,
          unitPrice: 100.00,
          lineTotal: 100.00,
        });
      }

      const response = await request(app)
        .get('/api/invoices?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.invoices).toHaveLength(10);
      expect(response.body.totalCount).toBe(15);
      expect(response.body.totalPages).toBe(2);
      expect(response.body.currentPage).toBe(1);
    });
  });

  describe('GET /api/invoices/:id', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'INV-2024-0001',
        customerId: testCustomer.id,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        taxRate: 8.25,
        status: 'Unpaid',
      });

      await InvoiceLineItem.create({
        invoiceId: testInvoice.id,
        description: 'Test Service',
        quantity: 1,
        unitPrice: 100.00,
        lineTotal: 100.00,
      });
    });

    afterEach(async () => {
      await InvoiceLineItem.destroy({ where: {} });
      await Invoice.destroy({ where: {} });
    });

    it('should get invoice by id', async () => {
      const response = await request(app)
        .get(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.invoice.id).toBe(testInvoice.id);
      expect(response.body.invoice.invoiceNumber).toBe('INV-2024-0001');
      expect(response.body.invoice.customer.name).toBe('Test Customer');
      expect(response.body.invoice.lineItems).toHaveLength(1);
    });

    it('should return 404 for non-existent invoice', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app)
        .get(`/api/invoices/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/invoices/:id/mark-paid', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'INV-2024-0001',
        customerId: testCustomer.id,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        taxRate: 8.25,
        status: 'Unpaid',
      });
    });

    afterEach(async () => {
      await Invoice.destroy({ where: {} });
    });

    it('should mark invoice as paid', async () => {
      const response = await request(app)
        .patch(`/api/invoices/${testInvoice.id}/mark-paid`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.invoice.status).toBe('Paid');
      expect(response.body.invoice.paymentDate).toBeDefined();
    });
  });

  describe('DELETE /api/invoices/:id', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'INV-2024-0001',
        customerId: testCustomer.id,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        taxRate: 8.25,
        status: 'Unpaid',
      });
    });

    it('should delete invoice', async () => {
      await request(app)
        .delete(`/api/invoices/${testInvoice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedInvoice = await Invoice.findByPk(testInvoice.id);
      expect(deletedInvoice).toBeNull();
    });
  });

  describe('GET /api/invoices/:id/pdf', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await Invoice.create({
        invoiceNumber: 'INV-2024-0001',
        customerId: testCustomer.id,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        taxRate: 8.25,
        status: 'Unpaid',
      });

      await InvoiceLineItem.create({
        invoiceId: testInvoice.id,
        description: 'Test Service',
        quantity: 1,
        unitPrice: 100.00,
        lineTotal: 100.00,
      });
    });

    afterEach(async () => {
      await InvoiceLineItem.destroy({ where: {} });
      await Invoice.destroy({ where: {} });
    });

    it('should generate PDF', async () => {
      const response = await request(app)
        .get(`/api/invoices/${testInvoice.id}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('invoice-INV-2024-0001.pdf');
    });
  });
});
