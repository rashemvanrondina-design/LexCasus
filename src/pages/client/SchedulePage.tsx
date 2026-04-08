import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useScheduleStore } from '../../store/scheduleStore'; 
import { cn } from '../../lib/utils';
import {
  Plus, CalendarDays, Clock, Trash2, Edit3, CheckCircle2,
  Circle, BookOpen, FlaskConical, ClipboardList, RotateCcw, X, Loader2
} from 'lucide-react';

const typeConfig = {
  class: { label: 'Class', color: 'bg-blue-500', icon: BookOpen },
  task: { label: 'Task', color: 'bg-amber-500', icon: ClipboardList },
  exam: { label: 'Exam', color: 'bg-red-500', icon: FlaskConical },
  review: { label: 'Review', color: 'bg-emerald-500', icon: RotateCcw },
};

type ScheduleType = 'class' | 'task' | 'exam' | 'review';

const SchedulePage: React.FC = () => {
  const { user } = useAuthStore();
  
  const { 
    schedules, loading, loadingMore, hasMore, 
    fetchSchedules, fetchMoreSchedules, addSchedule, updateSchedule, deleteSchedule 
  } = useScheduleStore();

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(20); 

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: 'class' as ScheduleType,
  });

  useEffect(() => {
    if (user?.id) {
      fetchSchedules(user.id);
    }
  }, [user?.id, fetchSchedules]);

  const filteredItems = filter === 'all'
    ? schedules
    : schedules.filter(i => i.type === filter);

  const displayedItems = filteredItems.slice(0, visibleCount);

  const handleAdd = async () => {
    if (!user?.id) return;
    await addSchedule({
      userId: user.id,
      ...form,
      completed: false,
    });
    resetForm();
  };

  const handleEdit = async () => {
    if (!editingItem) return;
    await updateSchedule(editingItem.id, form);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this schedule item?")) {
      await deleteSchedule(id);
    }
  };

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    await updateSchedule(id, { completed: !currentStatus });
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingItem(null);
    setForm({ title: '', description: '', date: new Date().toISOString().split('T')[0], time: '09:00', type: 'class' });
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({ title: item.title, description: item.description, date: item.date, time: item.time, type: item.type as ScheduleType });
    setShowModal(true);
  };

  const handleLoadMore = async () => {
    if (visibleCount + 20 >= schedules.length && hasMore) {
      await fetchMoreSchedules();
    }
    setVisibleCount(prev => prev + 20);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Schedule of Classes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your classes, tasks, and review sessions</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Schedule
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'class', 'task', 'exam', 'review'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter === type
                ? 'bg-navy-800 text-white dark:bg-gold-500 dark:text-navy-900'
                : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-navy-700'
            )}
          >
            {type === 'all' ? 'All' : typeConfig[type as keyof typeof typeConfig]?.label || type}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div className="space-y-3 pb-20">
        {loading && schedules.length === 0 ? (
           <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /></div>
        ) : displayedItems.length === 0 ? (
          <div className="card p-12 text-center">
            <CalendarDays className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No schedule items found in your vault.</p>
          </div>
        ) : (
          displayedItems.map((item) => {
            const config = typeConfig[item.type as keyof typeof typeConfig];
            return (
              <div
                key={item.id}
                className={cn(
                  'card p-4 flex items-start gap-4 transition-all',
                  item.completed && 'opacity-60 bg-gray-50 dark:bg-navy-900/50'
                )}
              >
                <button onClick={() => toggleComplete(item.id, item.completed)} className="mt-1 flex-shrink-0 transition-transform active:scale-90">
                  {item.completed
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
                </button>

                <div className={cn('w-1 self-stretch rounded-full flex-shrink-0', config?.color || 'bg-gray-500')} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={cn(
                        'text-sm font-bold',
                        item.completed
                          ? 'line-through text-gray-400 dark:text-gray-500'
                          : 'text-navy-900 dark:text-white'
                      )}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="badge-navy">{config?.label || item.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                      <CalendarDays className="w-3 h-3" />
                      {item.date}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-navy-600 dark:hover:text-gold-400 hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Load More Button */}
        {!loading && (visibleCount < filteredItems.length || hasMore) && (
          <div className="flex justify-center pt-8 pb-4">
            <button 
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-8 py-3 bg-white dark:bg-navy-900 border-2 border-gray-200 dark:border-navy-800 text-navy-600 dark:text-gold-500 text-xs font-bold uppercase tracking-widest rounded-xl hover:border-gold-500 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {loadingMore && <Loader2 className="animate-spin w-4 h-4" />}
              {loadingMore ? 'Fetching Dates...' : 'Load More Schedule'}
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="card p-6 w-full max-w-md bg-white dark:bg-navy-900 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingItem ? 'Edit Schedule' : 'Add Schedule'}
              </h3>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Civil Law Review"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g., Chapter 4: Obligations and Contracts"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: key as ScheduleType }))}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium transition-colors',
                        form.type === key
                          ? 'bg-navy-800 text-white dark:bg-gold-500 dark:text-navy-900'
                          : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-navy-700'
                      )}
                    >
                      <config.icon className="w-4 h-4" />
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={editingItem ? handleEdit : handleAdd}
                  disabled={!form.title}
                  className="btn-primary flex-1"
                >
                  {editingItem ? 'Save Changes' : 'Add Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;