// server/routes/wishlistRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/wishlistController");

const SESSION_TOKEN = process.env.SESSION_TOKEN;

// Middleware admin
function isAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (auth === `Bearer ${SESSION_TOKEN}`) next();
  else res.status(403).json({ error: "Acesso negado" });
}

router.get("/", controller.getWishlist);
router.post("/", isAdmin, controller.createItem);
router.put("/:id", controller.updateItem);
router.put("/:id/admin", isAdmin, controller.editItemAdmin);
router.put("/:id/status", controller.updateStatus);
router.delete("/:id", isAdmin, controller.deleteWishlistItem);

module.exports = router;
