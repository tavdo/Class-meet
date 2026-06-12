const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function connectDb() {
  await prisma.$connect();
}

module.exports = { prisma, connectDb };
