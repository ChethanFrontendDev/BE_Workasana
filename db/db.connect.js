const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGODB;

const initializeDatabse = async () => {
  try {
    const connection = await mongoose.connect(mongoUri);

    if (connection) {
      console.log("Connected to Database");
    }
  } catch (error) {
    console.log("Failed to Connect", error);
  }
};

module.exports = { initializeDatabse };
