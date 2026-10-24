/**
 * Deadline Heavyweight - Split-Pane UI Controller
 * Robust Concurrency Handling, XSS Sanitization, and Error Boundaries.
 */

// Preset samples for rapid testing
const SAMPLES = {
  overload: `[P0 KHẨN] Hotfix lỗi memory leak sập server production trước 15h chiều nay (mất tầm 3 tiếng)
- Refactor toàn bộ kiến trúc Authentication & Token session (2 ngày)
- Nộp báo cáo tài chính Q4 cho ban giám đốc tối mai (4h)
- Khẩn: Sửa lỗi thanh toán Momo/VNPay đang bị treo đơn ASAP (2h)
- Review code PR của 3 tech lead khác (1.5h)
- Gửi email xác nhận kế hoạch bảo trì cuối tuần (30 phút)`,

  balanced: `- Viết tài liệu API endpoint cho đối tác (2h)
- Cập nhật banner landing page sang giao diện mới (3h)
- Họp đồng bộ tiến độ tuần với team frontend (1h)
- Test hồi quy luồng đăng ký tài khoản mới (2.5h)
- Nghiên cứu giải pháp cache Redis (4h) hạn chót cuối tuần`,

  chill: `- Đọc tài liệu cập nhật phiên bản Three.js & Rapier (1.5h)
- Gửi email tổng kết sprint tuần trước (30 phút)
- Tối ưu nhẹ nhàng CSS animation giao diện (1h)`
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const UI = {
  elements: {},
  currentTasks: [],
  currentSummary: null,
  isProcessing: false,

  init() {
    this.elements = {
      rawInput: document.getElementById('raw-input'),
      weighBtn: document.getElementById('weigh-btn'),
      clearBtn: document.getElementById('clear-btn'),
      btnSampleOverload: document.getElementById('sample-overload'),
      btnSampleBalanced: document.getElementById('sample-balanced'),
      btnSampleChill: document.getElementById('sample-chill'),
      tasksContainer: document.getElementById('tasks-container'),
      taskCountBadge: document.getElementById('task-count-badge'),
      totalHoursVal: document.getElementById('total-hours-val'),
      avgWeightVal: document.getElementById('avg-weight-val'),
      weightProgressBar: document.getElementById('weight-progress-bar'),
      peakUrgencyVal: document.getElementById('peak-urgency-val'),
      stressStateBadge: document.getElementById('stress-state-badge'),
      stressWarningBox: document.getElementById('stress-warning-box'),
      loadingSpinner: document.getElementById('loading-spinner'),
      btnDropPhysics: document.getElementById('btn-drop-physics'),
      btnResetView: document.getElementById('btn-reset-view'),
      llmToggle: document.getElementById('llm-toggle'),
      btnAudioToggle: document.getElementById('btn-audio-toggle'),
      audioStatusText: document.getElementById('audio-status-text')
    };

    this.bindEvents();
    this.loadInitialData();
  },

  bindEvents() {
    // Weigh button
    if (this.elements.weighBtn) {
      this.elements.weighBtn.addEventListener('click', () => this.handleWeigh());
    }

    // Clear button
    if (this.elements.clearBtn) {
      this.elements.clearBtn.addEventListener('click', () => {
        if (this.isProcessing) return;
        this.elements.rawInput.value = '';
        this.elements.rawInput.focus();
      });
    }

    // Audio toggle button
    if (this.elements.btnAudioToggle) {
      this.elements.btnAudioToggle.addEventListener('click', () => {
        if (window.sceneCoordinator && window.sceneCoordinator.audio) {
          const isEnabled = window.sceneCoordinator.audio.toggle();
          if (this.elements.audioStatusText) {
            this.elements.audioStatusText.textContent = isEnabled ? 'Audio: ON' : 'Audio: OFF';
          }
        }
      });
    }

    // Sample loaders with concurrency lock
    if (this.elements.btnSampleOverload) {
      this.elements.btnSampleOverload.addEventListener('click', () => {
        if (this.isProcessing) return;
        this.elements.rawInput.value = SAMPLES.overload;
        this.handleWeigh();
      });
    }
    if (this.elements.btnSampleBalanced) {
      this.elements.btnSampleBalanced.addEventListener('click', () => {
        if (this.isProcessing) return;
        this.elements.rawInput.value = SAMPLES.balanced;
        this.handleWeigh();
      });
    }
    if (this.elements.btnSampleChill) {
      this.elements.btnSampleChill.addEventListener('click', () => {
        if (this.isProcessing) return;
        this.elements.rawInput.value = SAMPLES.chill;
        this.handleWeigh();
      });
    }

    // Drop / Replay button
    if (this.elements.btnDropPhysics) {
      this.elements.btnDropPhysics.addEventListener('click', () => {
        if (this.isProcessing) return;
        if (this.currentTasks.length > 0) {
          window.dispatchEvent(new CustomEvent('deadline:trigger-drop', {
            detail: { tasks: this.currentTasks, summary: this.currentSummary }
          }));
        } else {
          this.handleWeigh();
        }
      });
    }

    // Reset View button
    if (this.elements.btnResetView) {
      this.elements.btnResetView.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('deadline:reset-view'));
      });
    }
  },

  async loadInitialData() {
    try {
      const latest = await API.getLatestBatch();
      if (latest && latest.has_data && latest.tasks && latest.tasks.length > 0) {
        this.elements.rawInput.value = latest.raw_text || '';
        this.currentTasks = latest.tasks;
        this.currentSummary = latest.summary;
        this.renderSummary(latest.summary);
        this.renderTasks(latest.tasks);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('deadline:tasks-loaded', {
            detail: { tasks: latest.tasks, summary: latest.summary }
          }));
        }, 600);
      } else {
        this.elements.rawInput.value = SAMPLES.overload;
        this.handleWeigh();
      }
    } catch (err) {
      console.warn('Initial data load fallback:', err);
      this.elements.rawInput.value = SAMPLES.overload;
      this.handleWeigh();
    }
  },

  async handleWeigh() {
    if (this.isProcessing) return;
    const rawText = this.elements.rawInput.value.trim();
    if (!rawText) {
      alert('Vui lòng nhập danh sách công việc hoặc chọn mẫu thử nghiệm.');
      return;
    }

    this.setLoading(true);

    try {
      const useLLM = this.elements.llmToggle ? this.elements.llmToggle.checked : false;
      const res = await API.parseText(rawText, useLLM);

      if (!res || !res.tasks || res.tasks.length === 0) {
        throw new Error('Không trích xuất được công việc hợp lệ nào.');
      }

      this.currentTasks = res.tasks;
      this.currentSummary = res.summary;

      this.renderSummary(res.summary);
      this.renderTasks(res.tasks);

      // Trigger 3D physics spawn
      window.dispatchEvent(new CustomEvent('deadline:tasks-loaded', {
        detail: { tasks: res.tasks, summary: res.summary }
      }));
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled due to newer submission.');
        return;
      }
      alert(`Lỗi phân tích: ${err.message}`);
    } finally {
      this.setLoading(false);
    }
  },

  setLoading(isLoading) {
    this.isProcessing = isLoading;
    if (this.elements.loadingSpinner) {
      this.elements.loadingSpinner.classList.toggle('hidden', !isLoading);
    }
    
    const buttons = [
      this.elements.weighBtn,
      this.elements.btnSampleOverload,
      this.elements.btnSampleBalanced,
      this.elements.btnSampleChill,
      this.elements.clearBtn,
      this.elements.btnDropPhysics
    ];

    buttons.forEach(btn => {
      if (btn) {
        btn.disabled = isLoading;
        btn.classList.toggle('opacity-50', isLoading);
        btn.classList.toggle('cursor-not-allowed', isLoading);
      }
    });
  },

  renderSummary(summary) {
    if (!summary) return;

    if (this.elements.taskCountBadge) this.elements.taskCountBadge.textContent = `${summary.total_tasks || 0} TASKS`;
    if (this.elements.totalHoursVal) this.elements.totalHoursVal.textContent = `${Math.round((summary.total_duration_hours || 0) * 10) / 10}h`;
    if (this.elements.avgWeightVal) this.elements.avgWeightVal.textContent = `${Math.round(summary.average_weight || 0)}`;
    if (this.elements.peakUrgencyVal) this.elements.peakUrgencyVal.textContent = `${summary.max_urgency || 8} / 10`;

    // Progress bar
    const weight = Math.min(100, Math.max(0, summary.average_weight || 0));
    if (this.elements.weightProgressBar) {
      this.elements.weightProgressBar.style.width = `${weight}%`;
    }
    
    if (summary.overall_stress_state === 'critical' || weight >= 71) {
      if (this.elements.weightProgressBar) this.elements.weightProgressBar.className = 'h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500';
      if (this.elements.stressStateBadge) {
        this.elements.stressStateBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-red-950 text-red-400 border border-red-700 animate-stress-pulse';
        this.elements.stressStateBadge.textContent = 'CRITICAL OVERLOAD';
      }
      if (this.elements.stressWarningBox) {
        this.elements.stressWarningBox.classList.remove('hidden');
        this.elements.stressWarningBox.innerHTML = `
          <div class="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider mb-1">
            <svg class="w-4 h-4 text-red-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            Cảnh Báo Áp Lực Đè Nặng
          </div>
          <p class="text-xs text-red-300/80 leading-relaxed">
            Tổng tải trọng công việc vượt ngưỡng an toàn. Khối vật lý Obsidian lõi Magma sẽ có mật độ và gia tốc rơi cực đại, gây chấn động mạnh khi chạm bệ đỡ!
          </p>
        `;
      }
    } else if (summary.overall_stress_state === 'elevated' || weight >= 36) {
      if (this.elements.weightProgressBar) this.elements.weightProgressBar.className = 'h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-500';
      if (this.elements.stressStateBadge) {
        this.elements.stressStateBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-950 text-amber-400 border border-amber-700';
        this.elements.stressStateBadge.textContent = 'ELEVATED STRESS';
      }
      if (this.elements.stressWarningBox) {
        this.elements.stressWarningBox.classList.remove('hidden');
        this.elements.stressWarningBox.innerHTML = `
          <div class="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Mức Độ Căng Thẳng Vừa Phải
          </div>
          <p class="text-xs text-amber-300/80 leading-relaxed">
            Công việc đang tăng dần tỷ lệ áp lực. Chất liệu mô phỏng sẽ chuyển sang kim loại rỉ sét (Rusted Iron) và va đập rõ rệt.
          </p>
        `;
      }
    } else {
      if (this.elements.weightProgressBar) this.elements.weightProgressBar.className = 'h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500';
      if (this.elements.stressStateBadge) {
        this.elements.stressStateBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-cyan-950 text-cyan-400 border border-cyan-800';
        this.elements.stressStateBadge.textContent = 'CALM & CONTROLLED';
      }
      if (this.elements.stressWarningBox) this.elements.stressWarningBox.classList.add('hidden');
    }
  },

  renderTasks(tasks) {
    if (!this.elements.tasksContainer) return;
    if (!tasks || tasks.length === 0) {
      this.elements.tasksContainer.innerHTML = `
        <div class="py-12 text-center text-slate-500 text-sm">
          Chưa có công việc nào. Dán danh sách và bấm "Cân Tải Trọng".
        </div>
      `;
      return;
    }

    const html = tasks.map((t, idx) => {
      let badgeClass = 'bg-cyan-950 text-cyan-400 border-cyan-800';
      let borderGlow = 'border-slate-800 hover:border-cyan-700';
      let materialText = 'Cool Granite Stone';
      
      const stress = t.weight_score || t.stress_score || 50;
      if (t.stress_level === 'critical' || stress >= 71) {
        badgeClass = 'bg-red-950 text-red-400 border-red-700 animate-pulse';
        borderGlow = 'border-red-900/60 hover:border-red-500 glow-critical';
        materialText = 'Cracked Magma Core';
      } else if (t.stress_level === 'elevated' || stress >= 36) {
        badgeClass = 'bg-amber-950 text-amber-400 border-amber-700';
        borderGlow = 'border-amber-900/50 hover:border-amber-500 glow-elevated';
        materialText = 'Weathered Rusted Iron';
      }

      const safeTitle = escapeHTML(t.title);
      const safeDeadline = escapeHTML(t.deadline_str || 'Hôm nay');
      const duration = t.estimated_duration || t.duration_hours || t.hours_left || 2.0;

      return `
        <div class="group relative rounded-xl p-3.5 bg-[#0f172a]/90 border transition-all duration-300 ${borderGlow}">
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="flex items-center gap-2">
              <span class="flex items-center justify-center w-5 h-5 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                ${idx + 1}
              </span>
              <h4 class="font-semibold text-sm text-slate-100 group-hover:text-white line-clamp-2">
                ${safeTitle}
              </h4>
            </div>
            <span class="shrink-0 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${badgeClass}">
              W: ${stress}
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div class="flex flex-col">
              <span class="text-[10px] uppercase text-slate-400 font-mono">Hạn chót</span>
              <span class="text-slate-200 font-medium truncate" title="${safeDeadline}">${safeDeadline}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] uppercase text-slate-400 font-mono">Thời lượng</span>
              <span class="text-slate-200 font-mono font-semibold">${duration}h</span>
            </div>
            <div class="flex flex-col text-right">
              <span class="text-[10px] uppercase text-slate-400 font-mono">Vật liệu 3D</span>
              <span class="text-xs font-mono font-medium ${t.stress_level === 'critical' || stress >= 71 ? 'text-red-400 font-bold' : t.stress_level === 'elevated' || stress >= 36 ? 'text-amber-400' : 'text-cyan-400'}">
                ${materialText}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.elements.tasksContainer.innerHTML = html;
  }
};

window.UI = UI;
