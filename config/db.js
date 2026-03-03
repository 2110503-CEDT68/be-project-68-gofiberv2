const mongoose = require('mongoose');

const connectDB = async () => {
    mongoose.set('strictQuery', true);
    // Connect to the database using the connection string from environment variables
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
}

module.exports = connectDB;
