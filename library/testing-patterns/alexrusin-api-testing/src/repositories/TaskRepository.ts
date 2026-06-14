import Task, { ITask } from "../models/Task";

interface TaskFilters {
  name?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
}

class TaskRepository {
  async getAllTasks(filters: TaskFilters): Promise<ITask[]> {
    const filter: any = {};

    if (filters.name) {
      filter.name = { $regex: filters.name, $options: "i" };
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      filter.dueDate = {};
      if (filters.dueDateFrom) {
        filter.dueDate.$gte = filters.dueDateFrom;
      }
      if (filters.dueDateTo) {
        filter.dueDate.$lte = filters.dueDateTo;
      }
    }

    return await Task.find(filter).sort({ createdAt: -1 });
  }

  async getTaskById(id: string): Promise<ITask | null> {
    return await Task.findById(id);
  }

  async createTask(taskData: Partial<ITask>): Promise<ITask> {
    const task = new Task(taskData);
    await task.save();
    return task;
  }

  async updateTask(
    id: string,
    taskData: Partial<ITask>,
  ): Promise<ITask | null> {
    return await Task.findByIdAndUpdate(id, taskData, {
      new: true,
      runValidators: true,
    });
  }

  async deleteTask(id: string): Promise<ITask | null> {
    return await Task.findByIdAndDelete(id);
  }
}

export default new TaskRepository();
