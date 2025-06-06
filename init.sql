-- Invoice Management System Database Initialization
-- This file runs when the PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for better performance (these will be created by Sequelize, but included for reference)

-- Users table indexes
-- CREATE INDEX IF NOT EXISTS idx_users_email ON "Users" (email);
-- CREATE INDEX IF NOT EXISTS idx_users_username ON "Users" (username);
-- CREATE INDEX IF NOT EXISTS idx_users_active ON "Users" ("isActive");

-- Customers table indexes
-- CREATE INDEX IF NOT EXISTS idx_customers_name ON "Customers" (name);
-- CREATE INDEX IF NOT EXISTS idx_customers_email ON "Customers" (email);

-- Invoices table indexes
-- CREATE INDEX IF NOT EXISTS idx_invoices_number ON "Invoices" ("invoiceNumber");
-- CREATE INDEX IF NOT EXISTS idx_invoices_customer ON "Invoices" ("customerId");
-- CREATE INDEX IF NOT EXISTS idx_invoices_status ON "Invoices" (status);
-- CREATE INDEX IF NOT EXISTS idx_invoices_date ON "Invoices" ("invoiceDate");
-- CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON "Invoices" ("dueDate");

-- Expenses table indexes
-- CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON "Expenses" (vendor);
-- CREATE INDEX IF NOT EXISTS idx_expenses_date ON "Expenses" ("expenseDate");
-- CREATE INDEX IF NOT EXISTS idx_expenses_invoice ON "Expenses" ("invoiceId");

-- Recurring Templates indexes
-- CREATE INDEX IF NOT EXISTS idx_recurring_customer ON "RecurringTemplates" ("customerId");
-- CREATE INDEX IF NOT EXISTS idx_recurring_active ON "RecurringTemplates" ("isActive");
-- CREATE INDEX IF NOT EXISTS idx_recurring_next_run ON "RecurringTemplates" ("nextRunDate");

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INTEGER;
    invoice_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(
        (SELECT MAX(CAST(SPLIT_PART("invoiceNumber", '-', 3) AS INTEGER))
         FROM "Invoices" 
         WHERE "invoiceNumber" LIKE 'INV-' || current_year || '-%'), 
        0
    ) + 1 INTO next_number;
    
    invoice_number := 'INV-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals(invoice_id UUID)
RETURNS TABLE(subtotal DECIMAL, tax_amount DECIMAL, grand_total DECIMAL) AS $$
DECLARE
    tax_rate DECIMAL;
    calc_subtotal DECIMAL;
    calc_tax_amount DECIMAL;
    calc_grand_total DECIMAL;
BEGIN
    -- Get tax rate for the invoice
    SELECT "taxRate" INTO tax_rate FROM "Invoices" WHERE id = invoice_id;
    
    -- Calculate subtotal
    SELECT COALESCE(SUM("lineTotal"), 0) INTO calc_subtotal
    FROM "InvoiceLineItems" 
    WHERE "invoiceId" = invoice_id;
    
    -- Calculate tax amount
    calc_tax_amount := calc_subtotal * (tax_rate / 100);
    
    -- Calculate grand total
    calc_grand_total := calc_subtotal + calc_tax_amount;
    
    RETURN QUERY SELECT calc_subtotal, calc_tax_amount, calc_grand_total;
END;
$$ LANGUAGE plpgsql;

-- Function to update overdue invoices
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE "Invoices" 
    SET status = 'Overdue'
    WHERE status = 'Unpaid' 
    AND "dueDate" < CURRENT_DATE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate line totals
CREATE OR REPLACE FUNCTION calculate_line_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW."lineTotal" := NEW.quantity * NEW."unitPrice";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to InvoiceLineItems (will be created by Sequelize)
-- CREATE TRIGGER trigger_calculate_line_total
--     BEFORE INSERT OR UPDATE ON "InvoiceLineItems"
--     FOR EACH ROW
--     EXECUTE FUNCTION calculate_line_total();

-- Views and sample data will be created by the application after tables are ready
-- This is just a placeholder for future use

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Invoice Management System database extensions and functions initialized successfully!';
    RAISE NOTICE 'Tables, views, and sample data will be created by the application.';
END $$;