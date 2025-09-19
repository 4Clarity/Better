import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

/**
 * Get a singleton instance of PrismaClient
 * Ensures only one connection pool is created per application
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

/**
 * Disconnect from the database and clean up the singleton instance
 * Should be called when the application shuts down
 */
export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

/**
 * For testing purposes - allows injection of mock clients
 */
export function setPrismaClient(client: PrismaClient): void {
  prismaInstance = client;
}