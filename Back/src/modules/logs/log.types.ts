export interface CreateLogInput {

  userId?: number;

  targetUserId?: number;

  orderId?: number;

  action: string;

  entity: string;

  entityId?: number;

  success?: boolean;

  severity?: string;

  correlationId?: string;

  sessionId?: string;

  metadata?: Record<string, any>;

  ip?: string;

  userAgent?: string;
}