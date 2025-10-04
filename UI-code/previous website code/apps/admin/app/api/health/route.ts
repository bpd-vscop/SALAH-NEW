// filepath: apps/admin/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { staffUsersCollection, rolesCollection, customersCollection } from '@automotive/database';

export async function GET() {
  const startedAt = new Date().toISOString();
  try {
    const [staffCol, rolesCol, customersCol] = await Promise.all([
      staffUsersCollection(),
      rolesCollection(),
      customersCollection(),
    ]);

    const [staffCount, roleCount, customerCount] = await Promise.all([
      staffCol.countDocuments(),
      rolesCol.countDocuments(),
      customersCol.countDocuments(),
    ]);

    const hasJwtAccess = !!process.env.JWT_ACCESS_SECRET;
    const hasJwtRefresh = !!process.env.JWT_REFRESH_SECRET;
    const hasDbUrl = !!process.env.DATABASE_URL;

    return NextResponse.json({
      ok: true,
      startedAt,
      env: {
        DATABASE_URL: hasDbUrl,
        JWT_ACCESS_SECRET: hasJwtAccess,
        JWT_REFRESH_SECRET: hasJwtRefresh,
      },
      db: {
        status: 'connected',
        counts: {
          staffUsers: staffCount,
          roles: roleCount,
          customers: customerCount,
        },
      },
      advice:
        staffCount === 0
          ? 'No staff users found. Seed with the Mongo seeding script in @automotive/database'
          : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        startedAt,
        error: error?.message || 'Unknown error',
        env: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          JWT_ACCESS_SECRET: !!process.env.JWT_ACCESS_SECRET,
          JWT_REFRESH_SECRET: !!process.env.JWT_REFRESH_SECRET,
        },
      },
      { status: 500 },
    );
  }
}
