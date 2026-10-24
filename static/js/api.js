/**
 * Deadline Heavyweight - Backend API Client
 * Features request timeout, active request cancellation, and modular AI hook negotiation.
 */
let currentAbortController = null;

const API = {
  async checkHealth() {
    try {
      const res = await fetch('/api/health');
      return await res.json();
    } catch (err) {
      console.error('Health check failed:', err);
      return { status: 'offline' };
    }
  },

  async parseText(rawText, useLLM = false) {
    if (currentAbortController) {
      currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    try {
      // Primary: POST /api/analyze-deadline with fallback to /api/parse
      const res = await fetch('/api/analyze-deadline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_text: rawText,
          use_llm: useLLM,
        }),
        signal: currentAbortController.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let message = `Máy chủ phản hồi mã lỗi ${res.status}`;
        if (typeof errorData.detail === 'string') {
          message = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          message = errorData.detail.map(e => e.msg || e.message || JSON.stringify(e)).join('; ');
        } else if (errorData.detail) {
          message = JSON.stringify(errorData.detail);
        }
        throw new Error(message);
      }

      const data = await res.json();
      const tasks = data.tasks || [];
      const totalDuration = tasks.reduce((acc, t) => acc + (t.estimated_duration || t.duration_hours || 2.0), 0);
      const avgWeight = tasks.length > 0
        ? Math.round(tasks.reduce((acc, t) => acc + (t.weight_score || t.stress_score || 50), 0) / tasks.length)
        : (data.stress_index || 50);
      const maxUrgency = tasks.length > 0
        ? Math.max(...tasks.map(t => t.urgency_score || 5.0))
        : 5.0;
      const criticalCount = tasks.filter(t => (t.weight_score || t.stress_score || 0) >= 71 || t.urgency === 'critical').length;
      const overallState = avgWeight > 70 ? 'critical' : avgWeight > 35 ? 'elevated' : 'calm';

      return {
        success: data.success,
        batch_id: data.batch_id,
        tasks: tasks,
        summary: {
          total_tasks: data.task_count || tasks.length,
          total_duration_hours: Math.round(totalDuration * 10) / 10,
          average_weight: avgWeight,
          max_urgency: maxUrgency,
          critical_count: criticalCount,
          overall_stress_state: overallState
        }
      };
    } finally {
      currentAbortController = null;
    }
  },

  async getLatestBatch() {
    try {
      const res = await fetch('/api/latest');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch latest batch:', err);
      return null;
    }
  },
};

window.API = API;
