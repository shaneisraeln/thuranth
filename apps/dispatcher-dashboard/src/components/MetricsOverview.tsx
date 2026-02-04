import React from 'react';
import { TrendingUp, TrendingDown, Truck, Package, Leaf, Clock } from 'lucide-react';
import { Metrics } from '../types';

interface MetricsOverviewProps {
  metrics: Metrics;
}

const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  const metricCards = [
    {
      title: 'Vehicles Avoided',
      value: metrics.vehiclesAvoided,
      icon: Truck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Utilization Improvement',
      value: `${metrics.utilizationImprovement.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Parcels Consolidated',
      value: metrics.totalParcelsConsolidated,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: '+15%',
      trendUp: true,
    },
    {
      title: 'Emissions Saved',
      value: `${metrics.emissionsSaved.toFixed(1)} kg`,
      icon: Leaf,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+18%',
      trendUp: true,
    },
    {
      title: 'SLA Adherence',
      value: `${metrics.slaAdherence.toFixed(1)}%`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: '-2%',
      trendUp: false,
    },
    {
      title: 'Fuel Savings',
      value: `₹${metrics.fuelSavings.toFixed(0)}`,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      trend: '+22%',
      trendUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metricCards.map((metric, index) => (
        <div key={index} className="card p-4">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`w-5 h-5 ${metric.color}`} />
            </div>
            <div className={`flex items-center text-xs ${
              metric.trendUp ? 'text-green-600' : 'text-red-600'
            }`}>
              {metric.trendUp ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {metric.trend}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            <p className="text-sm text-gray-600">{metric.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsOverview;