/* ---------------------------------------------------------
   19. USER ROLE EDITOR
   Allows users.role to store user, editor, or admin.
   Admin pages still require role = 'admin'.
   --------------------------------------------------------- */

ALTER TABLE users
  MODIFY COLUMN role ENUM('user','editor','admin') NOT NULL DEFAULT 'user';

UPDATE users
SET role = 'admin'
WHERE email = 'povzeii55@gmail.com';
