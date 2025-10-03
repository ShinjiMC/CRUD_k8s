const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

const Item = mongoose.model(
  "Item",
  new mongoose.Schema({
    name: String,
    price: Number,
  })
);

// Endpoint de búsqueda
// Busca productos cuyo nombre contenga la query (case-insensitive)
app.get("/search", async (req, res) => {
  const q = req.query.q || "";
  try {
    const items = await Item.find({ name: { $regex: q, $options: "i" } });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en búsqueda" });
  }
});

// Opcional: endpoint para traer todos los items
app.get("/items", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener items" });
  }
});

app.listen(4001, () => {
  console.log("Data-service simplificado corriendo en puerto 4001");
});
