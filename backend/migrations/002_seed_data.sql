-- Insert demo user (password: 123456)
INSERT INTO users (email, password, business_name, business_phone, business_address)
VALUES (
  'demo@quotemaster.pro',
  '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq4H1pL6ZQ7LJXf7zJQ7JQ7LJXf7zJQ', -- bcrypt hash of '123456'
  'ישראל ישראלי שיפוצים',
  '050-1234567',
  'רחוב הרצל 1, תל אביב'
);

-- Insert sample quotes for demo user
SET @userId = LAST_INSERT_ID();

INSERT INTO quotes (
  id, user_id, quote_number, business_name, business_phone, business_address,
  customer_name, customer_email, customer_phone, customer_address,
  notes, issue_date, valid_until, tax_rate, status
)
VALUES (
  1, @userId, '2024-001', 'ישראל ישראלי שיפוצים', '050-1234567', 'רחוב הרצל 1, תל אביב',
  'דנה כהן', 'dana@example.com', '052-1112222', 'רוטשילד 5, תל אביב',
  'המחיר כולל עבודה וחומרים.\nתנאי תשלום: 50% מקדמה, 50% בסיום העבודה.',
  '2024-07-15', '2024-08-14', 17, 'sent'
),
(
  2, @userId, '2024-002', 'ישראל ישראלי שיפוצים', '050-1234567', 'רחוב הרצל 1, תל אביב',
  'משה לוי', 'moshe@example.com', '054-3334444', 'הנשיא 10, חיפה',
  'המחיר כולל צבע אקרילי לבן.',
  '2024-07-20', '2024-08-19', 17, 'draft'
);

-- Insert service items for first quote
INSERT INTO service_items (quote_id, description, quantity, unit_price)
VALUES 
  (1, 'שיפוץ חדר אמבטיה כללי', 1, 15000),
  (1, 'הוספת נקודת חשמל', 2, 350);

-- Insert service items for second quote
INSERT INTO service_items (quote_id, description, quantity, unit_price)
VALUES 
  (2, 'צביעת דירת 4 חדרים', 1, 4500);
