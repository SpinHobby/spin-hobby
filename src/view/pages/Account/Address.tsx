import React, { useEffect, useState } from "react";
import { getAddresses, addAddress, deleteAddress, IAccountAddress } from "../../../api/account";

const emptyForm = {
  kind: "shipping" as "shipping" | "billing",
  fname: "",
  lname: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "",
  phone: "",
  isDefault: false,
};

export function Address() {
  const [addresses, setAddresses] = useState<IAccountAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function load() {
    setLoading(true);
    getAddresses()
      .then(setAddresses)
      .catch((err) => setError(err.message || "Failed to load addresses"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    addAddress({ ...form, address2: form.address2 || null, phone: form.phone || null })
      .then(() => {
        setForm(emptyForm);
        setShowForm(false);
        load();
      })
      .catch((err) => setError(err.message || "Failed to save address"));
  }

  function handleDelete(id: number) {
    deleteAddress(id)
      .then(load)
      .catch((err) => setError(err.message || "Failed to delete address"));
  }

  return (
    <div id="account-address">
      {error && <p className="account-error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="account-address-list">
          {addresses.map((addr) => (
            <div className="account-address-card" key={addr.id}>
              <div>
                <strong>
                  {addr.fname} {addr.lname}
                </strong>{" "}
                {addr.isDefault && <span className="account-address-default">Default</span>}
              </div>
              <div>{addr.address1}{addr.address2 ? `, ${addr.address2}` : ""}</div>
              <div>
                {addr.city}, {addr.province} {addr.postalCode}
              </div>
              <div>{addr.country}</div>
              <button className="account-btn-ghost" onClick={() => handleDelete(addr.id)}>
                Remove
              </button>
            </div>
          ))}
          {addresses.length === 0 && <p>No saved addresses yet.</p>}
        </div>
      )}

      {showForm ? (
        <form className="account-address-form" onSubmit={handleSave}>
          <input
            placeholder="First name"
            value={form.fname}
            onChange={(e) => setForm({ ...form, fname: e.target.value })}
            required
          />
          <input
            placeholder="Last name"
            value={form.lname}
            onChange={(e) => setForm({ ...form, lname: e.target.value })}
            required
          />
          <input
            placeholder="Address"
            value={form.address1}
            onChange={(e) => setForm({ ...form, address1: e.target.value })}
            required
          />
          <input
            placeholder="Apt, suite, etc. (optional)"
            value={form.address2}
            onChange={(e) => setForm({ ...form, address2: e.target.value })}
          />
          <input
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            required
          />
          <input
            placeholder="Province/State"
            value={form.province}
            onChange={(e) => setForm({ ...form, province: e.target.value })}
            required
          />
          <input
            placeholder="Postal Code"
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            required
          />
          <input
            placeholder="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            required
          />
          <label className="account-checkbox-field">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Set as default
          </label>
          <div className="account-address-form-actions">
            <button type="button" className="account-btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="account-btn-primary">
              Save Address
            </button>
          </div>
        </form>
      ) : (
        <button className="account-btn-primary" onClick={() => setShowForm(true)}>
          Add Address
        </button>
      )}
    </div>
  );
}
