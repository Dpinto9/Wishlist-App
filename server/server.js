require('dotenv').config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

const DB_PATH = path.join(__dirname, "../db/db.json");


const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const SESSION_TOKEN = process.env.SESSION_TOKEN;

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
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
app.get("/wishlist", (req, res) => {
  try {
    res.json(readDB());
  } catch (err) {
    res.status(500).json({ error: "Erro ao ler base de dados" });
  }
});

app.put("/wishlist/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, reservedBy } = req.body;

  const db = readDB();
  const item = db.find((i) => i.id == id);
  if (!item) return res.status(404).json({ error: "Item não encontrado" });

  if (!["reservado", "comprado", "disponivel"].includes(status))
    return res.status(400).json({ error: "Estado inválido" });

  item.status = status;
  item.reservedBy = status === "disponivel" ? "" : reservedBy || item.reservedBy;
  item.updatedAt = new Date().toISOString();

  writeDB(db);
  res.json({ message: "Estado atualizado", item });
});

// 📍 POST (admin)
app.post("/wishlist", isAdmin, (req, res) => {
  const { name, image, link, price } = req.body;
  if (!name || !link || !price)
    return res.status(400).json({ error: "Campos obrigatórios em falta" });

  const placeholder =
    "https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg";

  const db = readDB();
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

  db.push(newItem);
  writeDB(db);
  res.status(200).json({ message: "Item adicionado", item: newItem });
});

// 📍 PUT reserva/compra (qualquer utilizador)
app.put("/wishlist/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { status, reservedBy } = req.body;

  const db = readDB();
  const item = db.find((i) => i.id === id);
  if (!item) return res.status(404).json({ error: "Item não encontrado" });

  if (!["reservado", "comprado"].includes(status))
    return res.status(400).json({ error: "Estado inválido" });
  if (!reservedBy)
    return res.status(400).json({ error: "Nome obrigatório" });

  item.status = status;
  item.reservedBy = reservedBy;
  item.updatedAt = new Date().toISOString();

  writeDB(db);
  res.json({ message: "Item atualizado", item });
});

// 📍 PUT edição (admin)
app.put("/wishlist/:id/admin", isAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { name, image, link } = req.body;

  const db = readDB();
  const item = db.find((i) => i.id === id);
  if (!item) return res.status(404).json({ error: "Item não encontrado" });

  if (name) item.name = name;
  if (image) item.image = image;
  if (link) item.link = link;
  item.updatedAt = new Date().toISOString();

  writeDB(db);
  res.json({ message: "Item atualizado com sucesso", item });
});

// 📍 DELETE (admin)
app.delete("/wishlist/:id", isAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  let db = readDB();
  db = db.filter((i) => i.id !== id);
  writeDB(db);
  res.json({ message: "Item removido" });
});

app.listen(3000, () =>
  console.log("Servidor a correr em http://localhost:3000")
);
