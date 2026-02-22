// src/lib/audit.ts
import { db } from "./db";

export async function auditLog(
  userId: string,
  action: string,
  resource?: string,
  metadata?: Record<string, any>
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        resource,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err);
    // Non-blocking - don't throw
  }
}
