const globals = new Set([
  // JavaScript Built-in Objects
  'console', 'Math', 'JSON', 'Date', 'RegExp', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Function', 'Symbol', 'Error',
  'Promise', 'Set', 'Map', 'WeakSet', 'WeakMap', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'eval', 'undefined', 'Infinity', 'NaN',
  
  // Error Types
  'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'EvalError', 'URIError', 'AggregateError',
  
  // TypedArrays
  'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray',
  'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
  
  // Advanced JavaScript Features
  'Proxy', 'Reflect', 'Generator', 'GeneratorFunction', 'AsyncFunction', 'AsyncGenerator', 'AsyncGeneratorFunction',
  'WeakRef', 'FinalizationRegistry', 'BigInt', 'Atomics', 'SharedArrayBuffer',
  
  // Intl (Internationalization)
  'Intl', 'Collator', 'DateTimeFormat', 'NumberFormat', 'PluralRules', 'RelativeTimeFormat', 'ListFormat',
  'Locale', 'DisplayNames', 'Segmenter',
  
  // Node.js Globals
  'process', 'require', 'module', 'exports', '__filename', '__dirname', 'global', 'Buffer',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'setImmediate', 'clearImmediate',
  '__dirname', '__filename', 'require', 'exports', 'module', 'global', 'process', 'Buffer',
  'setImmediate', 'clearImmediate', 'queueMicrotask',
  
  // Browser Window Object
  'window', 'self', 'frames', 'parent', 'top', 'opener', 'closed', 'length', 'name', 'status',
  'defaultStatus', 'innerHeight', 'innerWidth', 'outerHeight', 'outerWidth', 'pageXOffset', 'pageYOffset',
  'screenX', 'screenY', 'screenLeft', 'screenTop', 'scrollX', 'scrollY', 'devicePixelRatio',
  
  // Browser Document Object
  'document', 'navigator', 'location', 'history', 'screen', 'performance', 'crypto',
  
  // Storage APIs
  'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'cookieStore',
  
  // Network APIs
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Request', 'Response', 'Headers', 'AbortController', 'AbortSignal',
  
  // Media APIs
  'Image', 'Audio', 'Video', 'MediaRecorder', 'MediaStream', 'MediaStreamTrack', 'ImageCapture',
  'AudioContext', 'OfflineAudioContext', 'MediaDevices', 'MediaSource', 'MediaStreamAudioSourceNode',
  
  // Canvas and Graphics
  'CanvasRenderingContext2D', 'CanvasGradient', 'CanvasPattern', 'ImageData', 'TextMetrics',
  'Path2D', 'ImageBitmap', 'OffscreenCanvas', 'OffscreenCanvasRenderingContext2D',
  
  // WebGL
  'WebGLRenderingContext', 'WebGL2RenderingContext', 'WebGLBuffer', 'WebGLFramebuffer',
  'WebGLProgram', 'WebGLRenderbuffer', 'WebGLShader', 'WebGLTexture', 'WebGLUniformLocation',
  
  // Service Workers & Web Workers
  'ServiceWorker', 'ServiceWorkerRegistration', 'Worker', 'SharedWorker', 'MessageChannel', 'MessagePort',
  'BroadcastChannel', 'importScripts', 'postMessage', 'onmessage', 'onerror',
  
  // File APIs
  'File', 'FileList', 'FileReader', 'Blob', 'FormData', 'URLSearchParams', 'URL',
  
  // Events
  'Event', 'CustomEvent', 'EventTarget', 'addEventListener', 'removeEventListener', 'dispatchEvent',
  'MouseEvent', 'KeyboardEvent', 'TouchEvent', 'WheelEvent', 'FocusEvent', 'InputEvent',
  'PointerEvent', 'DragEvent', 'ClipboardEvent', 'BeforeUnloadEvent', 'HashChangeEvent',
  'PopStateEvent', 'StorageEvent', 'MessageEvent', 'ErrorEvent', 'ProgressEvent',
  
  // DOM APIs
  'Node', 'Element', 'Document', 'DocumentFragment', 'Text', 'Comment', 'ProcessingInstruction',
  'DocumentType', 'NodeList', 'HTMLCollection', 'DOMTokenList', 'NamedNodeMap', 'Attr',
  'Range', 'Selection', 'TreeWalker', 'NodeIterator', 'MutationObserver', 'MutationRecord',
  'IntersectionObserver', 'IntersectionObserverEntry', 'ResizeObserver', 'ResizeObserverEntry',
  
  // HTML Elements
  'HTMLElement', 'HTMLAnchorElement', 'HTMLButtonElement', 'HTMLCanvasElement', 'HTMLDivElement',
  'HTMLFormElement', 'HTMLImageElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement',
  'HTMLVideoElement', 'HTMLAudioElement', 'HTMLIFrameElement', 'HTMLScriptElement', 'HTMLStyleElement',
  'HTMLLinkElement', 'HTMLMetaElement', 'HTMLTableElement', 'HTMLTableRowElement', 'HTMLTableCellElement',
  
  // Geolocation & Device APIs
  'Geolocation', 'GeolocationPosition', 'GeolocationCoordinates', 'GeolocationPositionError',
  'DeviceOrientationEvent', 'DeviceMotionEvent', 'Notification', 'Permission', 'Permissions',
  
  // Payment & Credentials
  'PaymentRequest', 'PaymentResponse', 'PaymentAddress', 'PaymentMethodChangeEvent',
  'CredentialsContainer', 'Credential', 'FederatedCredential', 'PasswordCredential', 'PublicKeyCredential',
  
  // Web Animations
  'Animation', 'AnimationEffect', 'KeyframeEffect', 'AnimationTimeline', 'DocumentTimeline',
  'AnimationEvent', 'TransitionEvent',
  
  // Timers & Scheduling
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback',
  'queueMicrotask', 'scheduler',
  
  // Legacy & Compatibility
  'alert', 'confirm', 'prompt', 'open', 'close', 'print', 'stop', 'blur', 'focus', 'scroll', 'scrollTo', 'scrollBy',
  'moveBy', 'moveTo', 'resizeBy', 'resizeTo', 'find', 'getSelection', 'getComputedStyle',
  'matchMedia', 'ActiveXObject', 'attachEvent', 'detachEvent',
  
  // Modern Web APIs
  'PerformanceObserver', 'PerformanceEntry', 'PerformanceMark', 'PerformanceMeasure',
  'PerformanceNavigationTiming', 'PerformanceResourceTiming', 'PerformancePaintTiming',
  'ReportingObserver', 'Report', 'DeprecationReport', 'InterventionReport',
  'SecurityPolicyViolationEvent', 'CSPViolationReportBody',
  
  // Streams API
  'ReadableStream', 'WritableStream', 'TransformStream', 'ReadableStreamDefaultReader',
  'ReadableStreamBYOBReader', 'WritableStreamDefaultWriter', 'TransformStreamDefaultController',
  'ReadableStreamDefaultController', 'ReadableByteStreamController',
  
  // WebAssembly
  'WebAssembly', 'WebAssemblyInstantiatedSource', 'WebAssemblyModule', 'WebAssemblyInstance',
  'WebAssemblyMemory', 'WebAssemblyTable', 'WebAssemblyGlobal', 'WebAssemblyCompileError',
  'WebAssemblyLinkError', 'WebAssemblyRuntimeError',
  
  // Encoding APIs
  'TextEncoder', 'TextDecoder', 'TextEncoderStream', 'TextDecoderStream',
  
  // Background APIs
  'BackgroundFetch', 'BackgroundSync', 'PushManager', 'PushSubscription', 'PushEvent', 'NotificationEvent',
  
  // Speech APIs
  'SpeechRecognition', 'webkitSpeechRecognition', 'SpeechRecognitionResult', 'SpeechRecognitionAlternative',
  'SpeechSynthesis', 'SpeechSynthesisUtterance', 'SpeechSynthesisVoice', 'SpeechSynthesisEvent',
  
  // WebRTC
  'RTCPeerConnection', 'RTCDataChannel', 'RTCSessionDescription', 'RTCIceCandidate',
  'RTCStatsReport', 'RTCCertificate', 'RTCConfiguration', 'RTCOfferOptions', 'RTCAnswerOptions',
  'MediaStreamConstraints', 'getUserMedia',
  
  // Deprecated/Legacy (but still might appear in older code)
  'escape', 'unescape', 'uneval', 'toSource', 'watch', 'unwatch',
  
  // Platform specific globals that might be encountered
  'chrome', 'safari', 'opera', 'moz', 'webkit', 'ms',
  
  // Test environments
  'jest', 'describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll',
  'mocha', 'chai', 'sinon', 'jasmine', 'spyOn',
  
  // Common library globals
  'jQuery', '$', '_', 'React', 'ReactDOM', 'Vue', 'Angular', 'moment', 'dayjs', 'lodash',
  'axios', 'Backbone', 'Ember', 'Handlebars', 'Mustache', 'Underscore',
  
  // Build tools & environments
  'require', 'define', 'exports', 'module', '__webpack_require__', 'webpackJsonp',
  'System', 'AMD', 'UMD', '__dirname', '__filename'
]);

module.exports = globals;