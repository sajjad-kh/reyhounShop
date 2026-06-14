const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../middleware/auth');
const { getPrismaClient } = require('../../utils/database');

router.get('/my', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();

    const reviews = await prisma.review.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: reviews
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'خطا در دریافت نظرات'
    });
  }
});

router.post('/:productId', authenticateToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();

    const productId = Number(req.params.productId);
    const userId = req.user.id;

    const { rating, comment, orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_ID_REQUIRED',
          message: 'Order ID is required to submit a review'
        }
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RATING',
          message: 'Rating must be between 1 and 5'
        }
      });
    }

    // ⭐ برای 1 تا 3 کامنت اجباری
    if (rating <= 3 && (!comment || !comment.trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'COMMENT_REQUIRED',
          message: 'Comment is required for ratings 1 to 3'
        }
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    const deliveredOrderItem = await prisma.orderItem.findFirst({
      where: {
        productId,
        orderId: Number(orderId),
        order: {
          userId,
          status: 'DELIVERED'
        }
      }
    });

    if (!deliveredOrderItem) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_PURCHASED',
          message: 'You can only review purchased products'
        }
      });
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        productId,
        userId,
        orderId: Number(orderId)
      }
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_REVIEW',
          message: 'You have already reviewed this product for this order'
        }
      });
    }

    const hasComment = !!comment?.trim();

    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        orderId: Number(orderId),
        rating,
        comment: hasComment ? comment.trim() : '',

        // بدون کامنت => تایید خودکار
        // با کامنت => نیاز به تایید ادمین
        isApproved: !hasComment
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: review
    });

  } catch (error) {
    console.error('CREATE REVIEW ERROR:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      }
    });
  }
});

module.exports = router;