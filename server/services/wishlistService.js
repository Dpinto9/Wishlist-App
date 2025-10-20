// server/services/wishlistService.js
const axios = require("axios");
const FIREBASE_URL = process.env.DBLINK;

// 🔹 Ler todos os itens
async function readDB() {
  try {
    const response = await axios.get(`${FIREBASE_URL}/wishlist.json`);
    const data = response.data;
    if (!data) return [];
    return Object.keys(data).map(key => ({
      ...data[key],
      id: data[key].id || key
    }));
  } catch (error) {
    console.error("Error reading from Firebase:", error.message);
    return [];
  }
}

// 🔹 Escrever item (criar ou atualizar)
async function writeItem(item) {
  try {
    await axios.put(`${FIREBASE_URL}/wishlist/${item.id}.json`, item);
    return true;
  } catch (error) {
    console.error("Error writing to Firebase:", error.message);
    return false;
  }
}

// 🔹 Apagar item
async function deleteItem(id) {
  try {
    await axios.delete(`${FIREBASE_URL}/wishlist/${id}.json`);
    return true;
  } catch (error) {
    console.error("Error deleting from Firebase:", error.message);
    return false;
  }
}

module.exports = {
  readDB,
  writeItem,
  deleteItem,
};
