const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose"); // o mysql2

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI);

const Item = mongoose.model(
  "Item",
  new mongoose.Schema({
    name: String,
    price: Number,
  })
);

// CRUD
app.get("/items", async (req, res) => res.json(await Item.find()));
app.post("/items", async (req, res) => res.json(await Item.create(req.body)));
app.put("/items/:id", async (req, res) =>
  res.json(await Item.findByIdAndUpdate(req.params.id, req.body, { new: true }))
);
app.delete("/items/:id", async (req, res) =>
  res.json(await Item.findByIdAndDelete(req.params.id))
);

app.listen(4000, () => console.log("API corriendo en puerto 4000"));
