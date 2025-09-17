import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
const API = "http://localhost:32000/items";

function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", price: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const add = async () => {
    if (!form.name || !form.price) return;
    try {
      await axios.post(API, form);
      setForm({ name: "", price: "" });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API}/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container">
      <h1 className="title">🛍️ Product Store</h1>

      {/* Formulario */}
      <div className="card">
        <h2 className="card-title">Add Product</h2>
        <div className="form-group">
          <input
            className="input"
            placeholder="Product Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            type="number"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <button className="btn btn-add" onClick={add}>
            Add Product
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price ($)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="3" className="center">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="3" className="center">
                  No products found
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item._id} className={idx % 2 === 0 ? "even" : "odd"}>
                  <td>{item.name}</td>
                  <td>{item.price}</td>
                  <td className="center">
                    <button
                      className="btn btn-delete"
                      onClick={() => remove(item._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <p className="footer">All products are stored in the database</p>
    </div>
  );
}

export default App;
