import {
  clearToken,
  getMe,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  getToken,
} from "./api.js";

const STATUSES = ["pendente", "fazendo", "concluido"];

// Cache local global para manter o estado atual dos filtros ativos
let currentOwnerFilter = null;
let currentStatusFilter = null;

function $(id) {
  return document.getElementById(id);
}

function mustAuth() {
  if (!getToken()) {
    window.location.href = "./login.html";
    return false;
  }
  return true;
}

function safeText(s) {
  return (s ?? "").toString();
}

function setCounts(tasks) {
  for (const st of STATUSES) {
    const count = tasks.filter((t) => (t.status || "").toLowerCase() === st).length;
    $(`count-${st}`).textContent = String(count);
  }
}

function makeTaskEl(task) {
  const el = document.createElement("article");
  el.className = "task";
  el.dataset.id = task.id;

  const title = safeText(task.title);
  const desc = safeText(task.description);
  const owner = safeText(task.owner);
  const status = safeText(task.status).toLowerCase();
  const comments = Array.isArray(task.comments) ? task.comments : [];

  el.innerHTML = `
    <div class="task__top">
      <div>
        <h3 class="task__title">${escapeHtml(title)}</h3>
        <div class="task__desc">${escapeHtml(desc)}</div>
      </div>
      <div class="task__actions">
        <button class="iconbtn" data-action="toggle-comments" title="Comentários">💬</button>
        <button class="iconbtn" data-action="move-left" title="Mover para a esquerda">←</button>
        <button class="iconbtn" data-action="move-right" title="Mover para a direita">→</button>
        <button class="iconbtn iconbtn--danger" data-action="delete" title="Excluir">🗑</button>
      </div>
    </div>

    <div class="task__meta">
      <span class="tag">Dono: <strong>${escapeHtml(owner)}</strong></span>
      <span class="tag">Status: <strong>${escapeHtml(status)}</strong></span>
      <span class="tag">Comentários: <strong data-role="comments-count">${comments.length}</strong></span>
    </div>

    <section class="comments" data-role="comments">
      <div class="comments__list" data-role="comments-list">
        ${comments.map((c) => `<div class="comment">${escapeHtml(c)}</div>`).join("")}
      </div>
      <form class="comments__form" data-role="comments-form">
        <input name="comment" type="text" placeholder="Adicionar comentário..." required />
        <button class="btn btn--primary" type="submit">Enviar</button>
      </form>
    </section>
  `;

  el.addEventListener("click", async (e) => {
    const btn = e.target?.closest?.("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (!action) return;

    if (action === "toggle-comments") {
      const c = el.querySelector('[data-role="comments"]');
      c?.classList.toggle("is-open");
      return;
    }

    if (action === "delete") {
      await handleDelete(task.id);
      return;
    }

    if (action === "move-left" || action === "move-right") {
      const idx = STATUSES.indexOf(status);
      const next =
        action === "move-left" ? STATUSES[idx - 1] : STATUSES[idx + 1];
      if (!next) return;
      await handleUpdate(task, { status: next });
      return;
    }
  });

  const form = el.querySelector('[data-role="comments-form"]');
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[name="comment"]');
    const value = input.value.trim();
    if (!value) return;

    const nextComments = [...comments, value];
    await handleUpdate(task, { comments: nextComments });
    input.value = "";
  });

  return el;
}

function escapeHtml(str) {
  return safeText(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "'");
}

let me = null;
let tasksCache = [];

// A função refresh agora aceita e persiste os filtros de busca
async function refresh(owner = null, status = null) {
  if (!mustAuth()) return;

  // Atualiza as variáveis de controle global para manter a busca ativa em outras ações
  currentOwnerFilter = owner;
  currentStatusFilter = status;

  const filters = {};
  if (owner) filters.owner = owner;
  if (status) filters.status = status;

  // Passa os filtros estruturados para o listTasks da api.js
  tasksCache = await listTasks(filters);
  setCounts(tasksCache);

  for (const st of STATUSES) {
    const col = $(`col-${st}`);
    if (!col) continue; // Prevenção de quebra caso a coluna não exista no HTML
    col.innerHTML = "";
    const tasks = tasksCache
      .filter((t) => (t.status || "").toLowerCase() === st)
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    for (const t of tasks) col.appendChild(makeTaskEl(t));
  }
}

