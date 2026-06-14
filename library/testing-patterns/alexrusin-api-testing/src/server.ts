import "source-map-support/register";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { taskRouter } from "./routes/tasks";
import errorHandler from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(morgan("tiny"));

app.use(express.json());

app.use("/tasks", taskRouter);

app.use(errorHandler);

export default app;
