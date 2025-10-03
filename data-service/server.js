const express = require("express");
const { Client } = require("@elastic/elasticsearch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a Elasticsearch
const es = new Client({
  node: process.env.ES_NODE || "http://elasticsearch:9200",
});

// Indexar producto en Elastic
app.post("/index-product", async (req, res) => {
  const product = req.body;
  try {
    // Quitamos el _id del documento para que solo se use en el parámetro "id"
    const { _id, ...doc } = product;

    await es.index({
      index: "products",
      id: _id, // 👈 usamos el id de Mongo
      document: doc, // 👈 documento limpio, sin _id
    });

    res.json({ message: "Producto indexado", product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al indexar" });
  }
});

// Buscar en Elastic
app.get("/search", async (req, res) => {
  const q = req.query.q;
  try {
    const result = await es.search({
      index: "products",
      query: { match: { name: q } },
    });
    res.json(result.hits.hits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en búsqueda" });
  }
});

// Eliminar de Elastic
app.delete("/items/:id", async (req, res) => {
  try {
    const r = await es.delete({
      index: "products",
      id: req.params.id,
    });
    res.json({
      message: "Producto eliminado en Elastic",
      id: req.params.id,
      result: r,
    });
  } catch (err) {
    if (err.meta?.statusCode === 404) {
      return res.status(404).json({ error: "No encontrado en Elastic" });
    }
    console.error(err);
    res.status(500).json({ error: "Error al eliminar en Elastic" });
  }
});

app.listen(4001, () => {
  console.log("Data-service corriendo en puerto 4001");
});
