import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  Award,
  Flame,
  Trophy,
  Star,
  Calendar,
  ListTodo,
} from 'lucide-react';
import useTaskStore from '../stores/taskStore';
import useTeamStore from '../stores/teamStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function Analytics() {
  const { setPageTitle, currentTeam } = useOutletContext();
  const { tasks, fetchTasks, isLoading } = useTaskStore();
  const { currentTeam: team } = useTeamStore();

  useEffect(() => {
    setPageTitle('Analytics');
  }, [setPageTitle]);

  useEffect(() => {
    if (currentTeam?._id) {
      fetchTasks(currentTeam._id);
    }
  }, [currentTeam, fetchTasks]);

  // Calculate analytics data
  const analytics = useMemo(() => {
    if (!tasks.length) return null;

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Done').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const todo = tasks.filter((t) => t.status === 'To Do').length;
    const review = tasks.filter((t) => t.status === 'Review').length;
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done'
    ).length;

    // Priority breakdown
    const priorities = {
      Low: tasks.filter((t) => t.priority === 'Low').length,
      Medium: tasks.filter((t) => t.priority === 'Medium').length,
      High: tasks.filter((t) => t.priority === 'High').length,
      Urgent: tasks.filter((t) => t.priority === 'Urgent').length,
    };

    // Completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Tasks by assignee with detailed info
    const byAssignee = tasks.reduce((acc, task) => {
      const name = task.assignedTo?.name || 'Unassigned';
      const oderId = task.assignedTo?._id || 'unassigned';
      const email = task.assignedTo?.email || '';
      const avatar = task.assignedTo?.avatar || '';

      if (!acc[oderId]) {
        acc[oderId] = {
          name,
          email,
          avatar,
          total: 0,
          completed: 0,
          inProgress: 0,
          todo: 0,
          review: 0,
          overdue: 0,
          urgent: 0,
          high: 0,
          completedTasks: [],
          pendingTasks: [],
          recentActivity: [],
        };
      }
      acc[oderId].total++;

      // Status counts
      if (task.status === 'Done') {
        acc[oderId].completed++;
        acc[oderId].completedTasks.push(task);
      } else {
        acc[oderId].pendingTasks.push(task);
        if (task.status === 'In Progress') acc[oderId].inProgress++;
        if (task.status === 'To Do') acc[oderId].todo++;
        if (task.status === 'Review') acc[oderId].review++;
      }

      // Overdue check
      if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done') {
        acc[oderId].overdue++;
      }

      // Priority counts
      if (task.priority === 'Urgent') acc[oderId].urgent++;
      if (task.priority === 'High') acc[oderId].high++;

      // Recent activity (last 5 tasks)
      acc[oderId].recentActivity.push({
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        updatedAt: task.updatedAt,
      });

      return acc;
    }, {});

    // Sort recent activity by update time
    Object.values(byAssignee).forEach(member => {
      member.recentActivity.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      member.recentActivity = member.recentActivity.slice(0, 5);
    });

    // Tasks created this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = tasks.filter((t) => new Date(t.createdAt) > weekAgo).length;

    return {
      total,
      completed,
      inProgress,
      todo,
      review,
      overdue,
      priorities,
      completionRate,
      byAssignee,
      thisWeek,
    };
  }, [tasks]);

  if (!currentTeam) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No team selected"
        description="Create or join a team to view analytics."
      />
    );
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-20" />;
  }

  if (!analytics) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No data yet"
        description="Create some tasks to see analytics."
      />
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Completion Rate"
          value={`${analytics.completionRate}%`}
          icon={Target}
          color="green"
          subtitle={`${analytics.completed} of ${analytics.total} tasks`}
        />
        <StatCard
          label="In Progress"
          value={analytics.inProgress}
          icon={Clock}
          color="blue"
          subtitle="Currently working on"
        />
        <StatCard
          label="Overdue"
          value={analytics.overdue}
          icon={AlertTriangle}
          color="red"
          subtitle="Need attention"
        />
        <StatCard
          label="This Week"
          value={analytics.thisWeek}
          icon={Zap}
          color="purple"
          subtitle="Tasks created"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">
            Task Status Distribution
          </h3>
          <div className="space-y-4">
            <ProgressBar label="To Do" value={analytics.todo} total={analytics.total} color="gray" />
            <ProgressBar label="In Progress" value={analytics.inProgress} total={analytics.total} color="blue" />
            <ProgressBar label="Review" value={analytics.review} total={analytics.total} color="purple" />
            <ProgressBar label="Done" value={analytics.completed} total={analytics.total} color="green" />
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">
            Priority Breakdown
          </h3>
          <div className="space-y-4">
            <ProgressBar label="Low" value={analytics.priorities.Low} total={analytics.total} color="gray" />
            <ProgressBar label="Medium" value={analytics.priorities.Medium} total={analytics.total} color="blue" />
            <ProgressBar label="High" value={analytics.priorities.High} total={analytics.total} color="orange" />
            <ProgressBar label="Urgent" value={analytics.priorities.Urgent} total={analytics.total} color="red" />
          </div>
        </div>
      </div>

      {/* Team Members Performance - Expandable Cards */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Members Performance
          <span className="ml-2 px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs rounded-full">
            {Object.keys(analytics.byAssignee).length} members
          </span>
        </h3>
        <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
          Click on a team member to see detailed task information
        </p>
        <div className="space-y-3">
          {Object.entries(analytics.byAssignee)
            .sort(([, a], [, b]) => {
              const rateA = a.total > 0 ? (a.completed / a.total) * 100 : 0;
              const rateB = b.total > 0 ? (b.completed / b.total) * 100 : 0;
              return rateB - rateA;
            })
            .map(([id, member], index) => (
              <MemberCard key={id} member={member} rank={index + 1} />
            ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat icon={CheckCircle2} label="Completed Today" value="0" />
        <MiniStat icon={TrendingUp} label="Productivity Score" value={`${analytics.completionRate}%`} />
        <MiniStat icon={Users} label="Active Members" value={Object.keys(analytics.byAssignee).length} />
        <MiniStat icon={Target} label="Sprint Progress" value={`${analytics.completed}/${analytics.total}`} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, subtitle }) {
  const colors = {
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 transition-all hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-dark-muted">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-dark-text mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, total, color }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  const colors = {
    gray: 'bg-gray-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm text-gray-500 dark:text-dark-muted">
          {value} ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-700 ease-out ${colors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border p-4 flex items-center gap-3">
      <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
        <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-dark-muted">{label}</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">{value}</p>
      </div>
    </div>
  );
}

function MemberCard({ member, rank }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rate = member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0;

  // Determine badge based on rank and performance
  const getBadge = () => {
    if (rank === 1 && rate >= 50) return { icon: Trophy, color: 'text-yellow-500', label: 'Top Performer' };
    if (rate >= 80) return { icon: Star, color: 'text-green-500', label: 'Excellent' };
    if (rate >= 60) return { icon: Award, color: 'text-blue-500', label: 'Good Progress' };
    if (member.inProgress > 0) return { icon: Flame, color: 'text-orange-500', label: 'Active' };
    return null;
  };

  const badge = getBadge();

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const statusColors = {
    'To Do': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    'Review': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    'Done': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  };

  const priorityColors = {
    'Low': 'bg-gray-100 text-gray-600',
    'Medium': 'bg-blue-100 text-blue-600',
    'High': 'bg-orange-100 text-orange-600',
    'Urgent': 'bg-red-100 text-red-600',
  };

  return (
    <div className="border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header - Always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              {member.avatar ? (
                <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                  {getInitials(member.name)}
                </div>
              )}
              {/* Rank badge */}
              {rank <= 3 && (
                <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  rank === 1 ? 'bg-yellow-400 text-yellow-900' : rank === 2 ? 'bg-gray-300 text-gray-700' : 'bg-orange-400 text-orange-900'
                }`}>
                  {rank}
                </div>
              )}
            </div>

            {/* Name and email */}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 dark:text-dark-text">{member.name}</h4>
                {badge && (
                  <span className={`flex items-center gap-1 text-xs ${badge.color}`}>
                    <badge.icon className="w-3 h-3" />
                    {badge.label}
                  </span>
                )}
              </div>
              {member.email && (
                <p className="text-sm text-gray-500 dark:text-dark-muted">{member.email}</p>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">{member.completed}</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">{member.total - member.completed}</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted">Pending</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {rate}%
              </div>
              <p className="text-xs text-gray-500 dark:text-dark-muted">Success Rate</p>
            </div>

            {/* Expand icon */}
            <div className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-dark-border p-4 bg-gray-50 dark:bg-gray-800/50 animate-slide-up">
          {/* Status breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white dark:bg-dark-card rounded-lg p-3 border border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="text-xs text-gray-500 dark:text-dark-muted">To Do</span>
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-dark-text">{member.todo}</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg p-3 border border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-500 dark:text-dark-muted">In Progress</span>
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-dark-text">{member.inProgress}</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg p-3 border border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-xs text-gray-500 dark:text-dark-muted">In Review</span>
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-dark-text">{member.review}</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg p-3 border border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-500 dark:text-dark-muted">Completed</span>
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-dark-text">{member.completed}</p>
            </div>
          </div>

          {/* Warnings */}
          {(member.overdue > 0 || member.urgent > 0) && (
            <div className="flex gap-3 mb-4">
              {member.overdue > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {member.overdue} overdue task{member.overdue > 1 ? 's' : ''}
                </div>
              )}
              {member.urgent > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg text-sm">
                  <Zap className="w-4 h-4" />
                  {member.urgent} urgent task{member.urgent > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Activity
            </h5>
            <div className="space-y-2">
              {member.recentActivity.length > 0 ? (
                member.recentActivity.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border"
                  >
                    <div className="flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-dark-text truncate max-w-[200px]">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[task.status]}`}>
                        {task.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-dark-muted">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-dark-muted italic">No recent activity</p>
              )}
            </div>
          </div>

          {/* Completed Tasks List */}
          {member.completedTasks.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Completed Tasks ({member.completedTasks.length})
              </h5>
              <div className="flex flex-wrap gap-2">
                {member.completedTasks.slice(0, 8).map((task, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs"
                  >
                    {task.title}
                  </span>
                ))}
                {member.completedTasks.length > 8 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs">
                    +{member.completedTasks.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pending Tasks List */}
          {member.pendingTasks.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Pending Tasks ({member.pendingTasks.length})
              </h5>
              <div className="flex flex-wrap gap-2">
                {member.pendingTasks.slice(0, 8).map((task, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-1 rounded-lg text-xs ${
                      task.status === 'In Progress'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : task.status === 'Review'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {task.title}
                  </span>
                ))}
                {member.pendingTasks.length > 8 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs">
                    +{member.pendingTasks.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Performance insights */}
          <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <h5 className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1">Performance Insight</h5>
            <p className="text-xs text-primary-600 dark:text-primary-400">
              {rate >= 80
                ? `Excellent work! ${member.name} has a high completion rate and is a valuable team contributor.`
                : rate >= 60
                ? `${member.name} is making good progress. ${member.total - member.completed} tasks remaining to complete.`
                : rate >= 40
                ? `${member.name} has room for improvement. Consider checking for blockers or redistributing tasks.`
                : member.total === 0
                ? `No tasks assigned to ${member.name} yet.`
                : `${member.name} may need support. Consider a check-in to identify any challenges.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
