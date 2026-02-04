import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Download, Calendar, TrendingUp, Leaf, Truck, DollarSign } from 'lucide-react';
import { AppDispatch } from '../store';
import { analyticsApi } from '../services/api';
import { addNotification } from '../store/slices/uiSlice';

interface ImpactData {
  date: string;
  vehiclesAvoided: number;
  emissionsSaved: number;
  fuelSavings: number;
  costSavings: number;
  parcelsConsolidated: number;
  utilizationImprovement: number;
}

const ImpactReporting: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [impactData, setImpactData] = useState<ImpactData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportType, setReportType] = useState<'environmental' | 'operational' | 'financial'>('environmental');

  useEffect(() => {
    fetchImpactData();
  }, [dateRange]);

  const fetchImpactData = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Mock data - in real implementation, this would come from the API
      const mockData: ImpactData[] = Array.from({ length: parseInt(dateRange) }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        return {
          date: date.toISOString().split('T')[0],
          vehiclesAvoided: Math.floor(Math.random() * 20) + 5,
          emissionsSaved: Math.random() * 50 + 10,
          fuelSavings: Math.random() * 2000 + 500,
          costSavings: Math.random() * 5000 + 1000,
          parcelsConsolidated: Math.floor(Math.random() * 100) + 20,
          utilizationImprovement: Math.random() * 30 + 10,
        };
      });

      setImpactData(mockData);
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to fetch impact data',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      const response = await analyticsApi.getImpactReport(
        startDate.toISOString(),
        endDate.toISOString()
      );

      // Create and download the report
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `impact-report-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      dispatch(addNotification({
        type: 'success',
        message: 'Impact report downloaded successfully',
      }));
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to generate impact report',
      }));
    }
  };

  const getTotalImpact = () => {
    return impactData.reduce((acc, curr) => ({
      vehiclesAvoided: acc.vehiclesAvoided + curr.vehiclesAvoided,
      emissionsSaved: acc.emissionsSaved + curr.emissionsSaved,
      fuelSavings: acc.fuelSavings + curr.fuelSavings,
      costSavings: acc.costSavings + curr.costSavings,
      parcelsConsolidated: acc.parcelsConsolidated + curr.parcelsConsolidated,
    }), {
      vehiclesAvoided: 0,
      emissionsSaved: 0,
      fuelSavings: 0,
      costSavings: 0,
      parcelsConsolidated: 0,
    });
  };

  const totalImpact = getTotalImpact();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Impact Reporting</h2>
          <p className="text-gray-600">Comprehensive analysis of consolidation benefits</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={generateReport}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Vehicles Avoided</p>
              <p className="text-2xl font-bold text-green-600">{totalImpact.vehiclesAvoided}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Equivalent to {(totalImpact.vehiclesAvoided * 0.8).toFixed(1)} fewer dispatches
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CO₂ Emissions Saved</p>
              <p className="text-2xl font-bold text-green-600">{totalImpact.emissionsSaved.toFixed(1)} kg</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Equivalent to {(totalImpact.emissionsSaved / 2.3).toFixed(1)} liters of fuel saved
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Fuel Savings</p>
              <p className="text-2xl font-bold text-blue-600">₹{totalImpact.fuelSavings.toFixed(0)}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Average ₹{(totalImpact.fuelSavings / impactData.length).toFixed(0)} per day
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Parcels Consolidated</p>
              <p className="text-2xl font-bold text-purple-600">{totalImpact.parcelsConsolidated}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {((totalImpact.parcelsConsolidated / impactData.length) * 100 / totalImpact.parcelsConsolidated).toFixed(1)}% consolidation rate
          </div>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex space-x-4 border-b border-gray-200">
        {[
          { id: 'environmental', label: 'Environmental Impact', icon: Leaf },
          { id: 'operational', label: 'Operational Efficiency', icon: Truck },
          { id: 'financial', label: 'Financial Benefits', icon: DollarSign },
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => setReportType(type.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm ${
              reportType === type.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <type.icon className="w-4 h-4" />
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reportType === 'environmental' && (
          <>
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">CO₂ Emissions Saved Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={impactData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="emissionsSaved" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                    name="CO₂ Saved (kg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cumulative Environmental Impact</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={impactData.map((item, index) => ({
                  ...item,
                  cumulativeEmissions: impactData.slice(0, index + 1).reduce((sum, curr) => sum + curr.emissionsSaved, 0),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeEmissions" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Cumulative CO₂ Saved (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {reportType === 'operational' && (
          <>
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicles Avoided Daily</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={impactData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="vehiclesAvoided" fill="#3b82f6" name="Vehicles Avoided" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilization Improvement</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={impactData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="utilizationImprovement" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Utilization Improvement (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {reportType === 'financial' && (
          <>
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Cost Savings</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={impactData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="costSavings" 
                    stroke="#f59e0b" 
                    fill="#f59e0b" 
                    fillOpacity={0.6}
                    name="Cost Savings (₹)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel vs Total Savings</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={impactData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="fuelSavings" fill="#10b981" name="Fuel Savings (₹)" />
                  <Bar dataKey="costSavings" fill="#3b82f6" name="Total Savings (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Trend Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              +{((totalImpact.emissionsSaved / impactData.length) * 7).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Weekly emissions reduction trend</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              +{((totalImpact.vehiclesAvoided / impactData.length) * 7).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Weekly vehicle optimization trend</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              +{((totalImpact.costSavings / impactData.length) * 7).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Weekly cost savings trend</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactReporting;