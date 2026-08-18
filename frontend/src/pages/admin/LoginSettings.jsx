import React, { useEffect, useState } from "react";
import api from "../../api/api";

function blankCoordinator() {
  return { name: "Coordinator", username: "coordinator", password: "" };
}

export default function LoginSettings() {
  const [coordinator, setCoordinator] = useState(blankCoordinator);
  const [faculty, setFaculty] = useState([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");

  const loadAccounts = async () => {
    const { data } = await api.get("/auth/accounts/logins");
    setCoordinator(data.coordinator ? {
      name: data.coordinator.name || "Coordinator",
      username: data.coordinator.username || "coordinator",
      password: "",
    } : blankCoordinator());
    setFaculty((data.faculty || []).map((row) => ({
      ...row,
      password: "",
    })));
  };

  useEffect(() => {
    loadAccounts().catch((error) => {
      setMessage(error.response?.data?.message || "FAILED TO LOAD LOGIN SETTINGS");
    });
  }, []);

  const updateCoordinator = (field, value) => {
    setCoordinator((current) => ({ ...current, [field]: value }));
  };

  const updateFaculty = (id, field, value) => {
    setFaculty((current) => current.map((row) => (
      row.id === id ? { ...row, [field]: value } : row
    )));
  };

  const saveCoordinator = async (event) => {
    event.preventDefault();
    setSaving("coordinator");
    setMessage("");
    try {
      const { data } = await api.put("/auth/accounts/coordinator", coordinator);
      setCoordinator({
        name: data.account.name,
        username: data.account.username,
        password: data.account.password,
      });
      setMessage("COORDINATOR LOGIN UPDATED SUCCESSFULLY");
    } catch (error) {
      setMessage(error.response?.data?.message || "FAILED TO UPDATE COORDINATOR LOGIN");
    } finally {
      setSaving("");
    }
  };

  const saveFaculty = async (row) => {
    setSaving(row.id);
    setMessage("");
    try {
      const { data } = await api.put(`/auth/accounts/faculty/${row.id}`, {
        username: row.username,
        password: row.password,
      });
      setFaculty((current) => current.map((item) => (
        item.id === row.id
          ? { ...item, username: data.account.username, password: data.account.password }
          : item
      )));
      setMessage(`${data.account.name} LOGIN UPDATED SUCCESSFULLY`);
    } catch (error) {
      setMessage(error.response?.data?.message || "FAILED TO UPDATE FACULTY LOGIN");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">TPIHS LOGIN SETTINGS</p>
          <h2>COORDINATOR AND FACULTY LOGIN CONTROL</h2>
          <p>Set usernames and passwords directly from the dashboard. Empty password fields auto-generate secure passwords.</p>
        </div>
      </section>

      {message && <div className="card status-card">{message}</div>}

      <form className="card entry-card login-settings-card" onSubmit={saveCoordinator}>
        <div className="entry-strip dept-anaesthesia">COORDINATOR LOGIN</div>
        <div className="form-grid">
          <label>
            <span>COORDINATOR NAME</span>
            <input
              value={coordinator.name}
              onChange={(event) => updateCoordinator("name", event.target.value.toUpperCase())}
              required
            />
          </label>
          <label>
            <span>USERNAME</span>
            <input
              value={coordinator.username}
              onChange={(event) => updateCoordinator("username", event.target.value)}
              required
            />
          </label>
          <label>
            <span>PASSWORD</span>
            <input
              placeholder="Leave empty to auto-generate"
              value={coordinator.password}
              onChange={(event) => updateCoordinator("password", event.target.value)}
            />
          </label>
        </div>
        <button className="primary-action submit-wide" disabled={saving === "coordinator"} type="submit">
          {saving === "coordinator" ? "SAVING..." : "SAVE COORDINATOR LOGIN"}
        </button>
      </form>

      <section className="card">
        <p className="eyebrow">Faculty Login Accounts</p>
        <h2>Faculty Usernames and Passwords</h2>
        <div className="table-wrap">
          <table className="permission-table login-settings-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Faculty Name</th>
                <th>Department</th>
                <th>Username</th>
                <th>New Password</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {faculty.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.department}</td>
                  <td>
                    <input
                      className="table-input"
                      value={row.username || ""}
                      onChange={(event) => updateFaculty(row.id, "username", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      placeholder="Auto if empty"
                      value={row.password || ""}
                      onChange={(event) => updateFaculty(row.id, "password", event.target.value)}
                    />
                  </td>
                  <td>
                    <button className="mini-action" disabled={saving === row.id} type="button" onClick={() => saveFaculty(row)}>
                      {saving === row.id ? "Saving..." : "Save Login"}
                    </button>
                  </td>
                </tr>
              ))}
              {!faculty.length && (
                <tr>
                  <td colSpan="6">No faculty accounts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
