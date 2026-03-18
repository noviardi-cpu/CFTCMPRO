import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { getUsers, saveUser, deleteUser } from '../services/authService';
import { Shield, Clock, CheckCircle, XCircle, User, Trash2 } from 'lucide-react';

interface Props {
  currentUser: UserAccount;
}

const AdminConsolePanel: React.FC<Props> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const fetchedUsers = await getUsers();
    setUsers(fetchedUsers);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSaveUser = async (updatedUser: UserAccount) => {
    if (!updatedUser.uid) return;
    await saveUser(updatedUser as UserAccount & { uid: string });
    setSelectedUser(null);
    loadUsers();
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm('Yakin ingin menghapus pengguna ini?')) {
      await deleteUser(uid);
      loadUsers();
    }
  };

  const addSubscriptionTime = (user: UserAccount, days: number) => {
    const now = Date.now();
    const currentEnd = user.subscriptionEnd && user.subscriptionEnd > now ? user.subscriptionEnd : now;
    const newEnd = currentEnd + (days * 24 * 60 * 60 * 1000);
    return { ...user, subscriptionEnd: newEnd };
  };

  if (loading) return <div className="p-8 text-center text-purple-600">Memuat data pengguna...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-tcm-primary" />
        <h2 className="text-2xl font-black text-purple-950 uppercase">Console Admin</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
          <div className="p-4 bg-purple-50 border-b border-purple-100 font-bold text-purple-900">
            Daftar Pengguna
          </div>
          <div className="divide-y divide-purple-50 max-h-[600px] overflow-y-auto">
            {users.map(u => (
              <div 
                key={u.uid} 
                onClick={() => setSelectedUser(u)}
                className={`p-4 cursor-pointer transition-colors hover:bg-purple-50 flex items-center justify-between ${selectedUser?.uid === u.uid ? 'bg-purple-100' : ''}`}
              >
                <div>
                  <div className="font-bold text-sm text-purple-900">{u.username}</div>
                  <div className="text-xs text-purple-500 capitalize">{u.role.replace('_', ' ')}</div>
                </div>
                {u.subscriptionEnd && u.subscriptionEnd > Date.now() ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User Details & Edit */}
        <div className="md:col-span-2">
          {selectedUser ? (
            <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-purple-950">{selectedUser.username}</h3>
                  <p className="text-sm text-purple-500">UID: {selectedUser.uid}</p>
                </div>
                {currentUser.role === 'super_admin' && selectedUser.uid !== currentUser.uid && (
                  <button onClick={() => selectedUser.uid && handleDeleteUser(selectedUser.uid)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Role Management */}
              {currentUser.role === 'super_admin' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-purple-900 uppercase">Role Pengguna</label>
                  <select 
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value as any})}
                    className="w-full p-3 bg-purple-50 border border-purple-100 rounded-xl outline-none focus:border-tcm-primary"
                  >
                    <option value="user">Layanan Biasa (User)</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Saint User (Super Admin)</option>
                  </select>
                </div>
              )}

              {/* Subscription Management */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-purple-900 uppercase">Masa Aktif Layanan</label>
                <div className="p-4 bg-purple-50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">
                      {selectedUser.subscriptionEnd && selectedUser.subscriptionEnd > Date.now() 
                        ? `Aktif hingga: ${new Date(selectedUser.subscriptionEnd).toLocaleDateString('id-ID')}`
                        : 'Layanan Tidak Aktif / Expired'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '+3 Hari', days: 3 },
                    { label: '+6 Hari', days: 6 },
                    { label: '+1 Bulan', days: 30 },
                    { label: '+3 Bulan', days: 90 },
                    { label: '+6 Bulan', days: 180 },
                    { label: '+1 Tahun', days: 365 },
                  ].map(plan => (
                    <button 
                      key={plan.days}
                      onClick={() => setSelectedUser(addSubscriptionTime(selectedUser, plan.days))}
                      className="px-3 py-2 bg-white border border-purple-200 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      {plan.label}
                    </button>
                  ))}
                  <button 
                    onClick={() => setSelectedUser({...selectedUser, subscriptionEnd: 0})}
                    className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    Matikan Layanan
                  </button>
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-purple-900 uppercase">Akses Fitur</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'chat', label: 'Chat Diagnosa' },
                    { id: 'cdss', label: 'CDSS Auto-Rx' },
                    { id: 'atlas', label: 'Atlas Sindrom' },
                    { id: 'wuxing', label: 'Wu Xing Master' },
                    { id: 'archive', label: 'Arsip Pasien' },
                    { id: 'invoice', label: 'Invoice Generator' },
                    { id: 'bmi', label: 'BMI Komplit' },
                  ].map(feature => {
                    const isAllowed = selectedUser.allowedFeatures?.[feature.id as keyof typeof selectedUser.allowedFeatures] ?? true;
                    return (
                      <label key={feature.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl cursor-pointer hover:bg-purple-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={isAllowed}
                          onChange={(e) => {
                            setSelectedUser({
                              ...selectedUser,
                              allowedFeatures: {
                                ...(selectedUser.allowedFeatures || {
                                  chat: true, cdss: true, atlas: true, wuxing: true, archive: true, invoice: true, bmi: true
                                }),
                                [feature.id]: e.target.checked
                              }
                            });
                          }}
                          className="w-4 h-4 text-tcm-primary rounded focus:ring-tcm-primary"
                        />
                        <span className="text-sm font-medium text-purple-900">{feature.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-purple-100 flex justify-end">
                <button 
                  onClick={() => handleSaveUser(selectedUser)}
                  className="px-6 py-3 bg-tcm-primary text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 hover:brightness-110 transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-12 flex flex-col items-center justify-center text-center h-full">
              <User className="w-16 h-16 text-purple-200 mb-4" />
              <h3 className="text-lg font-bold text-purple-900">Pilih Pengguna</h3>
              <p className="text-sm text-purple-500">Pilih pengguna dari daftar di sebelah kiri untuk mengelola akses dan langganan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminConsolePanel;
