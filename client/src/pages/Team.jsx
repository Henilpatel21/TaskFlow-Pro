import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  MoreVertical,
  Crown,
  Shield,
  Users,
  Mail,
  Trash2,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../stores/authStore';
import useTeamStore from '../stores/teamStore';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Dropdown, { DropdownItem } from '../components/common/Dropdown';
import EmptyState from '../components/common/EmptyState';
import InviteMemberForm from '../components/teams/InviteMemberForm';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Team() {
  const navigate = useNavigate();
  const { setPageTitle, currentTeam } = useOutletContext();
  const { user } = useAuthStore();
  const {
    invites,
    myInvites,
    fetchTeamInvites,
    fetchMyInvites,
    updateMemberRole,
    removeMember,
    leaveTeam,
    acceptInvite,
    declineInvite,
    cancelInvite,
    deleteTeam,
    isLoading,
  } = useTeamStore();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setPageTitle('Team Management');
  }, [setPageTitle]);

  useEffect(() => {
    if (currentTeam?._id) {
      fetchTeamInvites(currentTeam._id);
    }
    fetchMyInvites();
  }, [currentTeam, fetchTeamInvites, fetchMyInvites]);

  if (!currentTeam) {
    return (
      <EmptyState
        icon={Users}
        title="No team selected"
        description="Create or join a team to manage members."
      />
    );
  }

  const currentMember = currentTeam.members?.find(
    (m) => m.user._id === user?._id || m.user === user?._id
  );
  const isAdmin = currentMember?.role === 'Admin';
  const isManager = isAdmin || currentMember?.role === 'Manager';
  const isOwner = currentTeam.owner?._id === user?._id || currentTeam.owner === user?._id;

  const handleRoleChange = async (userId, newRole) => {
    const result = await updateMemberRole(currentTeam._id, userId, newRole);
    if (result.success) {
      toast.success('Role updated successfully');
    } else {
      toast.error(result.error || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }
    const result = await removeMember(currentTeam._id, userId);
    if (result.success) {
      toast.success('Member removed successfully');
    } else {
      toast.error(result.error || 'Failed to remove member');
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;
    const result = await leaveTeam(currentTeam._id);
    if (result.success) {
      toast.success('Left team successfully');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Failed to leave team');
    }
  };

  const handleDeleteTeam = async () => {
    const result = await deleteTeam(currentTeam._id);
    if (result.success) {
      toast.success('Team deleted successfully');
      setShowDeleteConfirm(false);
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Failed to delete team');
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    const result = await acceptInvite(inviteId);
    if (result.success) {
      toast.success('Joined team successfully!');
    } else {
      toast.error(result.error || 'Failed to accept invite');
    }
  };

  const handleDeclineInvite = async (inviteId) => {
    await declineInvite(inviteId);
    toast.success('Invite declined');
  };

  const handleCancelInvite = async (inviteId) => {
    await cancelInvite(inviteId);
    toast.success('Invite cancelled');
  };

  return (
    <div className="space-y-6">
      {/* Pending Invites (for current user) */}
      {myInvites.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Invitations
          </h2>
          <div className="space-y-3">
            {myInvites.map((invite) => (
              <div
                key={invite._id}
                className="flex items-center justify-between bg-white p-4 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {invite.team?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Invited by {invite.invitedBy?.name} as {invite.role}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptInvite(invite._id)}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDeclineInvite(invite._id)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {currentTeam.name}
            </h2>
            {currentTeam.description && (
              <p className="text-gray-600 mt-1">{currentTeam.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              {currentTeam.members?.length || 0} members
            </p>
          </div>
          <div className="flex gap-2">
            {isManager && (
              <Button onClick={() => setShowInviteModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            )}
            {!isOwner && (
              <Button variant="ghost" onClick={handleLeaveTeam}>
                <LogOut className="w-4 h-4 mr-2" />
                Leave Team
              </Button>
            )}
            {isOwner && (
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Team
              </Button>
            )}
          </div>
        </div>

        {/* Members List */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Team Members</h3>
          <div className="space-y-3">
            {currentTeam.members?.map((member) => {
              const memberUser = member.user;
              const isCurrentUser = memberUser._id === user?._id;
              const isMemberOwner =
                currentTeam.owner?._id === memberUser._id ||
                currentTeam.owner === memberUser._id;

              return (
                <div
                  key={memberUser._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={memberUser.name} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {memberUser.name}
                          {isCurrentUser && (
                            <span className="text-gray-500 ml-1">(you)</span>
                          )}
                        </p>
                        {isMemberOwner && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{memberUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge role={member.role} />

                    {isAdmin && !isCurrentUser && !isMemberOwner && (
                      <Dropdown
                        trigger={
                          <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        }
                      >
                        {({ close }) => (
                          <>
                            <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                              Change Role
                            </p>
                            {['Member', 'Manager', 'Admin'].map((role) => (
                              <DropdownItem
                                key={role}
                                onClick={() => {
                                  handleRoleChange(memberUser._id, role);
                                  close();
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {role === 'Admin' && (
                                    <Shield className="w-4 h-4" />
                                  )}
                                  {role === 'Manager' && (
                                    <Users className="w-4 h-4" />
                                  )}
                                  {role === 'Member' && (
                                    <Users className="w-4 h-4" />
                                  )}
                                  {role}
                                  {member.role === role && ' ✓'}
                                </div>
                              </DropdownItem>
                            ))}
                            <div className="border-t border-gray-100 mt-1 pt-1">
                              <DropdownItem
                                danger
                                onClick={() => {
                                  handleRemoveMember(
                                    memberUser._id,
                                    memberUser.name
                                  );
                                  close();
                                }}
                              >
                                Remove from team
                              </DropdownItem>
                            </div>
                          </>
                        )}
                      </Dropdown>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Team Invites */}
      {isManager && invites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Pending Invitations
          </h3>
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Invited as {invite.role} by {invite.invitedBy?.name}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCancelInvite(invite._id)}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
      >
        <InviteMemberForm
          teamId={currentTeam._id}
          onSuccess={() => {
            setShowInviteModal(false);
            fetchTeamInvites(currentTeam._id);
          }}
          onCancel={() => setShowInviteModal(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Team"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{currentTeam.name}</strong>?
            This will permanently delete all tasks, activity logs, and remove
            all members. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTeam}
              className="flex-1"
            >
              Delete Team
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
