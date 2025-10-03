import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://192.168.56.102:32000/items"; // CRUD (MongoDB)
const SEARCH_API = "http://192.168.56.102:32001"; // Búsqueda (Elasticsearch)

function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", price: "" });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

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

  const search = async () => {
    if (!query.trim()) {
      return load();
    }
    setLoading(true);
    try {
      const res = await axios.get(`${SEARCH_API}/search?q=${query}`);
      const products = res.data.map((hit) => ({
        _id: hit._id,
        ...hit._source,
      }));
      setItems(products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const add = async () => {
    if (!form.name || !form.price) return;
    try {
      const { data } = await axios.post(API, form); // primero Mongo
      await axios.post(`${SEARCH_API}/index-product`, data); // luego Elastic
      setForm({ name: "", price: "" });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API}/${id}`); // primero Mongo
      await axios.delete(`${SEARCH_API}/items/${id}`); // luego Elastic
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
      <div className="card add-box">
        <h2>Add Product</h2>
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
            Add
          </button>
        </div>
      </div>

      {/* Buscador tipo Google */}
      <div className="search-box">
        <input
          className="search-input"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button className="icon-btn" onClick={search}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"
            />
          </svg>
        </button>

        {/* Icono X (clear) */}
        {query && (
          <button
            className="icon-btn clear"
            onClick={() => {
              setQuery("");
              load();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
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
                <tr
                  key={item._id || idx}
                  className={idx % 2 === 0 ? "even" : "odd"}
                >
                  <td>{item.name}</td>
                  <td>{item.price}</td>
                  <td className="center">
                    {item._id && (
                      <button
                        className="btn btn-delete"
                        onClick={() => remove(item._id)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="footer">
        Products stored in MongoDB, search powered by Elasticsearch
      </p>
    </div>
  );
}

export default App;
