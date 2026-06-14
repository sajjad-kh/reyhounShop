const { TestDataFactory, TestAssertions } = require('../helpers/testUtils');
const authService = require('../../src/services/authService');
const bcrypt = require('bcryptjs');

describe('AuthService', () => {

  describe('register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890'
      };

      const result = await authService.register(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      TestAssertions.expectValidUser(result.user);
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.lastName).toBe(userData.lastName);
    });

    test('should throw error for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      // Create first user
      await TestDataFactory.createUser({ email: userData.email });

      // Try to register with same email
      await expect(authService.register(userData))
        .rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });

    test('should throw error for duplicate phone', async () => {
      const phone = '1234567890';
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone
      };

      // Create first user with phone
      await TestDataFactory.createUser({ phone });

      // Try to register with same phone
      await expect(authService.register(userData))
        .rejects.toThrow('PHONE_ALREADY_EXISTS');
    });
  });

  describe('login', () => {
    test('should login user with valid credentials', async () => {
      const password = 'password123';
      const user = await TestDataFactory.createUser({
        email: 'login@example.com',
        password: await bcrypt.hash(password, 10)
      });

      const result = await authService.login('login@example.com', password);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
    });

    test('should throw error for invalid email', async () => {
      await expect(authService.login('nonexistent@example.com', 'password123'))
        .rejects.toThrow('INVALID_CREDENTIALS');
    });

    test('should throw error for invalid password', async () => {
      const user = await TestDataFactory.createUser({
        email: 'test@example.com',
        password: await bcrypt.hash('correctpassword', 10)
      });

      await expect(authService.login(user.email, 'wrongpassword'))
        .rejects.toThrow('INVALID_CREDENTIALS');
    });

    test('should throw error for inactive user', async () => {
      const password = 'password123';
      const user = await TestDataFactory.createUser({
        email: 'inactive@example.com',
        password: await bcrypt.hash(password, 10),
        isActive: false
      });

      await expect(authService.login(user.email, password))
        .rejects.toThrow('ACCOUNT_INACTIVE');
    });
  });

  describe('enable2FA', () => {
    test('should enable 2FA for user', async () => {
      const user = await TestDataFactory.createUser();

      const result = await authService.enable2FA(user.id);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(typeof result.secret).toBe('string');
      expect(typeof result.qrCode).toBe('string');

      // Verify user was updated
      const updatedUser = await global.testDb.user.findUnique({
        where: { id: user.id }
      });
      expect(updatedUser.twoFactorSecret).toBeTruthy();
    });

    test('should throw error for non-existent user', async () => {
      await expect(authService.enable2FA(99999))
        .rejects.toThrow('USER_NOT_FOUND');
    });
  });

  describe('verify2FA', () => {
    test('should verify valid 2FA token', async () => {
      const user = await TestDataFactory.createUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP' // Test secret
      });

      // Generate a valid token for the test secret
      const speakeasy = require('speakeasy');
      const token = speakeasy.totp({
        secret: 'JBSWY3DPEHPK3PXP',
        encoding: 'base32'
      });

      const result = await authService.verify2FA(user.id, token);

      expect(result).toBe(true);
    });

    test('should reject invalid 2FA token', async () => {
      const user = await TestDataFactory.createUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP'
      });

      await expect(authService.verify2FA(user.id, '000000'))
        .rejects.toThrow('INVALID_2FA_TOKEN');
    });

    test('should throw error for user without 2FA enabled', async () => {
      const user = await TestDataFactory.createUser({
        twoFactorEnabled: false
      });

      await expect(authService.verify2FA(user.id, '123456'))
        .rejects.toThrow('2FA_NOT_ENABLED');
    });
  });
});