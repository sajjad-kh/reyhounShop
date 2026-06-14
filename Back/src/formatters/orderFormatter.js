class OrderFormatter {
  static format(order) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    const normalize = (p) =>
      !p ? null : p.startsWith('http') ? p : `${baseUrl}${p}`;

    const paymentReceipt = order.attachments?.find(
      a => a.type === 'PAYMENT_RECEIPT'
    );

    const designFiles = order.attachments?.filter(
      a => a.type === 'REFERENCE_IMAGE'
    ) || [];

    return {
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      paymentStatus: order.paymentStatus,

      totalPrice: order.totalPrice || 0,
      shippingCost: order.shippingCost || 0,
      discountAmount: order.discountAmount || 0,

      paymentProofUrl: paymentReceipt
        ? normalize(paymentReceipt.url)
        : null,

      designFiles: designFiles.map(file => ({
        id: file.id,
        url: normalize(file.url),
        originalName: file.originalName,
        mimeType: file.mimeType
      })),

      messages: (order.messages || []).map(m => ({
        id: m.id,
        type: m.type,
        message: m.message,
        isAdmin: m.isAdmin,
        createdAt: m.createdAt,
        user: m.user
      })),

      designVersions: order.designVersions || [],
      statusHistory: order.statusHistory || [],
      createdAt: order.createdAt,

      items: (order.items || []).map(i => ({
        id: i.id,
        quantity: i.quantity,
        price: i.price,
        product: {
          id: i.product.id,
          name: i.product.name,
          image: i.product.images?.[0]?.url || null,
          images: i.product.images?.map(img => img.url) || []
        }
      })),

      // 👇 اینو بعداً اضافه می‌کنیم برای timeline
      timeline: order.timeline || []
    };
  }
}

module.exports = OrderFormatter;