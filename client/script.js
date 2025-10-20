const wishlistEl = document.getElementById("wishlist");
const adminToggle = document.getElementById("adminToggle");
const adminPanel = document.getElementById("adminPanel");
const wishlistProgress = document.getElementById("wishlistProgress");
const addItemBtn = document.getElementById("addItemBtn");
const filterStatus = document.getElementById("filterStatus");
const filterReservedBy = document.getElementById("filterReservedBy");
const sortBy = document.getElementById("sortBy");
const order = document.getElementById("order");
const applyFilters = document.getElementById("applyFilters");
const resetFilters = document.getElementById("resetFilters");
const toggleBtn = document.getElementById("toggleViewBtn");
const progressTotals = document.getElementById("progressTotals");
const progressReservado = document.querySelector(".progress-reservado");
const progressComprado = document.querySelector(".progress-comprado");

let currentFilters = {};

let token = localStorage.getItem("adminToken") || null;

// 🔐 Login persistente via servidor
async function login(user, pass) {
  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, pass }),
  });

  if (!res.ok) throw new Error("Credenciais inválidas");

  const data = await res.json();
  token = data.token;
  localStorage.setItem("adminToken", token);
}

async function logout() {
  token = null;
  localStorage.removeItem("adminToken");
}

// 📦 Carregar lista
async function loadWishlist() {
  const params = new URLSearchParams();

  if (currentFilters.status) params.append("status", currentFilters.status);
  if (currentFilters.reservedBy) params.append("reservedBy", currentFilters.reservedBy);
  if (currentFilters.sortBy) params.append("sortBy", currentFilters.sortBy);
  if (currentFilters.order) params.append("order", currentFilters.order);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/wishlist${query}`);
  const data = await res.json();
  renderWishlist(data);
  
  if (token) {
    await updateProgressBar();
  }
}

// 🎨 Renderizar os cards com a NOVA estrutura melhorada
function renderWishlist(items) {
  wishlistEl.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";

    // texto do estado
    let statusText = "";
    if (item.status === "disponivel") {
      statusText = "Disponível";
    } else if (item.status === "reservado") {
      statusText = `Reservado - ${item.reservedBy}`;
    } else if (item.status === "comprado") {
      statusText = `Comprado - ${item.reservedBy}`;
    }

    // Botões de ação baseado no estado
    let actionButtons = "";
    if (token) {
      // Admin: apenas apagar
      actionButtons = `<button class="danger" onclick="deleteItem(${item.id})">Apagar</button>`;
    } else {
      // Usuário normal
      if (item.status === "disponivel") {
        actionButtons = `
          <button class="warning" onclick="updateItem(${item.id}, 'reservado')">Reservar</button>
          <button class="good" onclick="updateItem(${item.id}, 'comprado')">Comprar</button>
        `;
      } else if (item.status === "reservado") {
        actionButtons = `
          <button class="good" onclick="updateItem(${item.id}, 'comprado')">Comprado</button>
          <button class="danger" onclick="updateItem(${item.id}, 'disponivel')">Cancelar</button>
        `;
      } else if (item.status === "comprado") {
        actionButtons = `<button class="danger" onclick="updateItem(${item.id}, 'disponivel')">Cancelar</button>`;
      }
    }

    // Nova estrutura do card com imagem clicável
    card.innerHTML = `
      <a href="${item.link}" target="_blank" class="card-image-container">
        <img src="${item.image}" alt="${item.name}" />
      </a>
      <div class="card-content">
        <h3>${item.name}</h3>
        <div class="card-info">
          <div class="price">€${item.price}</div>
          <span class="status ${item.status}">${statusText}</span>
        </div>
        <a href="${item.link}" target="_blank" class="card-link">Ver Produto</a>
        <div class="card-actions">
          ${actionButtons}
        </div>
      </div>
    `;

    wishlistEl.appendChild(card);
  });
}

// ✏️ Atualizar estado (reservar/comprar)
async function updateItem(id, status) {
  let reservedBy = "";

  if (status === "reservado" || status === "comprado") {
    reservedBy = await showModal({
      title: status === "reservado" ? "Reservar Item" : "Comprar Item",
      message: "Digite seu nome para continuar:",
      inputPlaceholder: "Seu nome",
      requireInput: true,
    });

    if (!reservedBy) {
      await showModal({
        title: "Aviso",
        message: "É necessário indicar o nome para reservar ou comprar.",
      });
      return;
    }
  } else if (status === "disponivel") {
    const confirmed = await showModal({
      title: "Cancelar Ação",
      message: "Tem certeza que deseja cancelar esta reserva ou compra?",
      requireInput: false,
      showCancel: true,
    });

    if (!confirmed) {
      return; // Exit if the user cancels the confirmation
    }
  }

  const res = await fetch(`/wishlist/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reservedBy }),
  });

  if (res.ok) {
    await showModal({
      title: "Sucesso",
      message: "Estado atualizado com sucesso!",
    });
    loadWishlist();
  } else {
    const err = await res.json();
    await showModal({
      title: "Erro",
      message: `Falha ao atualizar: ${err.error || "erro desconhecido"}`,
    });
  }
}

