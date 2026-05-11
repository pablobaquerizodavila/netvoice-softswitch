-- Usuario administrador inicial
-- Contraseña por defecto: Admin1234! (cambiar en producción)
-- Hash generado con bcrypt (12 rounds)
-- Para regenerar: python3 -c "from passlib.context import CryptContext; print(CryptContext(['bcrypt']).hash('Admin1234!'))"
INSERT INTO users (username, password_hash, role)
VALUES (
  'admin',
  '$2b$12$LQv3c1yqBwEHXq2uZiqFde9g.7UQYGMZg1R6gHq8hStD6l5lYmZdG',
  'admin'
)
ON DUPLICATE KEY UPDATE username = username;
