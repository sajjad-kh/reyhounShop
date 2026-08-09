const { getPrismaClient } = require('../utils/database');

class InventoryItemService {
  async getAll(options = {}) {
    const {
      search,
      lowStockOnly = false,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (lowStockOnly) {
      where.quantity = { lte: getPrismaClient().inventoryItem.fields.lowStockAlert };
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [items, total] = await Promise.all([
      getPrismaClient().inventoryItem.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      getPrismaClient().inventoryItem.count({ where }),
    ]);

    const enriched = items.map((item) => ({
      ...item,
      isLowStock: item.quantity <= item.lowStockAlert,
      isOutOfStock: item.quantity <= 0,
      stockStatus: item.quantity <= 0 ? 'OUT_OF_STOCK' : item.quantity <= item.lowStockAlert ? 'LOW_STOCK' : 'IN_STOCK',
    }));

    return {
      items: enriched,
      pagination: {
        page,
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    };
  }

  async getById(id) {
    const item = await getPrismaClient().inventoryItem.findUnique({
      where: { id },
    });

    if (!item) throw new Error('NOT_FOUND');

    return {
      ...item,
      isLowStock: item.quantity <= item.lowStockAlert,
      isOutOfStock: item.quantity <= 0,
      stockStatus: item.quantity <= 0 ? 'OUT_OF_STOCK' : item.quantity <= item.lowStockAlert ? 'LOW_STOCK' : 'IN_STOCK',
    };
  }

  async getMovements(id, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 50);

    const existing = await getPrismaClient().inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new Error('NOT_FOUND');

    const [movements, total] = await Promise.all([
      getPrismaClient().inventoryMovement.findMany({
        where: { inventoryItemId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      getPrismaClient().inventoryMovement.count({ where: { inventoryItemId: id } }),
    ]);

    return {
      movements,
      pagination: {
        page,
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    };
  }

  async create(data) {
    const { name, sku, description, quantity, lowStockAlert, unit, costPrice, sellPrice, location, supplier, minOrderQty } = data;

    return getPrismaClient().inventoryItem.create({
      data: {
        name,
        sku: sku || null,
        description: description || null,
        quantity: quantity || 0,
        lowStockAlert: lowStockAlert || 5,
        unit: unit || 'عدد',
        costPrice: costPrice || null,
        sellPrice: sellPrice || null,
        location: location || null,
        supplier: supplier || null,
        minOrderQty: minOrderQty || 1,
      },
    });
  }

  async update(id, data) {
    const existing = await getPrismaClient().inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new Error('NOT_FOUND');

    return getPrismaClient().inventoryItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.sku !== undefined && { sku: data.sku || null }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.lowStockAlert !== undefined && { lowStockAlert: data.lowStockAlert }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice || null }),
        ...(data.sellPrice !== undefined && { sellPrice: data.sellPrice || null }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.supplier !== undefined && { supplier: data.supplier }),
        ...(data.minOrderQty !== undefined && { minOrderQty: data.minOrderQty }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async adjustQuantity(id, data) {
    const { type, quantity, note, userId } = data;

    if (!['IN', 'OUT', 'ADJUST', 'RETURN'].includes(type)) {
      throw new Error('INVALID_TYPE');
    }

    if (quantity <= 0) throw new Error('INVALID_QUANTITY');

    const existing = await getPrismaClient().inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new Error('NOT_FOUND');

    let newQuantity;
    if (type === 'IN' || type === 'RETURN') {
      newQuantity = existing.quantity + quantity;
    } else if (type === 'OUT') {
      if (existing.quantity < quantity) throw new Error('INSUFFICIENT_STOCK');
      newQuantity = existing.quantity - quantity;
    } else {
      newQuantity = quantity;
    }

    const [updatedItem] = await getPrismaClient().$transaction([
      getPrismaClient().inventoryItem.update({
        where: { id },
        data: { quantity: newQuantity },
      }),
      getPrismaClient().inventoryMovement.create({
        data: {
          inventoryItemId: id,
          type,
          quantity,
          note: note || null,
          createdBy: userId || null,
        },
      }),
    ]);

    return updatedItem;
  }

  async getStats() {
    const [totalItems, lowStockItems, outOfStockItems, totalValue] = await Promise.all([
      getPrismaClient().inventoryItem.count({ where: { isActive: true } }),
      getPrismaClient().inventoryItem.count({
        where: {
          isActive: true,
          quantity: { lte: getPrismaClient().inventoryItem.fields.lowStockAlert },
        },
      }),
      getPrismaClient().inventoryItem.count({
        where: { isActive: true, quantity: { lte: 0 } },
      }),
      getPrismaClient().inventoryItem.aggregate({
        where: { isActive: true },
        _sum: {
          quantity: true,
        },
      }),
    ]);

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalUnits: totalValue._sum.quantity || 0,
    };
  }

  async delete(id) {
    const existing = await getPrismaClient().inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new Error('NOT_FOUND');

    return getPrismaClient().inventoryItem.delete({ where: { id } });
  }
}

module.exports = new InventoryItemService();