// 🗑️ Apagar item (admin)
async function deleteItem(id) {
  const confirmed = await showModal({
    title: "Apagar Item",
    message: "Tem certeza que deseja apagar este item?",
    requireInput: false,
    showCancel: true,
  });

  if (!confirmed) return;

  const res = await fetch(`/wishlist/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    await showModal({
      title: "Sucesso",
      message: "Item apagado com sucesso!",
    });
    loadWishlist();
    await updateProgressBar();
  } else {
    await showModal({
      title: "Erro",
      message: "Falha ao apagar o item.",
    });
  }
}

// 👑 Toggle Admin
adminToggle.addEventListener("click", async () => {
  if (!token) {
    // Modal para utilizador
    const user = await showModal({
      title: "Login Admin",
      message: "Insira o nome de utilizador:",
      inputPlaceholder: "Utilizador",
      requireInput: true,
    });
    if (!user) return;

    // Modal para password
    const pass = await showModal({
      title: "Login Admin",
      message: "Insira a password:",
      inputPlaceholder: "Password",
      requireInput: true,
    });
    if (!pass) return;

    try {
      await login(user, pass);
      adminPanel.classList.remove("hidden");
      wishlistProgress.classList.remove("hidden");
      adminToggle.classList.add("active");
      loadWishlist();
      updateProgressBar();
    } catch {
      await showModal({
        title: "Erro",
        message: "Credenciais incorretas.",
      });
    }
  } else {
    await logout();
    adminPanel.classList.add("hidden");
    wishlistProgress.classList.add("hidden");
    adminToggle.classList.remove("active");
    loadWishlist();
  }
});

// ➕ Adicionar item
addItemBtn.addEventListener("click", async () => {
  const name = document.getElementById("itemName").value.trim();
  const image = document.getElementById("itemImage").value.trim();
  const link = document.getElementById("itemLink").value.trim();
  const price = document.getElementById("itemPrice").value.trim();

  if (!name || !link || !price) {
    await showModal({
      title: "Aviso",
      message: "Preencha nome, link e preço!",
    });
    return;
  }

  const res = await fetch("/wishlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, image, link, price }),
  });

  if (!res.ok) {
    const err = await res.json();
    await showModal({
      title: "Erro",
      message: "Erro: " + err.error,
    });
    return;
  }

  await showModal({
    title: "Sucesso",
    message: "Item adicionado com sucesso!",
  });

  document.getElementById("itemName").value = "";
  document.getElementById("itemImage").value = "";
  document.getElementById("itemLink").value = "";
  document.getElementById("itemPrice").value = "";
  loadWishlist();
});

applyFilters.addEventListener("click", () => {
  currentFilters = {
    status: filterStatus.value,
    reservedBy: filterReservedBy.value.trim(),
    sortBy: sortBy.value,
    order: order.value,
  };
  loadWishlist();
});

resetFilters.addEventListener("click", () => {
  filterStatus.value = "";
  filterReservedBy.value = "";
  sortBy.value = "";
  order.value = "asc";
  currentFilters = {};
  loadWishlist();
});

// Se o admin já estiver logado
if (token) {
  adminPanel.classList.remove("hidden");
  adminToggle.classList.add("active");
}

// 🔲 Função genérica para mostrar modal
function showModal({
  title,
  message,
  inputPlaceholder = "",
  requireInput = false,
  showCancel = true,
}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("modalOverlay");
    const modalTitle = document.getElementById("modalTitle");
    const modalMessage = document.getElementById("modalMessage");
    const modalInput = document.getElementById("modalInput");
    const confirmBtn = document.getElementById("modalConfirm");
    const cancelBtn = document.getElementById("modalCancel");

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (requireInput) {
      modalInput.classList.remove("hidden");
      modalInput.value = "";
      modalInput.placeholder = inputPlaceholder;
    } else {
      modalInput.classList.add("hidden");
    }

    if (showCancel) {
      cancelBtn.style.display = "block";
    } else {
      cancelBtn.style.display = "none";
    }

    overlay.classList.remove("hidden");

    const closeModal = (result) => {
      overlay.classList.add("hidden");
      confirmBtn.onclick = cancelBtn.onclick = null;
      resolve(result);
    };

    confirmBtn.onclick = () => {
      const val = requireInput ? modalInput.value.trim() : true;
      closeModal(val || null);
    };

    cancelBtn.onclick = () => closeModal(null);
  });
}

// Define progressMode at the top
let progressMode = 'money'; // Default to money mode

async function updateProgressBar() {
  const response = await fetch("/wishlist");
  const items = await response.json();

  let total = 0;
  let disponivel = 0;
  let reservado = 0;
  let comprado = 0;

  // Calculate totals based on current mode
  items.forEach((item) => {
    const price = parseFloat(item.price) || 0;
    if (progressMode === "money") {
      total += price;
      if (item.status === "disponivel") disponivel += price;
      else if (item.status === "reservado") reservado += price;
      else if (item.status === "comprado") comprado += price;
    } else {
      total++;
      if (item.status === "disponivel") disponivel++;
      else if (item.status === "reservado") reservado++;
      else if (item.status === "comprado") comprado++;
    }
  });

  // Calculate percentages
  const compradoPct = total > 0 ? (comprado / total) * 100 : 0;
  const reservadoPct = total > 0 ? (reservado / total) * 100 : 0;
  const disponivelPct = total > 0 ? (disponivel / total) * 100 : 0;

  // Update DOM elements
  const progressContainer = document.querySelector("#wishlistProgress");
  const progressComprado = document.querySelector(".progress-comprado");
  const progressReservado = document.querySelector(".progress-reservado");
  const progressDisponivel = document.querySelector(".progress-disponivel");
  const progressTotals = document.querySelector("#progressTotals");

  // Show the container
  progressContainer.classList.remove("hidden");

  // Update bar widths (stacked)
  progressComprado.style.width = `${compradoPct}%`;
  progressReservado.style.width = `${reservadoPct}%`;
  progressDisponivel.style.width = `${disponivelPct}%`;

  // Apply stacking by setting the left offset
  progressComprado.style.left = `0%`;
  progressReservado.style.left = `${compradoPct}%`;
  progressDisponivel.style.left = `${compradoPct + reservadoPct}%`;

  // Update text inside bars
  if (progressMode === "money") {
    progressComprado.innerHTML = compradoPct > 8 ? `<span>€${comprado.toFixed(2)}</span>` : '';
    progressReservado.innerHTML = reservadoPct > 8 ? `<span>€${reservado.toFixed(2)}</span>` : '';
    progressDisponivel.innerHTML = disponivelPct > 8 ? `<span>€${disponivel.toFixed(2)}</span>` : '';
    progressTotals.textContent = `${items.length} itens • €${total.toFixed(2)} total`;
  } else {
    progressComprado.innerHTML = compradoPct > 8 ? `<span>${comprado} ${comprado === 1 ? 'item' : 'itens'}</span>` : '';
    progressReservado.innerHTML = reservadoPct > 8 ? `<span>${reservado} ${reservado === 1 ? 'item' : 'itens'}</span>` : '';
    progressDisponivel.innerHTML = disponivelPct > 8 ? `<span>${disponivel} ${disponivel === 1 ? 'item' : 'itens'}</span>` : '';
    progressTotals.textContent = `${disponivel} disponíveis • ${reservado} reservados • ${comprado} comprados`;
  }
}

// Toggle button event listener
const toggleViewBtn = document.getElementById('toggleViewBtn');
if (toggleViewBtn) {
  toggleViewBtn.addEventListener('click', async () => {
    // Toggle mode
    progressMode = progressMode === 'money' ? 'units' : 'money';
    
    // Update button text and class
    toggleViewBtn.textContent = progressMode === 'money' ? 'Ver em Unidades' : 'Ver em Dinheiro';
    toggleViewBtn.classList.toggle('units-mode', progressMode === 'units');
    
    // Update the progress bar
    await updateProgressBar();
  });
}

// Carregar wishlist ao iniciar
loadWishlist();