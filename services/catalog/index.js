const express = require("express");
const app = express();
app.use(express.json());

// Data masih di memori dulu — pertemuan 2 kita pindah ke database.
const items = [
  { id: 1, nama: "Item A", harga: 15000, sisa: 500 },
  { id: 2, nama: "Item B", harga: 25000, sisa: 500 },
];

app.get("/items", (_req, res) => res.json(items));

app.get("/items/:id", (req, res) => {
  const item = items.find((x) => x.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: "item tidak ditemukan" });
  res.json(item);
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "catalog" }));

app.listen(3005, () => console.log("catalog berjalan di :3005"));
