// frontend/src/pages/teacher/Notices.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api/api';

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState({ title: '', message: '', audience: 'all', eventDate: '' });
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await api.get('/notices');
    setNotices(data);
  };

  const add = async (e) => {
  e.preventDefault();

  await api.post('/notices', form);

  // RESET FORM PROPERLY
  setForm({
    title: "",
    message: "",
    audience: "all",
    eventDate: ""       // 🟢 FIXED
  });

  load();
};


  const remove = async (id) => {
    await api.delete(`/notices/${id}`);
    load();
  };

  return (
    <div className="container">
      <h2>Notices</h2>

      {/* Notice Create Form - only for admin */}
      {user.role === 'admin' && (
        <form onSubmit={add} className="card">
          <input
            placeholder="Notice Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <textarea
            placeholder="Notice Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
          />
          <br />
          <label>
          Event Date
          <input
            name="eventDate"
            type="date"
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
            required
          />
        </label>

          <label>
            Audience:
            <select
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
            >
              <option value="all">All</option>
              <option value="teachers">Faculty</option>
              <option value="students">Students</option>
            </select>
          </label>
          <button>Add Notice</button>
        </form>
      )}

      {/* Notices List */}
      <ul>
        {notices.map(n => (
          <li key={n._id} className="card" style={{ marginBottom: 10 }}>
            <h3>{n.title}</h3>
            <p>{n.message}</p>
            <p>{n.eventDate}</p>

            <small>
              For: {n.audience} | By: {n.createdBy} | Date: {new Date(n.date).toDateString()}
            </small>

            {user.role === 'admin' && (
              <button onClick={() => remove(n._id)} style={{ marginTop: 8, display: "block" }}>
                Delete Notice
              </button>
            )}
          </li>
        ))}
      </ul>

      {notices.length === 0 && <p>No notices available</p>}
    </div>
  );
}
