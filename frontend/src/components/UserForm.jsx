import React, { useState } from 'react';
import { addUser } from '../api';

export default function UserForm({ onUserAdded }) {
  const initialState = {
    username: '', mobileNumber: '', emailAddress: '',
    houseNumber: '', street: '', city: '', state: '', country: '', zip: ''
  };
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addUser(formData);
      setFormData(initialState);
      onUserAdded();
    } catch (err) {
      console.error(err);
      alert('Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, name, type = "text", required = true }) => (
    <div className="mb-4">
      <label className="block text-sm text-gray-700 font-medium mb-1" htmlFor={name}>{label}</label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        required={required}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField label="Username" name="username" />
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Mobile No." name="mobileNumber" />
        <InputField label="Email Address" name="emailAddress" type="email" />
      </div>
      
      <div className="pt-4 mt-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Address Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="House Number" name="houseNumber" />
          <InputField label="Street" name="street" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="City" name="city" />
          <InputField label="State" name="state" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Country" name="country" />
          <InputField label="ZIP Code" name="zip" />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition duration-200 disabled:opacity-50"
      >
        {loading ? 'Adding User...' : 'Add User'}
      </button>
    </form>
  );
}
