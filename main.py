from fastapi import FastAPI

from routes.task_routes import router

app = FastAPI(
    title="Todo API",
    description="API para gerenciamento de tarefas com arquitetura em camadas.",
    version="1.0.0",
    contact={
        "name": "Equipe da disciplina INF8B",
    },
)

app.include_router(router)
