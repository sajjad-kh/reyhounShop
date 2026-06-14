const express = require('express');
const userService = require('../../services/userService');
const { authenticateToken } = require('../../middleware/auth');
const { validate } = require('../../utils/validation');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const profileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional().allow(null, ''),
  birthDate: Joi.date().max('now').optional().allow(null),
  currentPassword: Joi.string().when('newPassword', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).optional()
});

const addressSchema = Joi.object({
  title: Joi.string().min(1).max(50).required(),
  address: Joi.string().min(5).max(200).required(),
  city: Joi.string().min(2).max(50).required(),
  province: Joi.string().min(2).max(50).required(),
  postalCode: Joi.string().min(5).max(20).required(),
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  isDefault: Joi.boolean().optional()
});

const addressUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(50).optional(),
  address: Joi.string().min(5).max(200).optional(),
  city: Joi.string().min(2).max(50).optional(),
  province: Joi.string().min(2).max(50).optional(),
  postalCode: Joi.string().min(5).max(20).optional(),
  lat: Joi.number().min(-90).max(90).optional().allow(null),
  lng: Joi.number().min(-180).max(180).optional().allow(null),
  isDefault: Joi.boolean().optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *         loyaltyPoints:
 *           type: integer
 *         birthDate:
 *           type: string
 *           format: date
 *         addresses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Address'
 *     
 *     Address:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         address:
 *           type: string
 *         city:
 *           type: string
 *         province:
 *           type: string
 *         postalCode:
 *           type: string
 *         lat:
 *           type: number
 *         lng:
 *           type: number
 *         isDefault:
 *           type: boolean
 */

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await userService.getProfile(req.user.id);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Failed to retrieve user profile'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               currentPassword:
 *                 type: string
 *                 description: Required when changing password
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (must meet complexity requirements)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error or invalid current password
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/profile', authenticateToken, validate(profileUpdateSchema), async (req, res) => {
  try {
    const updatedProfile = await userService.updateProfile(req.user.id, req.body);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    
    if (error.message === 'PHONE_ALREADY_EXISTS') {
      return res.status(400).json({
        error: {
          code: 'PHONE_ALREADY_EXISTS',
          message: 'Phone number is already associated with another account'
        }
      });
    }
    
    if (error.message === 'CURRENT_PASSWORD_REQUIRED') {
      return res.status(400).json({
        error: {
          code: 'CURRENT_PASSWORD_REQUIRED',
          message: 'Current password is required to change password'
        }
      });
    }
    
    if (error.message === 'INVALID_CURRENT_PASSWORD') {
      return res.status(400).json({
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: 'Failed to update profile'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/users/addresses:
 *   get:
 *     summary: Get user addresses
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Addresses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Address'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/addresses', authenticateToken, async (req, res) => {
  try {
    const addresses = await userService.getAddresses(req.user.id);
    
    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    
    res.status(500).json({
      error: {
        code: 'ADDRESSES_FETCH_FAILED',
        message: 'Failed to retrieve addresses'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/users/addresses:
 *   post:
 *     summary: Add new address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - address
 *               - city
 *               - province
 *               - postalCode
 *             properties:
 *               title:
 *                 type: string
 *                 description: Address title (e.g., Home, Work)
 *               address:
 *                 type: string
 *                 description: Full address
 *               city:
 *                 type: string
 *               province:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               lat:
 *                 type: number
 *                 description: Latitude (optional)
 *               lng:
 *                 type: number
 *                 description: Longitude (optional)
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default address
 *     responses:
 *       201:
 *         description: Address added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/addresses', authenticateToken, validate(addressSchema), async (req, res) => {
  try {
    const newAddress = await userService.addAddress(req.user.id, req.body);
    
    // Return all user addresses after adding new one
    const allAddresses = await userService.getAddresses(req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: allAddresses
    });
  } catch (error) {
    console.error('Add address error:', error);
    
    res.status(500).json({
      error: {
        code: 'ADDRESS_ADD_FAILED',
        message: 'Failed to add address'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/users/addresses/{addressId}:
 *   put:
 *     summary: Update address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               province:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Internal server error
 */
router.put('/addresses/:addressId', authenticateToken, validate(addressUpdateSchema), async (req, res) => {
  try {
    const addressId = parseInt(req.params.addressId);
    
    if (isNaN(addressId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ADDRESS_ID',
          message: 'Invalid address ID'
        }
      });
    }
    
    const updatedAddress = await userService.updateAddress(req.user.id, addressId, req.body);
    
    res.json({
      success: true,
      message: 'Address updated successfully',
      data: updatedAddress
    });
  } catch (error) {
    console.error('Update address error:', error);
    
    if (error.message === 'ADDRESS_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found or does not belong to user'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'ADDRESS_UPDATE_FAILED',
        message: 'Failed to update address'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/users/addresses/{addressId}:
 *   delete:
 *     summary: Delete address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       400:
 *         description: Address is in use or invalid ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Internal server error
 */
router.delete('/addresses/:addressId', authenticateToken, async (req, res) => {
  try {
    const addressId = parseInt(req.params.addressId);
    
    if (isNaN(addressId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ADDRESS_ID',
          message: 'Invalid address ID'
        }
      });
    }
    
    await userService.deleteAddress(req.user.id, addressId);
    
    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    
    if (error.message === 'ADDRESS_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found or does not belong to user'
        }
      });
    }
    
    if (error.message === 'ADDRESS_IN_USE') {
      return res.status(400).json({
        error: {
          code: 'ADDRESS_IN_USE',
          message: 'Cannot delete address that is associated with existing orders'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'ADDRESS_DELETE_FAILED',
        message: 'Failed to delete address'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/users/loyalty-points:
 *   get:
 *     summary: Get loyalty points balance and recent transactions
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent transactions to fetch
 *     responses:
 *       200:
 *         description: Loyalty points data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: integer
 *                     recentTransactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           points:
 *                             type: integer
 *                           reason:
 *                             type: string
 *                           orderId:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/loyalty-points', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const loyaltyData = await userService.getLoyaltyPoints(req.user.id, limit);
    
    res.json({
      success: true,
      data: loyaltyData
    });
  } catch (error) {
    console.error('Get loyalty points error:', error);
    
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'LOYALTY_POINTS_FETCH_FAILED',
        message: 'Failed to retrieve loyalty points data'
      }
    });
  }
});

module.exports = router;