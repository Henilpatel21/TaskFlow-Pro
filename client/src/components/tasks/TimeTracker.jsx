import { useState, useEffect } from 'react';
import { Play, Pause, Clock, Plus, Timer } from 'lucide-react';
import toast from 'react-hot-toast';
import useTaskStore from '../../stores/taskStore';
import Button from '../common/Button';

export default function TimeTracker({ task }) {
  const { startTimer, stopTimer, updateTimeEstimate, addTimeEntry } = useTaskStore();
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showAddTime, setShowAddTime] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  const [estimateMinutes, setEstimateMinutes] = useState('');

  const timeTracking = task?.timeTracking || {
    estimatedMinutes: 0,
    totalMinutes: 0,
    sessions: [],
    isTimerRunning: false,
    timerStartedAt: null,
  };

  const isRunning = timeTracking.isTimerRunning;
  const timerStartedAt = timeTracking.timerStartedAt;

  // Update elapsed time every second when timer is running
  useEffect(() => {
    let interval;
    if (isRunning && timerStartedAt) {
      interval = setInterval(() => {
        const start = new Date(timerStartedAt);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        setElapsedTime(diff);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isRunning, timerStartedAt]);

  // Initialize estimate fields
  useEffect(() => {
    if (timeTracking.estimatedMinutes) {
      setEstimateHours(Math.floor(timeTracking.estimatedMinutes / 60).toString());
      setEstimateMinutes((timeTracking.estimatedMinutes % 60).toString());
    }
  }, [timeTracking.estimatedMinutes]);

  const formatTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatElapsed = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = async () => {
    setIsLoading(true);
    const result = await startTimer(task._id);
    setIsLoading(false);
    if (result.success) {
      toast.success('Timer started');
    } else {
      toast.error(result.error);
    }
  };

  const handleStopTimer = async () => {
    setIsLoading(true);
    const result = await stopTimer(task._id);
    setIsLoading(false);
    if (result.success) {
      toast.success(`Logged ${result.session.duration} minutes`);
    } else {
      toast.error(result.error);
    }
  };

  const handleAddManualTime = async () => {
    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 0) {
      toast.error('Please enter a valid time');
      return;
    }

    setIsLoading(true);
    const result = await addTimeEntry(task._id, totalMinutes);
    setIsLoading(false);

    if (result.success) {
      toast.success(`Added ${formatTime(totalMinutes)}`);
      setManualHours('');
      setManualMinutes('');
      setShowAddTime(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleUpdateEstimate = async () => {
    const hours = parseInt(estimateHours) || 0;
    const minutes = parseInt(estimateMinutes) || 0;
    const totalMinutes = hours * 60 + minutes;

    setIsLoading(true);
    const result = await updateTimeEstimate(task._id, totalMinutes);
    setIsLoading(false);

    if (result.success) {
      toast.success('Estimate updated');
    } else {
      toast.error(result.error);
    }
  };

  const progress = timeTracking.estimatedMinutes > 0
    ? Math.min((timeTracking.totalMinutes / timeTracking.estimatedMinutes) * 100, 100)
    : 0;

  const isOverEstimate = timeTracking.totalMinutes > timeTracking.estimatedMinutes && timeTracking.estimatedMinutes > 0;

  if (!task?._id) {
    return null;
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Time Tracking
        </span>
      </label>

      {/* Timer Controls */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <button
          onClick={isRunning ? handleStopTimer : handleStartTimer}
          disabled={isLoading}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isRunning
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-primary-500 hover:bg-primary-600 text-white'
          }`}
        >
          {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="flex-1">
          {isRunning ? (
            <div>
              <div className="text-2xl font-mono font-bold text-gray-900 dark:text-dark-text">
                {formatElapsed(elapsedTime)}
              </div>
              <div className="text-sm text-gray-500 dark:text-dark-muted">
                Timer running...
              </div>
            </div>
          ) : (
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                {formatTime(timeTracking.totalMinutes)} logged
              </div>
              <div className="text-sm text-gray-500 dark:text-dark-muted">
                {timeTracking.sessions?.length || 0} session(s)
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAddTime(!showAddTime)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Add manual time"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Add Manual Time */}
      {showAddTime && (
        <div className="p-4 border border-gray-200 dark:border-dark-border rounded-lg space-y-3">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Add Manual Time
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={manualHours}
              onChange={(e) => setManualHours(e.target.value)}
              placeholder="0"
              className="w-20 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
            />
            <span className="text-gray-500 dark:text-dark-muted">h</span>
            <input
              type="number"
              min="0"
              max="59"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              placeholder="0"
              className="w-20 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
            />
            <span className="text-gray-500 dark:text-dark-muted">m</span>
            <Button size="sm" onClick={handleAddManualTime} disabled={isLoading}>
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Time Estimate */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Estimated Time
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={estimateHours}
            onChange={(e) => setEstimateHours(e.target.value)}
            placeholder="0"
            className="w-20 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
          />
          <span className="text-gray-500 dark:text-dark-muted">h</span>
          <input
            type="number"
            min="0"
            max="59"
            value={estimateMinutes}
            onChange={(e) => setEstimateMinutes(e.target.value)}
            placeholder="0"
            className="w-20 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
          />
          <span className="text-gray-500 dark:text-dark-muted">m</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUpdateEstimate}
            disabled={isLoading}
          >
            Set
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {timeTracking.estimatedMinutes > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-dark-muted">Progress</span>
            <span className={isOverEstimate ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}>
              {formatTime(timeTracking.totalMinutes)} / {formatTime(timeTracking.estimatedMinutes)}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isOverEstimate ? 'bg-red-500' : 'bg-primary-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {isOverEstimate && (
            <div className="text-xs text-red-600">
              Over estimate by {formatTime(timeTracking.totalMinutes - timeTracking.estimatedMinutes)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
