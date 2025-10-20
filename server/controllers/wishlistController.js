// server/controllers/wishlistController.js
const { readDB, writeItem, deleteItem } = require("../services/wishlistService");

// 📍 GET /wishlist
async function getWishlist(req, res) {
  try {
    const { status, reservedBy, sortBy, order = "asc" } = req.query;
    let items = await readDB();

    // 🔹 Filtros
    if (status) {
      items = items.filter((i) => i.status === status);
    }
    if (reservedBy) {
      items = items.filter((i) =>
        i.reservedBy.toLowerCase().includes(reservedBy.toLowerCase())
      );
    }

    // 🔹 Ordenação
    if (sortBy === "price") {
      items.sort((a, b) =>
        order === "desc"
          ? parseFloat(b.price) - parseFloat(a.price)
          : parseFloat(a.price) - parseFloat(b.price)
      );
    } else if (sortBy === "createdAt") {
      items.sort((a, b) =>
        order === "desc"
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : new Date(a.createdAt) - new Date(b.createdAt)
      );
    } else if (sortBy === "status") {
      const orderMap = { disponivel: 1, reservado: 2, comprado: 3 };
      items.sort((a, b) =>
        order === "desc"
          ? orderMap[b.status] - orderMap[a.status]
          : orderMap[a.status] - orderMap[b.status]
      );
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Erro ao ler base de dados" });
  }
}

// 📍 POST /wishlist (admin)
async function createItem(req, res) {
  const { name, image, link, price } = req.body;
  if (!name || !link || !price)
    return res.status(400).json({ error: "Campos obrigatórios em falta" });

  const placeholder = "https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg";

  const newItem = {
    id: Date.now(),
    name,
    image: image && image.trim() !== "" ? image : placeholder,
    link,
    price,
    status: "disponivel",
    reservedBy: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await writeItem(newItem);
  res.status(200).json({ message: "Item adicionado", item: newItem });
}

// 📍 PUT /wishlist/:id (utilizador)
async function updateItem(req, res) {
  const id = parseInt(req.params.id);
  const { status, reservedBy } = req.body;

  const db = await readDB();
  const item = db.find((i) => i.id === id);
  if (!item) return res.status(404).json({ error: "Item não encontrado" });

  if (!["reservado", "comprado"].includes(status))
    return res.status(400).json({ error: "Estado inválido" });
  if (!reservedBy)
    return res.status(400).json({ error: "Nome obrigatório" });

  item.status = status;
  item.reservedBy = reservedBy;
  item.updatedAt = new Date().toISOString();

  await writeItem(item);
  res.json({ message: "Item atualizado", item });
}

// 📍 PUT /wishlist/:id/admin (admin)
async function editItemAdmin(req, res) {
  const id = parseInt(req.params.id);
  const { name, image, link } = req.body;

  const db = await readDB();
  const item = db.find((i) => i.id === id);
  if (!item) return res.status(404).json({ error: "Item não encontrado" });

  if (name) item.name = name;
  if (image) item.image = image;
  if (link) item.link = link;
  item.updatedAt = new Date().toISOString();

  await writeItem(item);
  res.json({ message: "Item atualizado com sucesso", item });
}

// 📍 PUT /wishlist/:id/status
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status, reservedBy } = req.body;

  const db = await readDB();
  const item = db.find((i) => i.id == id);
  if (!item) return res.status(404).json({ error: "Item não encontrado" });

  if (!["reservado", "comprado", "disponivel"].includes(status))
    return res.status(400).json({ error: "Estado inválido" });

  item.status = status;
  item.reservedBy = status === "disponivel" ? "" : reservedBy || item.reservedBy;
  item.updatedAt = new Date().toISOString();

  await writeItem(item);
  res.json({ message: "Estado atualizado", item });
}

// 📍 DELETE /wishlist/:id
async function deleteWishlistItem(req, res) {
  const id = parseInt(req.params.id);
  const success = await deleteItem(id);

  if (success) res.json({ message: "Item removido" });
  else res.status(500).json({ error: "Erro ao remover item" });
}

module.exports = {
  getWishlist,
  createItem,
  updateItem,
  editItemAdmin,
  updateStatus,
  deleteWishlistItem,
};
