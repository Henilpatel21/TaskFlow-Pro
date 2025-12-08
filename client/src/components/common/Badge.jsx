const variants = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
};

const priorityColors = {
  Low: 'gray',
  Medium: 'blue',
  High: 'orange',
  Urgent: 'red',
};

const statusColors = {
  'To Do': 'gray',
  'In Progress': 'blue',
  Review: 'purple',
  Done: 'green',
};

const roleColors = {
  Admin: 'purple',
  Manager: 'blue',
  Member: 'gray',
};

export default function Badge({
  children,
  variant = 'gray',
  priority,
  status,
  role,
  className = '',
}) {
  let color = variant;

  if (priority) color = priorityColors[priority] || 'gray';
  if (status) color = statusColors[status] || 'gray';
  if (role) color = roleColors[role] || 'gray';

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full
        text-xs font-medium
        ${variants[color]}
        ${className}
      `}
    >
      {children || priority || status || role}
    </span>
  );
}
