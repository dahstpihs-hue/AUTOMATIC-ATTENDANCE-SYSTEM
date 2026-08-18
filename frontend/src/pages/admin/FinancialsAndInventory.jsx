import React, { useEffect, useState } from "react";
import api from "../../api/api";

export default function FinancialsAndInventory() {
  const [inventory, setInventory] = useState({ books: [], uniforms: [], canteen: [], transactions: [] });
  const [posForm, setPosForm] = useState({ rollNumber: "", item: "Tea & Samosa Combo", amount: "100" });
  const [activeTab, setActiveTab] = useState("financials");
  const [loading, setLoading] = useState(true);

  // Mock financial statistics
  const stats = {
    collections: "Rs. 1,450,000",
    expenses: "Rs. 620,000",
    surplus: "Rs. 830,000",
    defaulters: 12
  };

  const loadInventory = async () => {
    try {
      const { data } = await api.get("/academic/inventory");
      setInventory(data || { books: [], uniforms: [], canteen: [], transactions: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handlePOSBillSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/academic/inventory/pos", posForm);
      alert("POS billing transaction logged successfully!");
      setPosForm({ rollNumber: "", item: "Tea & Samosa Combo", amount: "100" });
      loadInventory();
    } catch (err) {
      alert("Failed to log POS transaction: " + err.message);
    }
  };

  if (loading) return <p>Loading financials ledger...</p>;

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Enterprise resource management</p>
          <h2 className="single-line-glow">FINANCIAL SNAPSHOT & SYSTEM INVENTORIES</h2>
          <p>Supervise monthly accounts ledger, process POS canteen cards, and verify library issuance logs.</p>
        </div>
      </section>

      <div className="action-buttons" style={{ marginBottom: "16px" }}>
        <button
          className={activeTab === "financials" ? "primary-action" : "mini-action"}
          onClick={() => setActiveTab("financials")}
        >
          💰 Accounts Ledger & Defaulters
        </button>
        <button
          className={activeTab === "canteen" ? "primary-action" : "mini-action"}
          onClick={() => setActiveTab("canteen")}
        >
          🍔 Canteen POS Billing
        </button>
        <button
          className={activeTab === "library" ? "primary-action" : "mini-action"}
          onClick={() => setActiveTab("library")}
        >
          📚 Library & Book Index
        </button>
      </div>

      {activeTab === "financials" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* STATS CARDS */}
          <section className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
            <div className="stat-card">
              <span>Total Fees Collected</span>
              <strong>{stats.collections}</strong>
              <small>Current Month Collection</small>
            </div>
            <div className="stat-card">
              <span>Salary & Operational Expenses</span>
              <strong>{stats.expenses}</strong>
              <small>Payroll and Utilities</small>
            </div>
            <div className="stat-card">
              <span>Net Surplus Position</span>
              <strong>{stats.surplus}</strong>
              <small>Profit & Loss Summary</small>
            </div>
            <div className="stat-card">
              <span>Defaulter Accounts (Under 75%)</span>
              <strong style={{ color: "#ef4444" }}>{stats.defaulters} Defaulters</strong>
              <small>Fines imposed automatically</small>
            </div>
          </section>

          {/* BUDGET PLAN & CHART OF ACCOUNTS */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "24px" }}>
            <section className="card">
              <h3>Chart of Accounts Ledger</h3>
              <div className="feature-grid" style={{ marginTop: "12px" }}>
                <div className="feature-item" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>1010 - Bank Cash Reserve</span>
                  <strong>Rs. 3,500,000</strong>
                </div>
                <div className="feature-item" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>2010 - Faculty Salaries Payable</span>
                  <strong>Rs. 450,000</strong>
                </div>
                <div className="feature-item" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>3010 - Tuition Concessions (Sibling)</span>
                  <strong>Rs. 120,000</strong>
                </div>
              </div>
            </section>

            <section className="card">
              <h3>Pending Defaulter List</h3>
              <div className="table-wrap" style={{ marginTop: "12px" }}>
                <table className="permission-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Student Roll No</th>
                      <th>Term Fee Dues</th>
                      <th>Concession Code</th>
                      <th>Deficit Alert</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>STD-RAD-BATCH-002</td>
                      <td>Rs. 25,500</td>
                      <td>None</td>
                      <td><span style={{ color: "#ef4444", fontWeight: "bold" }}>Defaulter Notification Sent</span></td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>STD-MLT-BATCH-005</td>
                      <td>Rs. 12,000</td>
                      <td>Merit (50%)</td>
                      <td><span style={{ color: "#eab308", fontWeight: "bold" }}>Grace Period Active</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "canteen" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "24px" }}>
          <form onSubmit={handlePOSBillSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3>Process Smart Canteen POS Transaction</h3>
            <label>
              <span>STUDENT ROLL NUMBER</span>
              <input
                type="text"
                placeholder="STD-RAD-BATCH-001"
                value={posForm.rollNumber}
                onChange={(e) => setPosForm({ ...posForm, rollNumber: e.target.value })}
                required
              />
            </label>

            <label>
              <span>SELECTED MEAL COMBO</span>
              <select
                value={posForm.item}
                onChange={(e) => setPosForm({ ...posForm, item: e.target.value })}
              >
                <option value="Tea & Samosa Combo">Tea & Samosa Combo (Rs. 100)</option>
                <option value="Special Chicken Biryani">Special Chicken Biryani (Rs. 200)</option>
                <option value="Mineral Water">Mineral Water (Rs. 50)</option>
              </select>
            </label>

            <label>
              <span>TRANSACTION AMOUNT</span>
              <input
                type="number"
                value={posForm.amount}
                onChange={(e) => setPosForm({ ...posForm, amount: e.target.value })}
                required
              />
            </label>

            <button className="primary-action submit-wide" type="submit">
              LOG TRANSACTION & DEBIT WALLET
            </button>
          </form>

          <div>
            <h3>Canteen POS Sales Ledger</h3>
            <div className="table-wrap" style={{ marginTop: "12px" }}>
              <table className="permission-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Student ID</th>
                    <th>Item Purchased</th>
                    <th>Gross Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.transactions.map((tx, idx) => (
                    <tr key={idx}>
                      <td>{new Date(tx.date).toLocaleTimeString()}</td>
                      <td>{tx.studentRoll}</td>
                      <td>{tx.item}</td>
                      <td>Rs. {tx.amount}</td>
                    </tr>
                  ))}
                  {inventory.transactions.length === 0 && (
                    <tr>
                      <td colSpan="4">No transactions processed today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "library" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <section className="card">
            <h3>Library Reference Book Catalog</h3>
            <div className="table-wrap" style={{ marginTop: "12px" }}>
              <table className="permission-table">
                <thead>
                  <tr>
                    <th>Book Title</th>
                    <th>Author</th>
                    <th>Available Copies</th>
                    <th>Catalog Location</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.books.map(book => (
                    <tr key={book.id}>
                      <td>{book.title}</td>
                      <td>{book.author}</td>
                      <td>{book.stock}</td>
                      <td>{book.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
