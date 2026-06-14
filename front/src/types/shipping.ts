// Shipping Method related types

export interface ShippingMethod {
    id: number;
    basalamId: number;
    name: string;
    description?: string;
    baseCost: number;
    additionalCost: number;
    additionalDimensionsCost?: number;
    isPrivate: boolean;
    isActive: boolean;
    lastSyncedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface ShippingMethodStats {
    shippingMethodId: number;
    shippingMethodName: string;
    usageCount: number;
    usagePercentage: number;
    totalRevenue: number;
}

export interface ShippingCostCalculation {
    shippingMethodId: number;
    baseCost: number;
    additionalCost: number;
    dimensionsCost: number;
    totalCost: number;
}

export interface OrderDetails {
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    quantity: number;
}

export interface DateRange {
    startDate: string;
    endDate: string;
}
