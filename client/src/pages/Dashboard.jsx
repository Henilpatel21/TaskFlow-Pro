import { useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import useTeamStore from '../stores/teamStore';
import useTaskStore from '../stores/taskStore';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Dashboard() {
  const { setPageTitle, currentTeam } = useOutletContext();
  const { activity, fetchActivity } = useTeamStore();
  const { tasks, fetchTasks, isLoading } = useTaskStore();

  useEffect(() => {
    setPageTitle('Dashboard');
  }, [setPageTitle]);

  useEffect(() => {
    if (currentTeam?._id) {
      fetchTasks(currentTeam._id);
      fetchActivity(currentTeam._id);
    }
  }, [currentTeam, fetchTasks, fetchActivity]);

  if (!currentTeam) {
    return (
      <EmptyState
        icon={Users}
        title="No team selected"
        description="Create or join a team to get started with task management."
      />
    );
  }

  // Calculate statistics
  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'To Do').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    review: tasks.filter((t) => t.status === 'Review').length,
    done: tasks.filter((t) => t.status === 'Done').length,
    overdue: tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done'
    ).length,
  };

  // Get recent tasks
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  // Get upcoming deadlines
  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate && t.status !== 'Done')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-20" />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tasks"
          value={stats.total}
          icon={ListTodo}
          color="blue"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          label="Completed"
          value={stats.done}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertCircle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
            <Link
              to="/board"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tasks yet</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge status={task.status} />
                      <Badge priority={task.priority} />
                    </div>
                  </div>
                  {task.assignedTo && (
                    <Avatar name={task.assignedTo.name} size="sm" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Deadlines
          </h2>

          {upcomingDeadlines.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming deadlines</p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((task) => {
                const dueDate = new Date(task.dueDate);
                const isOverdue = dueDate < new Date();
                const isToday =
                  dueDate.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={task._id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isOverdue
                          ? 'bg-red-500'
                          : isToday
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                      <p
                        className={`text-sm ${
                          isOverdue ? 'text-red-600' : 'text-gray-500'
                        }`}
                      >
                        {isOverdue
                          ? 'Overdue'
                          : isToday
                          ? 'Due today'
                          : `Due ${dueDate.toLocaleDateString()}`}
                      </p>
                    </div>
                    {task.assignedTo && (
                      <Avatar name={task.assignedTo.name} size="sm" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>

        {activity.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activity.slice(0, 10).map((log) => (
              <div key={log._id} className="flex items-start gap-3">
                <Avatar name={log.user?.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{log.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
