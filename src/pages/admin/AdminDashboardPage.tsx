import React, { useEffect } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { formatRelativeTime } from '../../lib/utils';
import {
  Users, FlaskConical, CreditCard, TrendingUp,
  Activity, Crown, UserCheck, AlertCircle, Diamond, LucideIcon,
  Loader2, BookOpen
} from 'lucide-react';

const AdminDashboardPage: React.FC = () => {
  // 🟢 1. Destructure the live activity data
  const { stats, activities, loading, fetchAdminStats, fetchRecentActivity } = useAdminStore();

  useEffect(() => {
    fetchAdminStats();
    fetchRecentActivity(); // 🟢 Fetch real logs
  }, [fetchAdminStats, fetchRecentActivity]);

  if (loading && stats.totalUsers === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-gold-500 mb-2" />
        <p className="text-gray-500">Retrieving system analytics...</p>
      </div>
    );
  }

  // Fallbacks in case your store hasn't been updated to the new variable names yet
  const premiumPlusCount = stats.premiumPlusUsers || 0; 
  const premiumCount = stats.premiumUsers || stats.basicUsers || 0; 
  const freeCount = stats.totalUsers - (premiumPlusCount + premiumCount);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Live system overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub="Registered attorneys" />
        <StatCard icon={Activity} label="Active Subs" value={stats.activeSubscriptions} sub="Total paying users" />
        <StatCard icon={FlaskConical} label="Bar Questions" value={stats.totalQuestions} sub="Total database" />
        <StatCard icon={Diamond} label="Premium+ Users" value={premiumPlusCount} sub="₱599 subscribers" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Breakdown */}
        <div className="card p-6">
          <h3 className="section-title mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-navy-600 dark:text-gold-400" />
            Subscription Breakdown
          </h3>
          <div className="space-y-6">
            <ProgressBar 
              label="Premium+ (₱599)" 
              value={premiumPlusCount} 
              total={stats.totalUsers} 
              color="bg-purple-500" 
            />
            <ProgressBar 
              label="Premium (₱199)" 
              value={premiumCount} 
              total={stats.totalUsers} 
              color="bg-gold-500" 
            />
            <ProgressBar 
              label="Free Access" 
              value={freeCount} 
              total={stats.totalUsers} 
              color="bg-gray-400" 
            />
          </div>
        </div>

        {/* 🟢 REAL Recent Activity Feed */}
        <div className="card p-6">
          <h3 className="section-title mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-navy-600 dark:text-gold-400" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-400 italic text-sm">
                No recent activity recorded.
              </div>
            ) : (
              activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  sub: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, sub }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 bg-gray-100 dark:bg-navy-800 rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-600 dark:text-gold-400" />
      </div>
      <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
    <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
  </div>
);

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <span className="text-xs font-bold">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-navy-800 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

interface ActivityItemProps {
  activity: {
    id: string;
    type: string;
    action: string;
    detail: string;
    timestamp: number;
  };
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'user': return UserCheck;
      case 'subscription': return Crown;
      case 'question': return FlaskConical;
      case 'codal': return BookOpen;
      default: return AlertCircle;
    }
  };
  const Icon = getIcon();

  return (
    <div className="flex items-start gap-3 group">
      <div className="w-8 h-8 bg-gray-50 dark:bg-navy-900 border border-gray-100 dark:border-navy-800 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:border-gold-500/50 transition-colors">
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{activity.action}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">{activity.detail}</p>
      </div>
      <span className="text-[10px] font-medium text-gray-400 uppercase flex-shrink-0">
        {formatRelativeTime(activity.timestamp)}
      </span>
    </div>
  );
};

export default AdminDashboardPage;