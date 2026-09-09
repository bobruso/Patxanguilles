(() => {
  'use strict';

  const resultPanel = document.getElementById('resultPanel');
  const resultLabel = document.getElementById('resultLabel');
  const resultScoreButton = document.getElementById('resultScoreButton');
  const playButton = document.getElementById('playButton');
  const gameStage = document.getElementById('gameStage');
  if (!resultPanel || !resultLabel) return;

  let lastFeedbackKey = '';

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (_) {}
  }

  function updatePracticeNudge() {
    const visible = !resultPanel.hidden;
    const isPractice = visible && resultLabel.textContent.includes('PRÁCTICA');
    resultScoreButton?.classList.toggle('result-score-button-ready', isPractice && !resultScoreButton.hidden);
    playButton?.classList.toggle('score-ready-after-practice', isPractice && !playButton.hidden && !playButton.disabled);
  }

  const resultObserver = new MutationObserver(updatePracticeNudge);
  resultObserver.observe(resultPanel, { subtree:true, childList:true, attributes:true, characterData:true, attributeFilter:['hidden','class'] });

  const stageObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
      const el = mutation.target;
      const key = `${el.className}|${Date.now() >> 8}`;
      if (key === lastFeedbackKey) continue;
      if (el.classList?.contains('is-correct') || el.classList?.contains('is-match') || el.classList?.contains('success')) {
        lastFeedbackKey = key;
        vibrate(12);
      } else if (el.classList?.contains('is-wrong') || el.classList?.contains('fail')) {
        lastFeedbackKey = key;
        vibrate([18,28,18]);
      }
    }
  });
  if (gameStage) stageObserver.observe(gameStage, { subtree:true, attributes:true, attributeFilter:['class'] });

  document.addEventListener('pointerdown', event => {
    if (event.target.closest('.action-button,.small-action,.answer-option,.color-option,.memory-cell,.sequence-pad,.hl-actions button')) {
      vibrate(6);
    }
  }, { passive:true });

  updatePracticeNudge();
})();
