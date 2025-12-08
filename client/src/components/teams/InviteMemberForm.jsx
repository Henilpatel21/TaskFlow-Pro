import { useState } from 'react';
import toast from 'react-hot-toast';
import useTeamStore from '../../stores/teamStore';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

const roleOptions = [
  { value: 'Member', label: 'Member' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Admin', label: 'Admin' },
];

export default function InviteMemberForm({ teamId, onSuccess, onCancel }) {
  const { createInvite } = useTeamStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'Member',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const result = await createInvite(teamId, formData.email, formData.role);
    setIsLoading(false);

    if (result.success) {
      toast.success('Invitation sent!');
      onSuccess();
    } else {
      toast.error(result.error || 'Failed to send invitation');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Enter email address"
        error={errors.email}
      />

      <Select
        label="Role"
        value={formData.role}
        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        options={roleOptions}
      />

      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p className="font-medium mb-1">Role permissions:</p>
        <ul className="space-y-1">
          <li>
            <strong>Member:</strong> Can view and manage tasks
          </li>
          <li>
            <strong>Manager:</strong> Can also invite members and manage tasks
          </li>
          <li>
            <strong>Admin:</strong> Full access including team settings
          </li>
        </ul>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          Send Invitation
        </Button>
      </div>
    </form>
  );
}
