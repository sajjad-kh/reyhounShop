const prisma = require("../lib/prisma");

class LogService {
  async create(data) {
    return prisma.activityLog.create({
      data,
    });
  }
}

module.exports = new LogService();