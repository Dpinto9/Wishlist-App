// server/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

const wishlistRoutes = require("./routes/wishlistroutes.js");

const PORT = process.env.PORT || 8080;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const SESSION_TOKEN = process.env.SESSION_TOKEN;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

// 🔐 Login
app.post("/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    res.json({ success: true, token: SESSION_TOKEN });
  } else {
    res.status(403).json({ success: false, message: "Credenciais inválidas" });
  }
});

// 🧾 Rotas da wishlist
app.use("/wishlist", wishlistRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
