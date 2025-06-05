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

-- Create a view for invoice summaries
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.id,
    i."invoiceNumber",
    i."invoiceDate",
    i."dueDate",
    i.status,
    i."taxRate",
    c.name as customer_name,
    c.email as customer_email,
    COALESCE(SUM(li."lineTotal"), 0) as subtotal,
    COALESCE(SUM(li."lineTotal"), 0) * (i."taxRate" / 100) as tax_amount,
    COALESCE(SUM(li."lineTotal"), 0) * (1 + i."taxRate" / 100) as grand_total,
    COUNT(li.id) as line_item_count
FROM "Invoices" i
LEFT JOIN "Customers" c ON i."customerId" = c.id
LEFT JOIN "InvoiceLineItems" li ON i.id = li."invoiceId"
GROUP BY i.id, c.name, c.email;

-- Create a view for monthly revenue reports
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT 
    DATE_TRUNC('month', "invoiceDate") as month,
    COUNT(*) as invoice_count,
    SUM(subtotal) as total_revenue,
    AVG(subtotal) as avg_invoice_value
FROM invoice_summary
WHERE status IN ('Paid', 'Unpaid', 'Overdue')
GROUP BY DATE_TRUNC('month', "invoiceDate")
ORDER BY month;

-- Insert default admin user (password: 'changeme')
-- This will be handled by the application migration, but included as backup
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Users" WHERE email = 'admin@example.com') THEN
        INSERT INTO "Users" (
            id, 
            username, 
            email, 
            password, 
            "isActive",
            "createdAt", 
            "updatedAt"
        ) VALUES (
            uuid_generate_v4(),
            'admin',
            'admin@example.com',
            '$2a$10$K7L/S0.5UVLgN3KmzqK.AOGrEQr6wWkY8GFVjTYvXoVXK7L/S0.5U', -- bcrypt hash of 'changeme'
            true,
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- Insert sample customer data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Customers" WHERE email = 'john.smith@email.com') THEN
        INSERT INTO "Customers" (
            id,
            name,
            "billingAddress",
            phone,
            email,
            "createdAt",
            "updatedAt"
        ) VALUES (
            uuid_generate_v4(),
            'John Smith',
            E'456 Oak Avenue\nSpringfield, IL 62701',
            '(555) 987-6543',
            'john.smith@email.com',
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- Insert another sample customer
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Customers" WHERE email = 'jane.doe@email.com') THEN
        INSERT INTO "Customers" (
            id,
            name,
            "billingAddress",
            phone,
            email,
            "createdAt",
            "updatedAt"
        ) VALUES (
            uuid_generate_v4(),
            'Jane Doe',
            E'789 Pine Street\nSpringfield, IL 62702',
            '(555) 123-7890',
            'jane.doe@email.com',
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS "AuditLogs" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create index on audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON "AuditLogs" (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON "AuditLogs" (changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON "AuditLogs" (changed_by);

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
    p_table_name TEXT,
    p_record_id UUID,
    p_action TEXT,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO "AuditLogs" (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_by
    ) VALUES (
        p_table_name,
        p_record_id,
        p_action,
        p_old_values,
        p_new_values,
        p_changed_by
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Invoice Management System database initialized successfully!';
    RAISE NOTICE 'Default admin user created: admin@example.com / changeme';
    RAISE NOTICE 'Sample customers created for testing';
END $$;