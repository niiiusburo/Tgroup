import mongoose, { Document, Schema } from "mongoose";

interface ITask extends Document {
  name: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    name: {
      type: String,
      required: [true, "Task name is required"],
      trim: true,
      maxlength: [100, "Task name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    dueDate: {
      type: Date,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Task = mongoose.model<ITask>("Task", taskSchema);

export default Task;
export type { ITask };
