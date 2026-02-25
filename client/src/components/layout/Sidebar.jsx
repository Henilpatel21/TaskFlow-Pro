import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  Calendar,
  FolderKanban,
  BarChart3,
  Users,
  UserPlus,
  Settings,
  Plus,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useTeamStore from '../../stores/teamStore';
import Avatar from '../common/Avatar';
import Dropdown, { DropdownItem } from '../common/Dropdown';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/board', icon: Kanban, label: 'Kanban Board' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/members', icon: UserPlus, label: 'Members' },
];

export default function Sidebar({ onCreateTeam }) {
  const navigate = useNavigate();
  const { user, logout, setActiveTeam } = useAuthStore();
  const { teams, currentTeam, setCurrentTeam, fetchTeam } = useTeamStore();

  const handleTeamSwitch = async (team) => {
    await setActiveTeam(team._id);
    setCurrentTeam(team);
    await fetchTeam(team._id);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-600">TaskFlow Pro</h1>
      </div>

      {/* Team Selector */}
      <div className="p-4 border-b border-gray-200">
        <Dropdown
          align="left"
          direction="up"
          trigger={
            <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-semibold flex-shrink-0">
                  {currentTeam?.name?.charAt(0) || '?'}
                </div>
                <span className="font-medium text-gray-900 truncate">
                  {currentTeam?.name || 'Select Team'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          }
        >
          {({ close }) => (
            <>
              {teams.map((team) => (
                <DropdownItem
                  key={team._id}
                  onClick={() => {
                    handleTeamSwitch(team);
                    close();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-semibold">
                      {team.name.charAt(0)}
                    </div>
                    <span className="truncate">{team.name}</span>
                  </div>
                </DropdownItem>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <DropdownItem
                  onClick={() => {
                    close();
                    onCreateTeam();
                  }}
                >
                  <div className="flex items-center gap-2 text-primary-600">
                    <Plus className="w-4 h-4" />
                    <span>Create Team</span>
                  </div>
                </DropdownItem>
              </div>
            </>
          )}
        </Dropdown>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Menu */}
      <div className="p-4 border-t border-gray-200">
        <Dropdown
          align="left"
          direction="up"
          trigger={
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Avatar name={user?.name} size="sm" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </button>
          }
        >
          {({ close }) => (
            <>
              <DropdownItem
                onClick={() => {
                  close();
                  navigate('/settings');
                }}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </div>
              </DropdownItem>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <DropdownItem danger onClick={handleLogout}>
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </div>
                </DropdownItem>
              </div>
            </>
          )}
        </Dropdown>
      </div>
    </aside>
  );
}
