
import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, User, AlertCircle, Save, Edit2, CheckSquare, Square, Clock } from 'lucide-react';
import { UserAccount } from '../types';
import { db } from '../services/db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

const DURATIONS = [
  { label: 'Unlimited', value: 0 },
  { label: '3 Days', value: 3 * 24 * 60 * 60 * 1000 },
  { label: '6 Days', value: 6 * 24 * 60 * 60 * 1000 },
  { label: '1 Month', value: 30 * 24 * 60 * 60 * 1000 },
  { label: '3 Months', value: 90 * 24 * 60 * 60 * 1000 },
  { label: '6 Months', value: 180 * 24 * 60 * 60 * 1000 },
  { label: '1 Year', value: 365 * 24 * 60 * 60 * 1000 },
];

const FEATURES = [
  { key: 'chat', label: 'Chat Diagnosa' },
  { key: 'cdss', label: 'CDSS AutoRx' },
  { key: 'atlas', label: 'Atlas Sindrom' },
  { key: 'wuxing', label: 'Wu Xing Master' },
  { key: 'archive', label: 'Arsip Plan' },
  { key: 'invoice', label: 'Invoice Generator' },
  { key: 'bmi', label: 'BMI Komplit' },
];

const UserManagementModal: React.FC<Props> = ({ isOpen, onClose, currentUser }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  
  // Form State
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'super_admin' | 'admin' | 'user'>('user');
  const [subscriptionDuration, setSubscriptionDuration] = useState<number>(0);
  const [allowedFeatures, setAllowedFeatures] = useState<Record<string, boolean>>({
    chat: true, cdss: true, atlas: true, wuxing: true, archive: true, invoice: true, bmi: true
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let unsubscribe: () => void;
    if (isOpen) {
      import('../firebase').then(({ db: firestore, collection, onSnapshot }) => {
        unsubscribe = onSnapshot(collection(firestore, 'users'), (snapshot) => {
          const currentUsers: UserAccount[] = [];
          snapshot.forEach((doc) => {
            currentUsers.push(doc.data() as UserAccount);
          });
          setUsers(currentUsers);
        }, (error) => {
          console.error("Error listening to users:", error);
        });
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen]);

  const resetForm = () => {
    setEditingUid(null);
    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
    setSubscriptionDuration(0);
    setAllowedFeatures({
      chat: true, cdss: true, atlas: true, wuxing: true, archive: true, invoice: true, bmi: true
    });
    setError('');
    setSuccessMsg('');
  };

  const handleEdit = (user: UserAccount) => {
    setEditingUid(user.uid || null);
    setNewUsername(user.username);
    setNewPassword(user.password || '');
    setNewRole(user.role);
    
    // Calculate remaining duration if subscriptionEnd is set
    if (user.subscriptionEnd && user.subscriptionEnd > Date.now()) {
      // Just set to 0 for editing to avoid complex reverse math, or we could find the closest duration.
      // For simplicity, we'll keep it as 0 (Unlimited/No Change) when editing, unless they select a new one.
      setSubscriptionDuration(0); 
    } else {
      setSubscriptionDuration(0);
    }

    if (user.allowedFeatures) {
      setAllowedFeatures({ ...user.allowedFeatures });
    } else {
      setAllowedFeatures({
        chat: true, cdss: true, atlas: true, wuxing: true, archive: true, invoice: true, bmi: true
      });
    }
    setError('');
    setSuccessMsg('');
  };

  const toggleFeature = (key: string) => {
    setAllowedFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newUsername.trim() || (!newPassword.trim() && !editingUid)) {
      setError('Username and password are required.');
      return;
    }

    const uid = editingUid || Date.now().toString();
    
    let subscriptionEnd: number | undefined = undefined;
    if (subscriptionDuration > 0) {
      subscriptionEnd = Date.now() + subscriptionDuration;
    } else if (editingUid) {
      // Keep existing subscriptionEnd if duration is 0 (No Change)
      const existingUser = users.find(u => u.uid === editingUid);
      subscriptionEnd = existingUser?.subscriptionEnd;
    }

    try {
      await db.users.add({
        uid,
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: newRole,
        createdAt: editingUid ? (users.find(u => u.uid === editingUid)?.createdAt || Date.now()) : Date.now(),
        subscriptionEnd,
        allowedFeatures: allowedFeatures as any
      });
      setSuccessMsg(`User ${newUsername} ${editingUid ? 'updated' : 'added'} successfully.`);
      resetForm();
    } catch (err) {
      setError(`Failed to ${editingUid ? 'update' : 'add'} user.`);
    }
  };

  const handleDelete = async (username: string, uid?: string) => {
    if (username === currentUser.username) {
      setError("You cannot delete your own account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;

    if (!uid) {
        setError("Cannot delete user without UID.");
        return;
    }

    try {
      await db.users.delete(uid);
      setSuccessMsg(`User ${username} deleted.`);
      if (editingUid === uid) resetForm();
    } catch (err) {
      setError("Failed to delete user.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white border border-purple-100 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-100 bg-purple-50 rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl border border-purple-200">
               <Shield className="w-6 h-6 text-tcm-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-purple-950 uppercase tracking-tighter">Master Control</h2>
              <p className="text-xs font-bold text-purple-500 uppercase tracking-widest">User Management & Access Control</p>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-400 hover:text-purple-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           
           {/* Add/Edit User Form */}
           <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-tcm-primary uppercase tracking-wider flex items-center gap-2">
                   {editingUid ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />} 
                   {editingUid ? 'Edit User' : 'Add New User'}
                </h3>
                {editingUid && (
                  <button onClick={resetForm} className="text-xs font-bold text-purple-500 hover:text-purple-700 uppercase tracking-widest">
                    Cancel Edit
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSaveUser} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                   <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1">Username</label>
                      <input 
                        type="text" 
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none shadow-sm transition-all"
                        placeholder="e.g. doctor1"
                        disabled={!!editingUid}
                      />
                   </div>
                   <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1">Password</label>
                      <input 
                        type="text" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none font-mono shadow-sm transition-all"
                        placeholder="Password"
                      />
                   </div>
                   <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1">Role</label>
                      <select 
                         value={newRole}
                         onChange={e => setNewRole(e.target.value as any)}
                         className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none shadow-sm transition-all"
                      >
                         <option value="user">Layanan Biasa</option>
                         <option value="admin">Admin</option>
                         <option value="super_admin">Super Admin</option>
                      </select>
                   </div>
                   <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Active Period</label>
                      <select 
                         value={subscriptionDuration}
                         onChange={e => setSubscriptionDuration(Number(e.target.value))}
                         className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-900 focus:border-tcm-primary outline-none shadow-sm transition-all"
                      >
                         {DURATIONS.map(d => (
                           <option key={d.label} value={d.value}>{d.label}</option>
                         ))}
                      </select>
                   </div>
                 </div>

                 {/* Feature Toggles */}
                 <div className="bg-white p-4 rounded-xl border border-purple-100">
                    <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Allowed Features</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {FEATURES.map(feat => (
                        <button
                          key={feat.key}
                          type="button"
                          onClick={() => toggleFeature(feat.key)}
                          className={`flex items-center gap-2 text-sm p-2 rounded-lg border transition-all ${allowedFeatures[feat.key] ? 'bg-purple-50 border-purple-300 text-purple-900' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                        >
                          {allowedFeatures[feat.key] ? <CheckSquare className="w-4 h-4 text-tcm-primary" /> : <Square className="w-4 h-4" />}
                          <span className="font-semibold">{feat.label}</span>
                        </button>
                      ))}
                    </div>
                 </div>

                 <div className="flex justify-end">
                    <button type="submit" className="bg-tcm-primary hover:brightness-110 active:scale-95 text-white font-black py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-purple-900/20">
                       <Save className="w-4 h-4" /> {editingUid ? 'Save Changes' : 'Add User'}
                    </button>
                 </div>
              </form>

              {error && (
                 <div className="mt-4 text-xs font-bold text-rose-500 flex items-center gap-2 bg-rose-50 p-3 rounded-xl border border-rose-100">
                    <AlertCircle className="w-4 h-4" /> {error}
                 </div>
              )}
              {successMsg && (
                 <div className="mt-4 text-xs font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <AlertCircle className="w-4 h-4" /> {successMsg}
                 </div>
              )}
           </div>

           {/* User List */}
           <div>
              <h3 className="text-sm font-black text-purple-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" /> Registered Users ({users.length})
              </h3>
              <div className="border border-purple-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-purple-50 text-purple-500 font-black text-[10px] uppercase tracking-widest">
                         <tr>
                            <th className="px-6 py-4">Username</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Password</th>
                            <th className="px-6 py-4">Active Until</th>
                            <th className="px-6 py-4 text-right">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-50">
                         {users.map(u => (
                            <tr key={u.username} className="hover:bg-purple-50/50 transition-colors">
                               <td className="px-6 py-4 font-bold text-purple-900 flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${u.role === 'super_admin' ? 'bg-amber-100 text-amber-600' : u.role === 'admin' ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-purple-100 text-purple-500'}`}>
                                    <User className="w-4 h-4" />
                                  </div>
                                  {u.username} 
                                  {u.username === currentUser.username && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md ml-2 font-black tracking-widest">YOU</span>}
                               </td>
                               <td className="px-6 py-4">
                                  <span className={`text-[10px] px-3 py-1.5 rounded-lg uppercase font-black tracking-widest ${u.role === 'super_admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : u.role === 'admin' ? 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200' : 'bg-purple-100 text-purple-600 border border-purple-200'}`}>
                                     {u.role.replace('_', ' ')}
                                  </span>
                               </td>
                               <td className="px-6 py-4 font-mono text-purple-400 text-xs">{u.password}</td>
                               <td className="px-6 py-4 text-xs font-semibold text-purple-600">
                                  {u.subscriptionEnd ? new Date(u.subscriptionEnd).toLocaleDateString() : 'Unlimited'}
                               </td>
                               <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => handleEdit(u)}
                                        className="text-purple-300 hover:text-tcm-primary hover:bg-purple-50 p-2 rounded-lg transition-all"
                                        title="Edit User"
                                     >
                                        <Edit2 className="w-4 h-4" />
                                     </button>
                                    {u.username !== 'admin' && u.username !== currentUser.username && (
                                       <button 
                                          onClick={() => handleDelete(u.username, (u as any).uid)}
                                          className="text-purple-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all"
                                          title="Delete User"
                                       >
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                    )}
                                  </div>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                 </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

export default UserManagementModal;

