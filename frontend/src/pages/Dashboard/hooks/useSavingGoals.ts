import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../../lib/api';

export interface SavingGoal {
  id: number;
  goal_name: string;
  target_amount: number;
  priority: number;
  created_at: string;
}

export interface SavingGoalsData {
  goals: SavingGoal[];
  totalTarget: number;
}

export const useSavingGoals = () => {
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [totalTarget, setTotalTarget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiFetch('/api/saving-goals');
      
      if (!res.ok) {
        throw new Error('Không thể tải danh sách mục tiêu');
      }
      
      const data: SavingGoalsData = await res.json();
      
      setGoals(data.goals || []);
      setTotalTarget(data.totalTarget || 0);
    } catch (err) {
      console.error('Error fetching saving goals:', err);
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setGoals([]);
      setTotalTarget(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGoals();
  }, [fetchGoals]);

  return {
    goals,
    totalTarget,
    loading,
    error,
    refetch: fetchGoals,
  };
};
