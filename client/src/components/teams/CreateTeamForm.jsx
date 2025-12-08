import { useState } from 'react';
import toast from 'react-hot-toast';
import useTeamStore from '../../stores/teamStore';
import useAuthStore from '../../stores/authStore';
import Button from '../common/Button';
import Input from '../common/Input';

export default function CreateTeamForm({ onSuccess, onCancel }) {
  const { createTeam } = useTeamStore();
  const { setActiveTeam } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const result = await createTeam(formData.name, formData.description);
    setIsLoading(false);

    if (result.success) {
      await setActiveTeam(result.team._id);
      toast.success('Team created successfully!');
      onSuccess(result.team);
    } else {
      toast.error(result.error || 'Failed to create team');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Team Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Enter team name"
        error={errors.name}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Describe your team"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          Create Team
        </Button>
      </div>
    </form>
  );
}