async function handleDelete(id) {
  if (!confirm("Excluir esta task?")) return;
  await deleteTask(id);
  // Atualiza mantendo os mesmos filtros de busca aplicados antes da exclusão
  await refresh(currentOwnerFilter, currentStatusFilter);
}

async function handleUpdate(task, patch) {
  const next = {
    title: task.title,
    description: task.description,
    owner: task.owner,
    status: task.status,
    comments: Array.isArray(task.comments) ? task.comments : [],
    ...patch,
  };
  await updateTask(task.id, next);
  // Atualiza mantendo os mesmos filtros de busca aplicados antes da edição
  await refresh(currentOwnerFilter, currentStatusFilter);
}

// Dialog criar task
const dialog = $("taskDialog");
const fab = $("newTaskFab");
const taskForm = $("taskForm");
const closeTaskDialog = $("closeTaskDialog");
const cancelTaskDialog = $("cancelTaskDialog");
const searchInput = $("searchInput");
const formBusca = $("formBusca");

fab.addEventListener("click", () => {
  $("taskTitle").value = "";
  $("taskDescription").value = "";
  $("taskStatus").value = "pendente";
  dialog.showModal();
});

function closeDialog() {
  dialog.close();
}

closeTaskDialog.addEventListener("click", closeDialog);
cancelTaskDialog.addEventListener("click", closeDialog);

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = $("taskTitle").value.trim();
  const description = $("taskDescription").value.trim();
  const status = $("taskStatus").value;
  if (!title || !description) return;

  await createTask({
    title,
    description,
    owner: me?.username || "admin",
    status,
    comments: [],
  });
  dialog.close();
  // Atualiza mantendo a listagem atual filtrada se houver alguma ativa
  await refresh(currentOwnerFilter, currentStatusFilter);
});

// Evento de submit do formulário de busca
formBusca.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const termoPesquisa = searchInput.value.trim();
  
  let ownerFilter = null;
  let statusFilter = null;

  if (termoPesquisa) {
    const termoMinusculo = termoPesquisa.toLowerCase();

    // Se o termo corresponder a um status conhecido, filtra por status
    if (STATUSES.includes(termoMinusculo)) {
      statusFilter = termoMinusculo;
    } else {
      // Caso contrário, trata como filtragem de dono
      ownerFilter = termoPesquisa;
    }
  }

  // Aciona a atualização passando os novos filtros coletados
  await refresh(ownerFilter, statusFilter);
});

// Logout
$("logoutBtn").addEventListener("click", () => {
  clearToken();
  window.location.href = "./login.html";
});

// Boot
// Substitua o bloco da sua função boot antiga no final do arquivo por este:
(async function boot() {
  if (!mustAuth()) return;

  try {
    const formBuscaElement = $("formBusca");
    const searchInputElement = $("searchInput");
    // 1. MAPEIA O BOTÃO DO HTML PELO ID
    const clearSearchBtn = $("clearSearchBtn"); 

    if (formBuscaElement && searchInputElement) {
      formBuscaElement.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const termoPesquisa = searchInputElement.value.trim();
        let ownerFilter = null;
        let statusFilter = null;

        if (termoPesquisa) {
          const termoMinusculo = termoPesquisa.toLowerCase();

          if (STATUSES.includes(termoMinusculo)) {
            statusFilter = termoMinusculo;
          } else {
            ownerFilter = termoPesquisa;
          }
        }

        await refresh(ownerFilter, statusFilter);
      });
    } else {
      console.warn("Aviso: Elementos do formBusca não foram encontrados no HTML ainda.");
    }

    // 2. ADICIONA A LÓGICA DE CLIQUE E ATUALIZAÇÃO DO BOTÃO LIMPAR
    if (clearSearchBtn && searchInputElement) {
      clearSearchBtn.addEventListener("click", async () => {
        searchInputElement.value = ""; // Esvazia o campo de texto visualmente
        
        // Zera as variáveis de controle global para garantir que a busca foi apagada da memória
        currentOwnerFilter = null;
        currentStatusFilter = null;

        // Faz a chamada limpa trazendo todas as tasks originais de volta
        await refresh(null, null); 
      });
    }

    me = await getMe();
    $("me").textContent = me?.username || "usuário";
    await refresh();
    
  } catch (err) {
    console.error("Erro durante a inicialização (boot):", err);
    clearToken();
    window.location.href = "./login.html";
  }
})();


