import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  Crown,
  Trash2,
  MoreVertical,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useTeamStore from '../stores/teamStore';
import useAuthStore from '../stores/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';

const roleOptions = [
  { value: 'Member', label: 'Member' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Admin', label: 'Admin' },
];

const roleIcons = {
  Admin: Crown,
  Manager: ShieldCheck,
  Member: Shield,
};

const roleColors = {
  Admin: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  Manager: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  Member: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400',
};

export default function TeamMembers() {
  const { setPageTitle, currentTeam } = useOutletContext();
  const { user } = useAuthStore();
  const {
    currentTeam: team,
    fetchTeam,
    addMember,
    updateMemberRole,
    removeMember,
    isLoading,
  } = useTeamStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Member');
  const [isAdding, setIsAdding] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    setPageTitle('Team Members');
  }, [setPageTitle]);

  useEffect(() => {
    if (currentTeam?._id) {
      fetchTeam(currentTeam._id);
    }
  }, [currentTeam, fetchTeam]);

  const isAdmin = team?.members?.find(
    (m) => m.user._id === user?._id && m.role === 'Admin'
  );

  const isOwner = team?.owner?._id === user?._id;

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsAdding(true);
    const result = await addMember(currentTeam._id, newMemberEmail, newMemberRole);
    setIsAdding(false);

    if (result.success) {
      toast.success(`${result.addedUser.name} added to the team!`);
      setNewMemberEmail('');
      setNewMemberRole('Member');
      setShowAddForm(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const result = await updateMemberRole(currentTeam._id, userId, newRole);
    if (result.success) {
      toast.success('Role updated successfully');
      setEditingMember(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    const result = await removeMember(currentTeam._id, userId);
    if (result.success) {
      toast.success(`${memberName} has been removed from the team`);
    } else {
      toast.error(result.error);
    }
    setMenuOpen(null);
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!currentTeam) {
    return (
      <EmptyState
        icon={Users}
        title="No team selected"
        description="Create or join a team to manage members."
      />
    );
  }

  if (isLoading && !team) {
    return <LoadingSpinner size="lg" className="py-20" />;
  }

  const members = team?.members || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-600" />
              {team?.name} - Team Members
            </h2>
            <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''} in this team
            </p>
          </div>
          {(isAdmin || isOwner) && (
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>

        {/* Add Member Form */}
        {showAddForm && (
          <form onSubmit={handleAddMember} className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text mb-4">
              Add New Team Member
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Email Address"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Enter member's email"
                  icon={Mail}
                />
              </div>
              <div>
                <Select
                  label="Role"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  options={roleOptions}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button type="submit" isLoading={isAdding}>
                <Check className="w-4 h-4 mr-2" />
                Add Member
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-muted mt-3 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              If the user doesn't exist, a guest account will be created automatically.
            </p>
          </form>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
          <h3 className="font-semibold text-gray-900 dark:text-dark-text">All Members</h3>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-dark-border">
          {members.map((member) => {
            const RoleIcon = roleIcons[member.role];
            const isSelf = member.user._id === user?._id;
            const isMemberOwner = team?.owner?._id === member.user._id;
            const canManage = (isAdmin || isOwner) && !isSelf && !isMemberOwner;

            return (
              <div
                key={member.user._id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  {member.user.avatar ? (
                    <img
                      src={member.user.avatar}
                      alt={member.user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                      {getInitials(member.user.name)}
                    </div>
                  )}

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-dark-text">
                        {member.user.name}
                      </h4>
                      {isSelf && (
                        <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                          You
                        </span>
                      )}
                      {isMemberOwner && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-dark-muted">
                      {member.user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Role Badge */}
                  {editingMember === member.user._id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.user._id, e.target.value)}
                        className="text-sm border border-gray-300 dark:border-dark-border rounded-lg px-3 py-1.5 bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {roleOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setEditingMember(null)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${roleColors[member.role]}`}
                    >
                      <RoleIcon className="w-4 h-4" />
                      {member.role}
                    </span>
                  )}

                  {/* Actions Menu */}
                  {canManage && (
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === member.user._id ? null : member.user._id)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {menuOpen === member.user._id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setMenuOpen(null)}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-gray-200 dark:border-dark-border py-1 z-20">
                            <button
                              onClick={() => {
                                setEditingMember(member.user._id);
                                setMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Shield className="w-4 h-4" />
                              Change Role
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.user._id, member.user.name)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove Member
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {members.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-dark-muted">No members in this team yet.</p>
          </div>
        )}
      </div>

      {/* Role Legend */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="font-semibold text-yellow-800 dark:text-yellow-300">Admin</span>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Full access: manage team settings, members, and all tasks
            </p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-800 dark:text-blue-300">Manager</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Can manage tasks, assign members, and view analytics
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-semibold text-gray-800 dark:text-gray-300">Member</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Can view and update assigned tasks only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
