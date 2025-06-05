-- Create initial admin user
-- Password: 'changeme' (hashed with bcrypt)
INSERT INTO "Users" (
  id, 
  username, 
  email, 
  password, 
  "createdAt", 
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin',
  'admin@example.com',
  '$2a$10$K7L/S0.5UVLgN3KmzqK.AOGrEQr6wWkY8GFVjTYvXoVXK7L/S0.5U',
  NOW(),
  NOW()
);

-- Create sample customer
INSERT INTO "Customers" (
  id,
  name,
  "billingAddress",
  phone,
  email,
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'John Smith',
  '456 Oak Avenue\nSpringfield, IL 62701',
  '(555) 987-6543',
  'john.smith@email.com',
  NOW(),
  NOW()
);