(function () {
  'use strict';

  const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
  const IG_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\/.+/i;

  const PLATFORM_TASKS = {
    youtube: ['like', 'subscribe'],
    instagram: ['like', 'follow'],
  };

  const urlInput = document.getElementById('targetUrl');
  const platformDetect = document.getElementById('platform-detect');
  const taskOptions = document.getElementById('task-type-options');
  const rewardInput = document.getElementById('coinRewardPerTask');
  const budgetInput = document.getElementById('totalBudget');
  const budgetPreview = document.getElementById('budget-preview');
  const previewSlots = document.getElementById('preview-slots');
  const previewCost = document.getElementById('preview-cost');
  const previewBalance = document.getElementById('preview-balance');
  const userCoins = window.__userCoins || 0;

  function detectPlatform(url) {
    if (YT_REGEX.test(url)) return 'youtube';
    if (IG_REGEX.test(url)) return 'instagram';
    return null;
  }

  function renderTaskOptions(platform, selectedType) {
    const types = PLATFORM_TASKS[platform] || [];
    taskOptions.innerHTML = types.map(type => `
      <label class="task-type-option ${selectedType === type ? 'selected' : ''}">
        <input type="radio" name="taskType" value="${type}" ${selectedType === type ? 'checked' : ''} />
        ${type.charAt(0).toUpperCase() + type.slice(1)}
      </label>
    `).join('');

    taskOptions.querySelectorAll('.task-type-option').forEach(label => {
      label.addEventListener('click', () => {
        taskOptions.querySelectorAll('.task-type-option').forEach(l => l.classList.remove('selected'));
        label.classList.add('selected');
      });
    });

    if (types.length > 0 && !selectedType) {
      taskOptions.querySelector('input[type="radio"]').checked = true;
      taskOptions.querySelector('.task-type-option').classList.add('selected');
    }
  }

  function updatePreview() {
    const reward = parseInt(rewardInput.value, 10);
    const budget = parseInt(budgetInput.value, 10);

    if (isNaN(reward) || isNaN(budget) || reward < 1 || budget < 1) {
      budgetPreview.style.display = 'none';
      return;
    }

    const slots = Math.floor(budget / reward);
    const remaining = userCoins - budget;

    budgetPreview.style.display = 'block';
    previewSlots.textContent = slots + ' task' + (slots !== 1 ? 's' : '');
    previewCost.textContent = budget + ' coins';
    previewBalance.textContent = remaining + ' coins';
    previewBalance.style.color = remaining < 0 ? 'var(--color-error)' : 'var(--color-success)';
  }

  let currentPlatform = null;

  if (urlInput) {
    urlInput.addEventListener('input', () => {
      const val = urlInput.value.trim();
      const platform = detectPlatform(val);

      if (platform && platform !== currentPlatform) {
        currentPlatform = platform;
        platformDetect.textContent = 'Detected: ' + platform.charAt(0).toUpperCase() + platform.slice(1);
        platformDetect.style.color = 'var(--color-success)';
        renderTaskOptions(platform, null);
      } else if (!platform) {
        currentPlatform = null;
        platformDetect.textContent = val.length > 0 ? 'Enter a valid YouTube or Instagram URL' : '';
        platformDetect.style.color = 'var(--color-error)';
        renderTaskOptions('', null);
      }
    });
  }

  if (rewardInput) rewardInput.addEventListener('input', updatePreview);
  if (budgetInput) budgetInput.addEventListener('input', updatePreview);

  updatePreview();
})();
