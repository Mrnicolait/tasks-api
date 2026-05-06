try:
    from .task_schema import Task, TaskCreate, TaskUpdate
except ImportError:
    from schemas.task_schema import Task, TaskCreate, TaskUpdate

__all__ = ["Task", "TaskCreate", "TaskUpdate"]
