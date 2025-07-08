import { ReactNode } from 'react';

interface ComplianceBadgeProps {
  icon: ReactNode;
  title: string;
  description: string;
  features: string[];
  iconColor?: string;
}

export function ComplianceBadge({ icon, title, description, features, iconColor = 'text-blue-600' }: ComplianceBadgeProps) {
  return (
    <div className="bg-slate-50 rounded-xl p-8 text-center">
      <div className={`w-16 h-16 bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6 ${iconColor.replace('text-', 'bg-')}/10`}>
        <div className={iconColor}>
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-4">{title}</h3>
      <p className="text-slate-600 mb-6">{description}</p>
      <ul className="text-sm text-slate-600 space-y-2">
        {features.map((feature, index) => (
          <li key={index}>✓ {feature}</li>
        ))}
      </ul>
    </div>
  );
}
