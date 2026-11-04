/** Minimal DOM / canvas / audio stub so the real modules can load in Node. */

function audioParam() {
  return {
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
    setTargetAtTime() {},
  };
}

function audioNode() {
  return {
    gain: audioParam(),
    frequency: audioParam(),
    Q: audioParam(),
    type: '',
    buffer: null,
    connect() {
      return audioNode();
    },
    disconnect() {},
    start() {},
    stop() {},
  };
}

const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => ({ addColorStop() {} });
      }
      if (prop === 'canvas') return { width: 0, height: 0 };
      return () => {};
    },
    set() {
      return true;
    },
  },
);

function el() {
  const node = {
    style: {},
    dataset: {},
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    width: 200,
    height: 32,
    children: [],
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false;
      },
    },
    setAttribute() {},
    removeAttribute() {},
    getAttribute() {
      return null;
    },
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) {
      node.children.push(child);
    },
    removeChild() {},
    remove() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getBoundingClientRect() {
      return { width: 200, height: 32, top: 0, left: 0, right: 200, bottom: 32 };
    },
    focus() {},
    blur() {},
    contains() {
      return false;
    },
    closest() {
      return null;
    },
    getContext() {
      return ctx2d;
    },
  };
  return node;
}

const store = new Map();

export function installBrowserStub() {
  const documentStub = {
    getElementById() {
      return el();
    },
    querySelector() {
      return el();
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return el();
    },
    addEventListener() {},
    removeEventListener() {},
    body: el(),
    documentElement: Object.assign(el(), {
      requestFullscreen() {
        return Promise.resolve();
      },
    }),
    fullscreenElement: null,
    hidden: false,
    readyState: 'complete',
    activeElement: null,
    exitFullscreen() {
      return Promise.resolve();
    },
  };

  globalThis.document = documentStub;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.window = globalThis;
  globalThis.matchMedia = () => ({
    matches: false,
    media: '',
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  globalThis.localStorage = {
    getItem(k) {
      return store.has(String(k)) ? store.get(String(k)) : null;
    },
    setItem(k, v) {
      store.set(String(k), String(v));
    },
    removeItem(k) {
      store.delete(String(k));
    },
    clear() {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      vibrate() {
        return true;
      },
      getGamepads() {
        return [];
      },
      userAgent: 'node-test',
      language: 'en',
    },
  });
  if (!globalThis.performance) globalThis.performance = { now() { return 0; } };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = () => {};
  globalThis.devicePixelRatio = 1;
  globalThis.Element = globalThis.Element || class Element {};

  class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.destination = {};
      this.state = 'running';
    }
    createOscillator() {
      return audioNode();
    }
    createGain() {
      return audioNode();
    }
    createBiquadFilter() {
      return audioNode();
    }
    createConvolver() {
      return audioNode();
    }
    createBuffer(_channels, length) {
      return { getChannelData() { return new Float32Array(length); } };
    }
    resume() {
      return Promise.resolve();
    }
  }
  globalThis.AudioContext = FakeAudioContext;
  globalThis.webkitAudioContext = FakeAudioContext;
}
