const mongoose = require('mongoose');
const dns = require('dns');

// Use Google DNS to resolve MongoDB Atlas SRV records
// (some ISP DNS servers block SRV queries)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`⚠️  MongoDB Connection Error: ${error.message}`);
    console.error(`   Server will continue without DB. Claims will not be persisted.`);
    console.error(`   Fix your MONGODB_URI in .env and restart.`);
  }
};

module.exports = connectDB;
