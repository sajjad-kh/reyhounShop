const { getPrismaClient } = require('../utils/database');
const { hashPassword, comparePassword } = require('../utils/auth');
const { ActivityAction } = require('@prisma/client');

class UserService {
  /**
   * Get user profile by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User profile data
   */
  async getProfile(userId) {
    const user = await getPrismaClient().user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        is2FAEnabled: true,
        loyaltyPoints: true,
        // birthDate: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            province: true,
            postalCode: true,
            lat: true,
            lng: true,
            isDefault: true
          },
          orderBy: {
            isDefault: 'desc'
          }
        }
      }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return user;
  }

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {Object} updateData - Profile update data
   * @returns {Promise<Object>} Updated user profile
   */
  async updateProfile(userId, updateData) {
    const { name, phone, birthDate, currentPassword, newPassword } = updateData;

    // Check if user exists
    const existingUser = await getPrismaClient().user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true, phone: true }
    });

    if (!existingUser) {
      throw new Error('USER_NOT_FOUND');
    }

    // Check if phone number is already taken by another user
    if (phone && phone !== existingUser.phone) {
      const phoneExists = await getPrismaClient().user.findFirst({
        where: {
          phone,
          id: { not: userId }
        }
      });

      if (phoneExists) {
        throw new Error('PHONE_ALREADY_EXISTS');
      }
    }

    const updateFields = {};

    // Update basic profile fields
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone || null;
    if (birthDate !== undefined) updateFields.birthDate = birthDate ? new Date(birthDate) : null;

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        throw new Error('CURRENT_PASSWORD_REQUIRED');
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, existingUser.password);
      if (!isCurrentPasswordValid) {
        throw new Error('INVALID_CURRENT_PASSWORD');
      }

      // Hash new password
      updateFields.password = await hashPassword(newPassword);
    }

    // Update user
    const updatedUser = await getPrismaClient().user.update({
      where: { id: userId },
      data: updateFields,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        is2FAEnabled: true,
        loyaltyPoints: true,
        birthDate: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log profile update activity
    await this.logActivity({
      userId,
      action: ActivityAction.USER_UPDATED,
      entity: 'User',
      entityId: userId,
      metadata: {
        updatedFields: Object.keys(updateFields).filter(field => field !== 'password'),
        hasPasswordChange: !!newPassword
      }
    });

    return updatedUser;
  }

  /**
   * Add new address for user
   * @param {number} userId - User ID
   * @param {Object} addressData - Address data
   * @returns {Promise<Object>} Created address
   */
  async addAddress(userId, addressData) {
      const { title, fullName, phone, address, city, province, postalCode, lat, lng, isDefault } = addressData;

      try {
          if (isDefault) {
              await getPrismaClient().address.updateMany({
                  where: { userId },
                  data: { isDefault: false }
              });
          }

          const newAddress = await getPrismaClient().address.create({
              data: {
                  userId,
                  title,
                  fullName: fullName || null,
                  phone: phone || null,
                  address,
                  city,
                  province,
                  postalCode,
                  isDefault: isDefault || false
              }
          });

          this.logActivity({
              userId,
              action: ActivityAction.USER_UPDATED,
              entity: 'Address',
              entityId: newAddress.id,
              metadata: {
                  title,
                  city,
                  province,
                  event: 'address_added',
                  method: 'POST',
                  endpoint: '/addresses',
              }
          }).catch(err => console.error('Failed to log activity:', err));

          return newAddress;

      } catch (error) {
          // log with error details
          this.logActivity({
              userId,
              action: ActivityAction.USER_UPDATED,
              entity: 'Address',
              entityId: null,
              actorType: 'USER',
              metadata: {
                  title,
                  city,
                  province,
                  event: 'address_added',
                  method: 'POST',
                  endpoint: '/addresses',
                  error: error.message,
                  errorType: error.constructor.name,
                  code: error.code || null,
              }
          }).catch(err => console.error('Failed to log activity:', err));

          throw error;
      }
  }

  /**
   * Update user address
   * @param {number} userId - User ID
   * @param {number} addressId - Address ID
   * @param {Object} updateData - Address update data
   * @returns {Promise<Object>} Updated address
   */
  async updateAddress(userId, addressId, updateData) {
      const { title, address, city, province, postalCode, lat, lng, isDefault } = updateData;

      try {
          const existingAddress = await getPrismaClient().address.findFirst({
              where: { id: addressId, userId }
          });

          if (!existingAddress) {
              throw new Error('ADDRESS_NOT_FOUND');
          }

          if (isDefault) {
              await getPrismaClient().address.updateMany({
                  where: { userId, id: { not: addressId } },
                  data: { isDefault: false }
              });
          }

          const updatedAddress = await getPrismaClient().address.update({
              where: { id: addressId },
              data: {
                  title: title !== undefined ? title : existingAddress.title,
                  address: address !== undefined ? address : existingAddress.address,
                  city: city !== undefined ? city : existingAddress.city,
                  province: province !== undefined ? province : existingAddress.province,
                  postalCode: postalCode !== undefined ? postalCode : existingAddress.postalCode,
                  lat: lat !== undefined ? lat : existingAddress.lat,
                  lng: lng !== undefined ? lng : existingAddress.lng,
                  isDefault: isDefault !== undefined ? isDefault : existingAddress.isDefault
              }
          });

          this.logActivity({
              userId,
              action: ActivityAction.USER_UPDATED,
              entity: 'Address',
              entityId: addressId,
              metadata: {
                  title: updatedAddress.title,
                  city: updatedAddress.city,
                  event: 'address_updated',
                  method: 'PUT',
                  endpoint: `/addresses/${addressId}`,
              }
          }).catch(err => console.error('Failed to log activity:', err));

          return updatedAddress;

      } catch (error) {
          this.logActivity({
              userId,
              action: ActivityAction.USER_UPDATED,
              entity: 'Address',
              entityId: addressId,
              actorType: 'USER',
              metadata: {
                  title,
                  city,
                  event: 'address_updated',
                  method: 'PUT',
                  endpoint: `/addresses/${addressId}`,
                  error: error.message,
                  errorType: error.constructor.name,
                  code: error.code || null,
              }
          }).catch(err => console.error('Failed to log activity:', err));

          throw error;
      }
  }

  /**
   * Delete user address
   * @param {number} userId - User ID
   * @param {number} addressId - Address ID
   * @returns {Promise<boolean>} Deletion result
   */
  async deleteAddress(userId, addressId) {
      try {
          const existingAddress = await getPrismaClient().address.findFirst({
              where: { id: addressId, userId }
          });

          if (!existingAddress) {
              throw new Error('ADDRESS_NOT_FOUND');
          }

          const ordersWithAddress = await getPrismaClient().order.findFirst({
              where: { addressId }
          });

          if (ordersWithAddress) {
              throw new Error('ADDRESS_IN_USE');
          }

          await getPrismaClient().address.delete({
              where: { id: addressId }
          });

          if (existingAddress.isDefault) {
              const firstAddress = await getPrismaClient().address.findFirst({
                  where: { userId },
                  orderBy: { createdAt: 'asc' }
              });

              if (firstAddress) {
                  await getPrismaClient().address.update({
                      where: { id: firstAddress.id },
                      data: { isDefault: true }
                  });
              }
          }

          this.logActivity({
              userId,
              action: ActivityAction.USER_UPDATED,
              entity: 'Address',
              entityId: addressId,
              metadata: {
                  title: existingAddress.title,
                  city: existingAddress.city,
                  event: 'address_deleted',
                  method: 'DELETE',
                  endpoint: `/addresses/${addressId}`,
              }
          }).catch(err => console.error('Failed to log activity:', err));

          return true;

      } catch (error) {
          this.logActivity({
              userId,
              action: ActivityAction.USER_UPDATED,
              entity: 'Address',
              entityId: addressId,
              actorType: 'USER',
              metadata: {
                  event: 'address_deleted',
                  method: 'DELETE',
                  endpoint: `/addresses/${addressId}`,
                  error: error.message,
                  errorType: error.constructor.name,
                  code: error.code || null,
              }
          }).catch(err => console.error('Failed to log activity:', err));

          throw error;
      }
  }

  /**
   * Get user addresses
   * @param {number} userId - User ID
   * @returns {Promise<Array>} User addresses
   */
  async getAddresses(userId) {
    return await getPrismaClient().address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { id: 'desc' }
      ]
    });
  }

  /**
   * Get user loyalty points balance and recent transactions
   * @param {number} userId - User ID
   * @param {number} limit - Number of recent transactions to fetch
   * @returns {Promise<Object>} Loyalty points data
   */
  async getLoyaltyPoints(userId, limit = 10) {
    const user = await getPrismaClient().user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const recentTransactions = await getPrismaClient().loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        points: true,
        reason: true,
        orderId: true,
        createdAt: true
      }
    });

    return {
      balance: user.loyaltyPoints,
      recentTransactions
    };
  }

  /**
   * Log user activity
   * @param {number} userId - User ID
   * @param {string} action - Action performed
   * @param {string} entity - Entity type
   * @param {number} entityId - Entity ID
   * @param {Object} details - Additional details
   */
  async logActivity({ userId, action, entity, entityId, metadata = {}, actorType = 'USER' } = {}) {
      try {
          await getPrismaClient().activityLog.create({
              data: {
                  userId,
                  action,
                  entity,
                  entityId: entityId ? String(entityId) : null,
                  actorType,
                  metadata,
                  severity: severity || (metadata?.error ? 'ERROR' : 'INFO'), 

              }
          });
      } catch (error) {
          console.error('Failed to log activity:', error);
      }
  }
}

module.exports = new UserService();
