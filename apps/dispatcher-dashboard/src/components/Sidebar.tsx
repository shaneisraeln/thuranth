import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  MapPin, 
  Package, 
  Truck, 
  BarChart3, 
  History, 
  Menu,
  X 
} from 'lucide-react';
import { RootState } from '../store';
import { toggleSidebar } from '../store/slices/uiSlice';

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state: RootState) => state.ui);

  const menuItems = [
    { path: '/dashboard', icon: MapPin, label: 'Dashboard', description: 'Operations overview' },
    { path: '/vehicles', icon: Truck, label: 'Vehicles', description: 'Fleet management' },
    { path: '/parcels', icon: Package, label: 'Parcels', description: 'Parcel queue' },
    { path: '/decisions', icon: History, label: 'Decisions', description: 'Decision history' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', description: 'Performance metrics' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">PDCP</h1>
                <p className="text-xs text-gray-500">Dispatcher Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  sidebar-item ${isActive ? 'active' : ''}
                `}
                onClick={() => {
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 1024) {
                    dispatch(toggleSidebar());
                  }
                }}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>PDCP v1.0.0</p>
              <p>© 2024 Post-Dispatch Consolidation Platform</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;