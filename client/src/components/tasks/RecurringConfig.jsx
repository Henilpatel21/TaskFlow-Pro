import { useState, useEffect } from 'react';
import { Repeat, Calendar } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom Days' },
];

export default function RecurringConfig({ recurring, onChange }) {
  const [isRecurring, setIsRecurring] = useState(recurring?.isRecurring || false);
  const [frequency, setFrequency] = useState(recurring?.frequency || 'weekly');
  const [interval, setInterval] = useState(recurring?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState(recurring?.daysOfWeek || []);
  const [endDate, setEndDate] = useState(
    recurring?.endDate ? new Date(recurring.endDate).toISOString().split('T')[0] : ''
  );

  useEffect(() => {
    if (recurring) {
      setIsRecurring(recurring.isRecurring || false);
      setFrequency(recurring.frequency || 'weekly');
      setInterval(recurring.interval || 1);
      setDaysOfWeek(recurring.daysOfWeek || []);
      setEndDate(recurring.endDate ? new Date(recurring.endDate).toISOString().split('T')[0] : '');
    }
  }, [recurring]);

  const handleToggle = () => {
    const newValue = !isRecurring;
    setIsRecurring(newValue);

    if (newValue) {
      onChange({
        isRecurring: true,
        frequency,
        interval,
        daysOfWeek: frequency === 'custom' ? daysOfWeek : [],
        endDate: endDate || null,
      });
    } else {
      onChange({
        isRecurring: false,
        frequency: null,
        interval: 1,
        daysOfWeek: [],
        endDate: null,
      });
    }
  };

  const handleFrequencyChange = (newFrequency) => {
    setFrequency(newFrequency);
    onChange({
      isRecurring: true,
      frequency: newFrequency,
      interval,
      daysOfWeek: newFrequency === 'custom' ? daysOfWeek : [],
      endDate: endDate || null,
    });
  };

  const handleIntervalChange = (newInterval) => {
    const val = Math.max(1, parseInt(newInterval) || 1);
    setInterval(val);
    onChange({
      isRecurring: true,
      frequency,
      interval: val,
      daysOfWeek: frequency === 'custom' ? daysOfWeek : [],
      endDate: endDate || null,
    });
  };

  const handleDayToggle = (day) => {
    const newDays = daysOfWeek.includes(day)
      ? daysOfWeek.filter(d => d !== day)
      : [...daysOfWeek, day].sort((a, b) => a - b);

    setDaysOfWeek(newDays);
    onChange({
      isRecurring: true,
      frequency,
      interval,
      daysOfWeek: newDays,
      endDate: endDate || null,
    });
  };

  const handleEndDateChange = (newEndDate) => {
    setEndDate(newEndDate);
    onChange({
      isRecurring: true,
      frequency,
      interval,
      daysOfWeek: frequency === 'custom' ? daysOfWeek : [],
      endDate: newEndDate || null,
    });
  };

  const getIntervalLabel = () => {
    switch (frequency) {
      case 'daily':
        return interval === 1 ? 'day' : 'days';
      case 'weekly':
        return interval === 1 ? 'week' : 'weeks';
      case 'monthly':
        return interval === 1 ? 'month' : 'months';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        <span className="flex items-center gap-2">
          <Repeat className="w-4 h-4" />
          Recurring Task
        </span>
      </label>

      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isRecurring ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isRecurring ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {isRecurring ? 'Repeating' : 'Does not repeat'}
        </span>
      </div>

      {isRecurring && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Repeat Frequency
            </label>
            <div className="flex flex-wrap gap-2">
              {FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleFrequencyChange(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    frequency === option.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interval (for daily, weekly, monthly) */}
          {['daily', 'weekly', 'monthly'].includes(frequency) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repeat every
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={interval}
                  onChange={(e) => handleIntervalChange(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {getIntervalLabel()}
                </span>
              </div>
            </div>
          )}

          {/* Days of week (for custom) */}
          {frequency === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repeat on
              </label>
              <div className="flex gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`w-10 h-10 text-sm rounded-full border transition-colors ${
                      daysOfWeek.includes(day.value)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-500'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {daysOfWeek.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Select at least one day</p>
              )}
            </div>
          )}

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                End Date (optional)
              </span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-dark-text"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty to repeat indefinitely
            </p>
          </div>

          {/* Preview */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Preview:</span>{' '}
              {frequency === 'custom' ? (
                daysOfWeek.length > 0 ? (
                  `Repeats every ${DAYS_OF_WEEK.filter(d => daysOfWeek.includes(d.value)).map(d => d.label).join(', ')}`
                ) : (
                  'Select days to repeat on'
                )
              ) : frequency === 'biweekly' ? (
                'Repeats every 2 weeks'
              ) : (
                `Repeats every ${interval > 1 ? `${interval} ` : ''}${getIntervalLabel()}`
              )}
              {endDate && ` until ${new Date(endDate).toLocaleDateString()}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
