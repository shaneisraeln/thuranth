import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { RootState, AppDispatch } from '../store';
import { fetchHistoricalMetrics } from '../store/slices/metricsSlice';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';

const LiveMetricsDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentMetrics, historicalMetrics } = useSelector((state: RootState) => state.metrics);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    dispatch(fetchHistoricalMetrics({
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    }));
  }, [dispatch, timeRange]);

  // Sample data for charts (in real implementation, this would come from historicalMetrics)
  const utilizationData = [
    { time: '00:00', utilization: 65, capacity: 80 },
    { time: '04:00', utilization: 45, capacity: 80 },
    { time: '08:00', utilization: 85, capacity: 80 },
    { time: '12:00', utilization: 92, capacity: 80 },
    { time: '16:00', utilization: 78, capacity: 80 },
    { time: '20:00', utilization: 55, capacity: 80 },
  ];

  const emissionsData = [
    { time: '00:00', saved: 12, baseline: 45 },
    { time: '04:00', saved: 8, baseline: 30 },
    { time: '08:00', saved: 25, baseline: 65 },
    { time: '12:00', saved: 35, baseline: 80 },
    { time: '16:00', saved: 28, baseline: 70 },
    { time: '20:00', saved: 18, baseline: 50 },
  ];

  const vehicleTypeData = [
    { name: '2-Wheeler', value: 65, color: '#3b82f6' },
    { name: '4-Wheeler', value: 35, color: '#10b981' },
  ];

  const consolidationData = [
    { category: 'Successful', count: 145, color: '#10b981' },
    { category: 'Failed', count: 23, color: '#ef4444' },
    { category: 'Pending', count: 12, color: '#f59e0b' },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Live Metrics Dashboard</h2>
        <div className="flex space-x-2">
          {(['1h', '24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Vehicles Avoided Today</p>
              <p className="text-2xl font-bold text-green-600">{currentMetrics.vehiclesAvoided}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+12% from yesterday</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilization Rate</p>
              <p className="text-2xl font-bold text-blue-600">{currentMetrics.utilizationImprovement.toFixed(1)}%</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+8% from yesterday</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CO₂ Saved (kg)</p>
              <p className="text-2xl font-bold text-green-600">{currentMetrics.emissionsSaved.toFixed(1)}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+18% from yesterday</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">SLA Adherence</p>
              <p className="text-2xl font-bold text-orange-600">{currentMetrics.slaAdherence.toFixed(1)}%</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            <span className="text-red-600">-2% from yesterday</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Utilization Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Utilization Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="utilization" 
                stackId="1" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
                name="Current Utilization (%)"
              />
              <Area 
                type="monotone" 
                dataKey="capacity" 
                stackId="2" 
                stroke="#e5e7eb" 
                fill="#e5e7eb" 
                fillOpacity={0.3}
                name="Total Capacity (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Emissions Savings */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CO₂ Emissions Impact</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={emissionsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="saved" 
                stroke="#10b981" 
                strokeWidth={3}
                name="CO₂ Saved (kg)"
              />
              <Line 
                type="monotone" 
                dataKey="baseline" 
                stroke="#ef4444" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Baseline Emissions (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle Type Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fleet Composition</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={vehicleTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {vehicleTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Consolidation Success Rate */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Consolidation Results</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={consolidationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6">
                {consolidationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Parcel P-2024-001 consolidated with Vehicle V-456</p>
              <p className="text-xs text-gray-500">2 minutes ago • Saved 2.3 kg CO₂</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Decision engine evaluated 5 parcels</p>
              <p className="text-xs text-gray-500">5 minutes ago • 4 successful consolidations</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Manual override applied to Parcel P-2024-002</p>
              <p className="text-xs text-gray-500">8 minutes ago • Reason: Customer request</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Vehicle V-123 reached 85% capacity</p>
              <p className="text-xs text-gray-500">12 minutes ago • Flagged for optimization</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMetricsDashboard;