import express from "express";
import taskRepository from "../repositories/TaskRepository";

export const taskRouter = express.Router();

taskRouter.get("/", async (req, res, next) => {
  try {
    const { name, dueDateFrom, dueDateTo } = req.query;

    const filters = {
      name: name as string | undefined,
      dueDateFrom: dueDateFrom ? new Date(dueDateFrom as string) : undefined,
      dueDateTo: dueDateTo ? new Date(dueDateTo as string) : undefined,
    };

    const tasks = await taskRepository.getAllTasks(filters);
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

taskRouter.get("/:id", async (req, res, next) => {
  try {
    const task = await taskRepository.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

taskRouter.post("/", async (req, res, next) => {
  try {
    const { name, description, dueDate, completed } = req.body;
    const task = await taskRepository.createTask({
      name,
      description,
      dueDate,
      completed,
    });
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

taskRouter.put("/:id", async (req, res, next) => {
  try {
    const { name, description, dueDate, completed } = req.body;
    const task = await taskRepository.updateTask(req.params.id, {
      name,
      description,
      dueDate,
      completed,
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

taskRouter.delete("/:id", async (req, res, next) => {
  try {
    const task = await taskRepository.deleteTask(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
});
