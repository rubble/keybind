(function(factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
      // CommonJS module
      module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
      // AMD anonymous module
      define([], factory);
    } else {
      // No module loader (plain <script> tag) - put directly in global namespace
      factory();
    }
})(function() {
  'use strict';
  function equal(key, stack) {
    if (key.length !== stack.length)
      return false;
    for(let i=0, len=key.length; i<len; i++) {
      if (key[i] !== stack[i].key)
        return false;
    }
    return true;
  };

  // specialKeys which are claering the stack on keydown since they are used
  // by browsers and they do not fire keyup event.
  // Chrome: F3 (search), F6
  // Firefox: F10 (menu)
  // IE9: F6, F7 (caret browsing)
  const specialKeys = ['Alt', 'Meta', 'Control', 'F1', 'F3', 'F5', 'F6', 'F7', 'F10', 'F11'];

  function getKey(ev) {
    let key = ev.key;
    if (key === 'Esc')
      // Edge, IE11: `Esc`; Firefox, Chrome: `Escape`.
      return 'Escape';
    else if (key === 'Spacebar')
      // Edge, IE11: `Spacebar`; Firefox, Chrome: ` `.
      return ' ';
    return key;
  };

  const KeyBindPrototype = {
    _indexOf: function _indexOf(key) {
      for(let i=0, len=this._stack.length; i<len; i++) {
        if (this._stack[i].key === key)
          return i;
      }
      return -1;
    },

    _keyDownListener: function _keyDownListener(ev) {
      const evKey = getKey(ev);
      this._stack = this._stack.filter(key => key !== evKey);

      // do not register Alt, Ctrl, CtrlGraph, Meta key combinations.  Some of
      // them are handled by the browser (Ctrl+s) or the system (Alt+Tab).
      if (specialKeys.indexOf(evKey) !== -1 || ev.altKey || ev.metaKey || ev.ctrlKey) {
        this._stack.splice(0, this._stack.length);
        return;
      }
      this._stack.push({
        key: evKey,
        altKey: ev.altKey,
        ctrlKey: ev.ctrlKey,
        metaKey: ev.metaKey,
        shiftKey: ev.shiftKey,
      });
      if (this._debug)
        console.log('keydown', this._stack.map(function(key) {return key.key}));

      const keyBindEvent = document.createEvent('CustomEvent');
      keyBindEvent.initCustomEvent('keybinding', false, false, Array.prototype.slice.call(this._stack));
      document.body.dispatchEvent(keyBindEvent);
    },

    _keyUpListener: function _keyUpListener(ev) {
      const evKey = getKey(ev);

      if (evKey === "Unidentified")
        // IE9
        return this.clearKeyStack();

      this._stack = this._stack.filter(function(stackKey) {
        return stackKey.key !== evKey;
      });

      const isAltKey = evKey === "Alt",
        isCtrlKey = evKey === "Control",
        isMetaKey = evKey === "Meta",
        isShiftKey = evKey === "Shift";

      if (isAltKey || isCtrlKey || isMetaKey || isShiftKey) {
        // keyup event might not be fired if browser has a keybinding, e.g.
        // Alt+d or Ctr+s.  We need this part just for shiftKey.
        this._stack = this._stack.filter(function(stackKey) {
          const ret = (isAltKey && !stackKey.altKey ||
                  isCtrlKey && !stackKey.ctrlKey ||
                  isMetaKey && !stackKey.metaKey ||
                  isShiftKey && !stackKey.shiftKey);
          return ret;
        });
      }

      if (evKey === 'AltGraph' || evKey === 'Compose') {
        // key sequence 'AltGraph+shift-AltGraph-Shit' emits AltGraph then Shift
        // on keydown event and then Compose and Shift on KeyDown.
        const altGrIdx = this._indexOf('AltGraph'),
          composeIdx = this._indexOf('Compose');
        let idx;
        if (altGrIdx !== -1 && composeIdx !== -1)
          idx = Math.min(altGrIdx, composeIdx)
        else if (altGrIdx !== -1)
          idx = altGrIdx;
        else if (composeIdx !== -1)
          idx = composeIdx;
        else {
          // it might happen that AltGraph was already removed if it was pressed
          // after shiftKey that has been released already.
          idx = 0;
        }
        this._stack.splice(idx, this._stack.length - idx);
      }

      if (this._debug)
        console.log('keyup', evKey, this._stack.length);
    },

    _keyBindingListener: function _keyListener(ev) {
      this._handlers.forEach(handler => {
        if (equal(handler.keys, ev.detail)) {
          handler.handler(ev);
          if (handler.options.clearKeyStack)
            this.clearStack();
        }
      });
    },

    enable: function enebale() {
      this.clearStack();
      document.body.addEventListener('keyup', this._keyUpListener, false);
      document.body.addEventListener('keydown', this._keyDownListener, false);
      document.body.addEventListener('keybinding', this._keyBindingListener, false);
    },
    disable: function disable() {
      this.clearStack();
      document.body.removeEventListener('keyup', this._keyUpListener);
      document.body.removeEventListener('keydown', this._keyDownListener);
      document.body.removeEventListener('keybinding', this._keyBindingListener);
    },

    addEventListener: function addEventListener(keys, handler, options) {
      options = options || {clearKeyStack: false};
      options.clearKeyStack = !!options.clearKeyStack;
      this._handlers.push({keys, handler, options});
    },

    removeEventListener: function removeEventListener(keys, handler) {
      this._handlers = this._handlers.filter(function(_handler) {
        const handlerKeys = _handler.keys;
        let equal = false;
        if (keys && handlerKeys.length === keys.length) {
          equal = true;
          for(let i=0, len = keys.length; i<len; i++) {
            if (handlerKeys[i] !== keys[i]) {
              equal = false;
              break;
            }
          }
        }
        return !equal || _handler.handler === handler;
      });
    },

    clearStack: function() {
      this._stack.splice(0, this._stack.length);
    },

    reset: function() {
      this.clearStack();
      this._handlers.splice(0, this._handlers.length);
    },

    dispose: function() {
      this.reset();
      this.disable();
    },
  };

  const KeyBind = Object.create(
    KeyBindPrototype,
    {
      _stack: {value: [], writable: true,},
      _handlers: {value: [], writable: true,},
      _debug: {value: false, writable: true,},
    }
  );

  KeyBind._keyUpListener = KeyBind._keyUpListener.bind(KeyBind);
  KeyBind._keyDownListener = KeyBind._keyDownListener.bind(KeyBind);
  KeyBind._keyBindingListener = KeyBind._keyBindingListener.bind(KeyBind);

  return KeyBind;
});
