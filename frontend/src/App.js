import React, { useEffect, useState } from 'react';

import axios from 'axios';

function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://54.227.175.247:5000'

  const fetchItems = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/items`);
    setItems(res.data);
  };

  const addItem = async () => {
    await axios.post(`${API_BASE_URL}/api/items`, { name });
    setName('');
    fetchItems();
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Three-Tier App</h2>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Enter item"
      />
      <button onClick={addItem}>Add</button>
      <ul>
        {items.map(item => (
          <li key={item._id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;

