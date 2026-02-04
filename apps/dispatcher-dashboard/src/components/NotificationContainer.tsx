import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { RootState } from '../store';
import { removeNotification } from '../store/slices/uiSlice';

const NotificationContainer: React.FC = () => {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state: RootState) => state.ui);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.slice(0, 5).map((notification) => (
        <div
          key={notification.id}
          className={`
            ${getBgColor(notification.type)}
            border rounded-lg p-4 shadow-lg transition-all duration-300
            notification-enter notification-enter-active
          `}
        >
          <div className="flex items-start space-x-3">
            {getIcon(notification.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => dispatch(removeNotification(notification.id))}
              className="flex-shrink-0 p-1 rounded-md hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      ))}
      
      {notifications.length > 5 && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            +{notifications.length - 5} more notifications
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationContainer;