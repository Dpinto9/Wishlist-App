const wishlistEl = document.getElementById("wishlist");
const adminToggle = document.getElementById("adminToggle");
const adminPanel = document.getElementById("adminPanel");
const addItemBtn = document.getElementById("addItemBtn");

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
  const res = await fetch("/wishlist");
  const data = await res.json();
  renderWishlist(data);
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
          <button onclick="updateItem(${item.id}, 'reservado')">Reservar</button>
          <button onclick="updateItem(${item.id}, 'comprado')">Comprar</button>
        `;
      } else if (item.status === "reservado") {
        actionButtons = `
          <button onclick="updateItem(${item.id}, 'comprado')">Marcar Comprado</button>
          <button onclick="updateItem(${item.id}, 'disponivel')">Libertar</button>
        `;
      } else if (item.status === "comprado") {
        actionButtons = `<button onclick="updateItem(${item.id}, 'disponivel')">Libertar</button>`;
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
      adminToggle.classList.add("active");
      loadWishlist();
    } catch {
      await showModal({
        title: "Erro",
        message: "Credenciais incorretas.",
      });
    }
  } else {
    await logout();
    adminPanel.classList.add("hidden");
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

// Carregar wishlist ao iniciar
loadWishlist();