import app from "./server";
import { connectToDatabase } from "./db";

const port = parseInt(process.env.PORT || "3000");

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(port, () => {
      console.log(`Express is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
