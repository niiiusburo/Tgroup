import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

export async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

export default mongoose;
