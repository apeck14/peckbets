import mongoose from "mongoose"

if (!process.env.URI) throw new Error("Invalid URI")

const uri = process.env.URI
let isConnected = false

async function connectDB() {
  if (isConnected) return mongoose.connection

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    })

    isConnected = mongoose.connection.readyState === 1

    await mongoose.syncIndexes()
    console.log("✅ Indexes Synced")

    console.log("✅ Mongoose connected")
    return mongoose.connection
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error)
    throw error
  }
}

export default connectDB
