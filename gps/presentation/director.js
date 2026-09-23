/*
  Scene director: owns scene order, transitions and the guarantees that matter for
  QA (no fade for the last scene, no leaked frames, no final value flashed before its
  animation).
*/
import { SceneContext, animate, fitStage, layer, reducedMotion, stage, stageSize } from './core.js';
import { runClassicIntro, runComparison, runHeartRate, runOutro, runSprintSpeed } from './scenes.js';
import { hasHrData, isSantaAnaF7Pitch } from './data.js';
import { runSantaAnaIntro } from './satellite.js';

/* Transition after each scene: scene index -> transition into the next scene. */
const TRANSITIONS = ['pushIn', 'wipe', 'focus', 'wipe', 'bloom'];

function ensureWipe() {
  let wipe = stage.querySelector('.patx-transition-wipe');
  if (!wipe) {
    wipe = document.createElement('div');
    wipe.className = 'patx-transition-wipe';
    wipe.setAttribute('aria-hidden', 'true');
    stage.appendChild(wipe);
  }
  return wipe;
}

export class PresentationDirector {
  constructor({ data, layout }) {
    this.data = data;
    this.layout = layout;
    this.sceneCtx = null;
    /* Chrome/transition animations outlive individual scenes by design. */
    this.pageCtx = new SceneContext();
    this.pendingReveal = null;
  }

  get api() {
    return { data: this.data, layout: this.layout };
  }

  buildSceneList() {
    const scenes = [];
    if (isSantaAnaF7Pitch(this.data?.pitch, this.data?.match)) {
      scenes.push({ run: runSantaAnaIntro });
    } else {
      scenes.push({ run: runClassicIntro });
    }
    /* The heart scene runs whenever the analysis carries any HR signal; a missing
       stored series is shown as an empty state instead of being invented. */
    if (hasHrData(this.data?.analysis)) scenes.push({ run: runHeartRate });
    scenes.push({ run: runSprintSpeed });
    scenes.push({ run: runComparison });
    scenes.push({ run: runOutro });
    return scenes;
  }

  renderScene() {
    layer.innerHTML = '';
    layer.dataset.sceneKey = String(++this.sceneIndex);
    stage.classList.remove('patx-satellite-active');
    fitStage();
  }

  async transitionOut(ctx, kind) {
    const el = layer.querySelector('.patx-present-scene');
    if (!el || reducedMotion) return null;
    const size = stageSize(this.layout);
    if (kind === 'wipe') {
      const wipe = ensureWipe();
      await animate(this.pageCtx, wipe, [
        { transform: `translate3d(${-size.w}px,0,0)` },
        { transform: 'translate3d(0,0,0)' },
      ], { duration: 520, easing: 'cubic-bezier(.72,0,.24,1)' });
      return () => {
        animate(this.pageCtx, wipe, [
          { transform: 'translate3d(0,0,0)' },
          { transform: `translate3d(${size.w}px,0,0)` },
        ], { duration: 620, easing: 'cubic-bezier(.72,0,.24,1)' }).then(() => wipe.remove());
      };
    }
    if (kind === 'focus') {
      await animate(ctx, el, [
        { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
        { opacity: 0, transform: 'scale(.88)', filter: 'blur(10px)' },
      ], { duration: 700, easing: 'cubic-bezier(.5,0,.75,0)' });
      return null;
    }
    if (kind === 'bloom') {
      await animate(ctx, el, [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(1.04)' },
      ], { duration: 760, easing: 'cubic-bezier(.4,0,.7,0)' });
      return null;
    }
    /* pushIn: the outgoing scene recedes into depth while the next one rises. */
    await animate(ctx, el, [
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
      { opacity: 0, transform: 'scale(1.09)', filter: 'blur(12px)' },
    ], { duration: 760, easing: 'cubic-bezier(.4,0,.7,0)' });
    return null;
  }

  async play(token, runId) {
    const scenes = this.buildSceneList();
    this.sceneIndex = 0;
    for (let i = 0; i < scenes.length; i++) {
      if (token !== runId()) return;
      const scene = scenes[i];

      if (this.pendingReveal) {
        const reveal = this.pendingReveal;
        this.pendingReveal = null;
        reveal();
      }
      this.sceneCtx?.dispose();

      const ctx = new SceneContext();
      this.sceneCtx = ctx;
      this.renderScene();

      const api = { ...this.api };
      let result = {};
      try {
        result = (await scene.run(ctx, api)) || {};
      } catch (err) {
        console.warn('[GPS presentation] escena', err);
        /* The satellite intro can fail (Leaflet CDN, imagery, calibration). Fall back
           to the editorial intro instead of skipping the whole presentation. */
        if (scene.run === runSantaAnaIntro) {
          ctx.dispose();
          const retry = new SceneContext();
          this.sceneCtx = retry;
          this.renderScene();
          try {
            result = (await runClassicIntro(retry, { ...this.api })) || {};
          } catch (fallbackErr) {
            console.warn('[GPS presentation] intro clásica', fallbackErr);
            result = {};
          }
        }
      }
      if (token !== runId()) return;

      const isLast = i === scenes.length - 1;
      if (isLast) break;

      this.pendingReveal = await this.transitionOut(ctx, TRANSITIONS[i] || 'pushIn');
      if (token !== runId()) return;
    }
  }

  dispose() {
    this.pendingReveal = null;
    this.sceneCtx?.dispose();
    this.sceneCtx = null;
    this.pageCtx.dispose();
    layer.innerHTML = '';
  }
}
