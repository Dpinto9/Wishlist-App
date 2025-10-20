require('dotenv').config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

const PORT = process.env.PORT || 8080;
const FIREBASE_URL = process.env.DBLINK;

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const SESSION_TOKEN = process.env.SESSION_TOKEN;

// Helper functions for Firebase
async function readDB() {
  try {
    const response = await axios.get(`${FIREBASE_URL}/wishlist.json`);
    const data = response.data;
    if (!data) return [];
    
    // Convert Firebase object to array
    return Object.keys(data).map(key => ({
      ...data[key],
      id: data[key].id || key
    }));
  } catch (error) {
    console.error("Error reading from Firebase:", error.message);
    return [];
  }
}

async function writeItem(item) {
  try {
    await axios.put(`${FIREBASE_URL}/wishlist/${item.id}.json`, item);
    return true;
  } catch (error) {
    console.error("Error writing to Firebase:", error.message);
    return false;
  }
}

async function deleteItem(id) {
  try {
    await axios.delete(`${FIREBASE_URL}/wishlist/${id}.json`);
    return true;
  } catch (error) {
    console.error("Error deleting from Firebase:", error.message);
    return false;
  }
}

app.post("/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    res.json({ success: true, token: SESSION_TOKEN });
  } else {
    res.status(403).json({ success: false, message: "Credenciais inválidas" });
  }
});

function isAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (auth === `Bearer ${SESSION_TOKEN}`) {
    next();
  } else {
    res.status(403).json({ error: "Acesso negado" });
  }
}

// 📍 GET todos os itens
app.get("/wishlist", async (req, res) => {
  try {
    const items = await readDB();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Erro ao ler base de dados" });
  }
});

app.put("/wishlist/:id/status", async (req, res) => {
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
});

// 📍 POST (admin)
app.post("/wishlist", isAdmin, async (req, res) => {
  const { name, image, link, price } = req.body;
  if (!name || !link || !price)
    return res.status(400).json({ error: "Campos obrigatórios em falta" });

  const placeholder =
    "https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg";

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
});

// 📍 PUT reserva/compra (qualquer utilizador)
app.put("/wishlist/:id", async (req, res) => {
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
});

// 📍 PUT edição (admin)
app.put("/wishlist/:id/admin", isAdmin, async (req, res) => {
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
});

// 📍 DELETE (admin)
app.delete("/wishlist/:id", isAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const success = await deleteItem(id);
  
  if (success) {
    res.json({ message: "Item removido" });
  } else {
    res.status(500).json({ error: "Erro ao remover item" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});