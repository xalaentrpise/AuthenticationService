import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  features: string[];
  iconColor?: string;
}

export function FeatureCard({ icon, title, description, features, iconColor = 'text-blue-600' }: FeatureCardProps) {
  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardContent className="p-8">
        <div className={`w-12 h-12 bg-opacity-10 rounded-lg flex items-center justify-center mb-6 ${iconColor.replace('text-', 'bg-')}/10`}>
          <div className={iconColor}>
            {icon}
          </div>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-600 mb-4">{description}</p>
        <ul className="space-y-2 text-sm text-slate-600">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
