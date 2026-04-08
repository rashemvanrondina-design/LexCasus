import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useUIStore } from '../../store/uiStore';
import { cn, getGreeting } from '../../lib/utils';
import { Sun, Moon, Menu, User } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/schedule': 'Schedule of Classes',
  '/practice': 'Practice Bar',
  '/chat': 'Legal Chat AI',
  '/codals': 'E-Codals',
  '/notes': 'Notes',
  '/cases': 'Cases',
  '/billing': 'Billing & Subscription',
  '/profile': 'My Profile',
  '/disclaimer': 'Disclaimer',
};

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { sidebarOpen, toggleSidebar, toggleMobileSidebar } = useUIStore();

  const title = pageTitles[location.pathname] || 'Lex Casus';

  return (
    <header className={cn(
      'sticky top-0 z-30 h-16 bg-white/80 dark:bg-navy-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-navy-800 flex items-center justify-between px-4 sm:px-6 transition-all duration-300',
      // This keeps the header aligned when the sidebar expands/collapses
      sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
    )}>
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:block p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            {getGreeting()}, Atty. {user?.name || ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User Profile Navigation */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 ml-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors"
        >
          <div className="w-8 h-8 bg-navy-100 dark:bg-navy-800 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-navy-600 dark:text-gray-300" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block">
            Atty. {user?.name || ''}
          </span>
        </button>
      </div>
    </header> 
  );
};

export default Header;