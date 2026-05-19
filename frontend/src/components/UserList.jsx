import React from 'react';
import { Trash2, Phone, Mail, MapPin } from 'lucide-react';

const UsersIconFallback = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export default function UserList({ users, onDelete }) {
  if (!users || users.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-500">
        <UsersIconFallback className="w-16 h-16 mb-4 text-gray-200" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
        <p className="text-sm">Add some users to get started managing profiles.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
            <th className="px-6 py-4 font-medium">User Identity</th>
            <th className="px-6 py-4 font-medium">Contact Details</th>
            <th className="px-6 py-4 font-medium">Address Information</th>
            <th className="px-6 py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {users.map(user => (
            <tr key={user.id} className="hover:bg-gray-50/70 transition duration-150">
              <td className="px-6 py-4 align-top">
                <div className="font-semibold text-gray-900">{user.username}</div>
                <div className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-mono">ID: {user.id}</div>
              </td>
              <td className="px-6 py-4 align-top">
                <div className="space-y-2">
                  <div className="flex items-center text-gray-700">
                    <Phone className="w-4 h-4 mr-2.5 text-gray-400 shrink-0" />
                    <span>{user.mobileNumber}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Mail className="w-4 h-4 mr-2.5 text-gray-400 shrink-0" />
                    <span>{user.emailAddress}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 align-top max-w-sm">
                <div className="flex items-start text-gray-700">
                  <MapPin className="w-4 h-4 mr-2.5 text-gray-400 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">
                    {user.houseNumber}, {user.street}, <br/>
                    {user.city}, {user.state}, <br/>
                    {user.country} {user.zip}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-right align-top">
                <button
                  onClick={() => onDelete(user.id)}
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-lg transition-colors inline-block"
                  title="Delete User"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
