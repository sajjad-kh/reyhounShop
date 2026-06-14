const { getPrismaClient } = require('../utils/database');
const { hashPassword, comparePassword } = require('../utils/auth');

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
    await this.logActivity(userId, 'user.profile_updated', 'User', userId, {
      updatedFields: Object.keys(updateFields).filter(field => field !== 'password'),
      hasPasswordChange: !!newPassword
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

    // If this is set as default, unset other default addresses
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

    // Log address creation activity (non-blocking)
    this.logActivity(userId, 'user.address_added', 'Address', newAddress.id, {
      title,
      city,
      province
    }).catch(err => console.error('Failed to log activity:', err));

    return newAddress;
  }

  /**
   * Update user address
   * @param {number} userId - User ID
   * @param {number} addressId - Address ID
   * @param {Object} updateData - Address update data
   * @returns {Promise<Object>} Updated address
   */
  async updateAddress(userId, addressId, updateData) {
    // Check if address belongs to user
    const existingAddress = await getPrismaClient().address.findFirst({
      where: { id: addressId, userId }
    });

    if (!existingAddress) {
      throw new Error('ADDRESS_NOT_FOUND');
    }

    const { title, address, city, province, postalCode, lat, lng, isDefault } = updateData;

    // If this is set as default, unset other default addresses
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

    // Log address update activity (non-blocking)
    this.logActivity(userId, 'user.address_updated', 'Address', addressId, {
      title: updatedAddress.title,
      city: updatedAddress.city
    }).catch(err => console.error('Failed to log activity:', err));

    return updatedAddress;
  }

  /**
   * Delete user address
   * @param {number} userId - User ID
   * @param {number} addressId - Address ID
   * @returns {Promise<boolean>} Deletion result
   */
  async deleteAddress(userId, addressId) {
    try {
      console.log(`🗑️ Attempting to delete address ${addressId} for user ${userId}`);
      
      // Check if address belongs to user
      const existingAddress = await getPrismaClient().address.findFirst({
        where: { id: addressId, userId }
      });

      if (!existingAddress) {
        console.log(`❌ Address ${addressId} not found for user ${userId}`);
        throw new Error('ADDRESS_NOT_FOUND');
      }

      console.log(`✅ Found address:`, existingAddress);

      // Check if address is used in any orders
      const ordersWithAddress = await getPrismaClient().order.findFirst({
        where: { addressId }
      });

      if (ordersWithAddress) {
        console.log(`❌ Address ${addressId} is in use by order ${ordersWithAddress.id}`);
        throw new Error('ADDRESS_IN_USE');
      }

      console.log(`🗑️ Deleting address ${addressId} from database...`);
      await getPrismaClient().address.delete({
        where: { id: addressId }
      });
      console.log(`✅ Address ${addressId} deleted from database`);

      // If deleted address was default, set another address as default
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

      // Log address deletion activity (non-blocking)
      try {
        await this.logActivity(userId, 'user.address_deleted', 'Address', addressId, {
          title: existingAddress.title,
          city: existingAddress.city
        });
      } catch (logError) {
        console.error('Failed to log activity (non-critical):', logError);
      }

      console.log(`✅ Address ${addressId} deleted successfully for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Delete address error:', error);
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
  async logActivity(userId, action, entity, entityId, details = {}) {
    try {
      await getPrismaClient().activityLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          details
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }
}

module.exports = new UserService();
