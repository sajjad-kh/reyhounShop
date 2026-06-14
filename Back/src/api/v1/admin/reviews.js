const express = require('express');
const { 
  authenticateToken, 
  requireRole, 
  validateInput,
  asyncHandler 
} = require('../../../middleware');
const reviewService = require('../../../services/reviewService');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const moderateReviewSchema = Joi.object({
  isApproved: Joi.boolean().required()
});

const reviewQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('createdAt', 'rating').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

router.get('/',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(reviewQuerySchema, 'query'),
  asyncHandler(async (req, res) => {

    const result = await reviewService.getAllReviews(req.query);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @swagger
 * /api/v1/admin/reviews/pending:
 *   get:
 *     summary: Get pending reviews for moderation
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, rating]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Pending reviews retrieved successfully
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
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/pending',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(reviewQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await reviewService.getPendingReviews(req.query);
    
    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @swagger
 * /api/v1/admin/reviews/{reviewId}/moderate:
 *   put:
 *     summary: Approve or reject a review
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isApproved
 *             properties:
 *               isApproved:
 *                 type: boolean
 *                 description: Whether to approve (true) or reject (false) the review
 *     responses:
 *       200:
 *         description: Review moderated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Review not found
 */
router.put('/:reviewId/moderate',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(moderateReviewSchema),
  asyncHandler(async (req, res) => {
    const reviewId = parseInt(req.params.reviewId);
    
    if (isNaN(reviewId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REVIEW_ID',
          message: 'Review ID must be a valid number'
        }
      });
    }

    const { isApproved } = req.body;

    try {
      const review = await reviewService.moderateReview(reviewId, isApproved, req.user.userId);
      
      res.json({
        success: true,
        data: review,
        message: `Review ${isApproved ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      if (error.message === 'Review not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'REVIEW_NOT_FOUND',
            message: 'Review not found'
          }
        });
      }
      
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/admin/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Review not found
 */
router.delete('/:reviewId',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const reviewId = parseInt(req.params.reviewId);
    
    if (isNaN(reviewId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REVIEW_ID',
          message: 'Review ID must be a valid number'
        }
      });
    }

    try {
      await reviewService.deleteReview(reviewId, req.user.userId, true);
      
      res.json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Review not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'REVIEW_NOT_FOUND',
            message: 'Review not found'
          }
        });
      }
      
      throw error;
    }
  })
);

module.exports = router;