import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../../store/adminStore'; 
import type { User } from '../../types';
import { cn, getInitials } from '../../lib/utils';
import {
  Search, Crown, Shield, UserCheck, 
  UserX, Loader2, Trash2, Diamond, Sparkles
} from 'lucide-react';

const UserManagementPage: React.FC = () => {
  // 🟢 1. Destructure Live Actions and State
  const { users, loading, fetchAdminStats, updateUserSubscription, toggleUserStatus, deleteUserRecord } = useAdminStore();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  // 🟢 2. PAGINATION / CHUNKING STATE
  const [visibleCount, setVisibleCount] = useState(20);

  // 🟢 3. Fetch Registry on Mount
  useEffect(() => {
    fetchAdminStats();
  }, [fetchAdminStats]);

  // 🟢 4. Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [search, planFilter]);

  const filteredUsers = users.filter(u => {
    const matchSearch = search === '' ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      (u as any).referralCode?.toLowerCase().includes(search.toLowerCase()); // 🟢 Allow searching by referral code!
    const matchPlan = planFilter === 'all' || u.subscription === planFilter;
    return matchSearch && matchPlan;
  });

  // 🟢 SLICE THE DATA FOR RENDER
  const displayedUsers = filteredUsers.slice(0, visibleCount);

  // 🟢 DELETE ACTION WITH STRONG CONFIRMATION
  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirm = window.confirm(`WARNING: Are you absolutely sure you want to permanently delete Atty. ${userName}'s database record? This cannot be undone.`);
    if (confirm) {
      // @ts-ignore - Assuming you added deleteUserRecord to your adminStore
      if (deleteUserRecord) await deleteUserRecord(userId);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-gold-500 mb-4" />
        <p className="text-gray-500 italic">Synchronizing Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Official Roll of Registered Attorneys
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge-navy">{users.length} Total</span>
          <span className="badge-purple">{users.filter(u => u.subscription === 'premium_plus').length} Premium+</span>
          <span className="badge-gold">{users.filter(u => u.subscription === 'premium').length} Premium</span>
          <span className="badge-green">{users.filter(u => u.isActive).length} Active</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or referral code..." className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'free', 'premium', 'premium_plus'].map(plan => (
            <button
              key={plan} onClick={() => setPlanFilter(plan)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
                planFilter === plan ? 'bg-navy-800 text-white dark:bg-gold-500' : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-400'
              )}
            >
              {plan.replace('_', '+ ')}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-800 bg-gray-50 dark:bg-navy-900/50">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-5 py-3">User</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-5 py-3">Plan</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-5 py-3">Referral Info</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-5 py-3">Joined</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-navy-800">
              {displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500 italic">No attorneys found matching the criteria.</td>
                </tr>
              ) : (
                displayedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-navy-900/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-navy-100 dark:bg-navy-800 rounded-full flex items-center justify-center font-bold text-navy-600 dark:text-gold-400">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Atty. {user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'badge', 
                        user.subscription === 'premium_plus' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                        user.subscription === 'premium' ? 'badge-gold' : 
                        'badge-navy'
                      )}>
                        {user.subscription === 'premium_plus' && <Diamond className="w-3 h-3 mr-1" />}
                        {user.subscription === 'premium' && <Crown className="w-3 h-3 mr-1" />}
                        {user.subscription === 'free' && <Shield className="w-3 h-3 mr-1" />}
                        {user.subscription.replace('_', '+ ')}
                      </span>
                    </td>
                    
                    {/* 🟢 NEW REFERRAL CELL */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          Code: <strong className="text-gold-600 dark:text-gold-400 tracking-widest">{(user as any).referralCode || 'N/A'}</strong>
                        </span>
                        {(user as any).referredBy && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            Referred By: <span className="font-mono bg-gray-200 dark:bg-navy-800 px-1 py-0.5 rounded">{(user as any).referredBy}</span>
                          </span>
                        )}
                        {(user as any).hasActiveDiscount && (
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                            <Sparkles size={10} /> Discount Active
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className={cn('badge', user.isActive ? 'badge-green' : 'badge-red')}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={user.subscription}
                          onChange={e => updateUserSubscription(user.id, e.target.value as any)}
                          className="text-[10px] uppercase font-bold bg-gray-100 dark:bg-navy-800 border-none rounded p-1 cursor-pointer"
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                          <option value="premium_plus">Premium+</option>
                        </select>
                        <button
                          title={user.isActive ? "Deactivate User" : "Activate User"}
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          className={cn('p-1.5 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-navy-700', user.isActive ? 'text-amber-500' : 'text-emerald-500')}
                        >
                          {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          title="Permanently Delete Database Record"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {visibleCount < filteredUsers.length && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setVisibleCount((prev) => prev + 20)}
            className="px-6 py-2.5 bg-white dark:bg-navy-900 hover:bg-gray-50 dark:hover:bg-navy-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors border border-gray-200 dark:border-navy-700 shadow-sm"
          >
            Load Next 20 <span className="font-normal text-gray-500 ml-1">(Showing {visibleCount} of {filteredUsers.length})</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;