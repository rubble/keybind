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

  const specialKeys = ['Shift', 'Alt', 'Compose', 'Meta', 'Control', 'AltGraph'];

  const KeyBindPrototype = {
    _indexOf: function _indexOf(key) {
      for(let i=0, len=this._stack.length; i<len; i++) {
        if (this._stack[i].key === key)
          return i;
      }
      return -1;
    },

    _keyDownListener: function _keyDownListener(ev) {
      this._stack = this._stack.filter(function(key) {return key !== ev.key});

      // do not register Alt, Ctrl, CtrlGraph, Meta key combinations.  Some of
      // them are handled by the browser (Ctrl+s) or the system (Alt+Tab).
      if (ev.key === "Alt" || ev.altKey || ev.key == "Meta" || ev.metaKey || ev.key === "Control" || ev.ctrlKey) {
        this._stack.splice(0, this._stack.length);
        return;
      }
      this._stack.push({
        key: ev.key,
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
      this._stack = this._stack.filter(function(stackKey) {
        return stackKey.key !== ev.key;
      });

      const isAltKey = ev.key === "Alt",
        isCtrlKey = ev.key === "Control",
        isMetaKey = ev.key === "Meta",
        isShiftKey = ev.key === "Shift";

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

      if (ev.key === 'AltGraph' || ev.key === 'Compose') {
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
        console.log('keyup', ev.key, this._stack.length);
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
      document.body.addEventListener('keyup', this._keyUpListener, false);
      document.body.addEventListener('keydown', this._keyDownListener, false);
      document.body.addEventListener('keybinding', this._keyBindingListener, false);
    },
    disable: function disable() {

      document.body.removeEventListener('keyup', this._keyUpListener);
      document.body.removeEventListener('keydown', this._keyDownListener);
      document.body.removeEventListener('keybinding', this._keyBindingListener);
    },

    addEventListener: function addEventListener(keys, handler, options) {
      options = options || {clearKeyStack: false};
      options.clearKeyStack = !!options.clearKeyStack;
      this._handlers.push({keys, handler, options});
    },

    removeEventListener: function removeEventListener(keys) {
      this._handlers = this._handlers.filter(function(handler) {
        const handlerKeys = handler.keys;
        let equal = false;
        if (handlerKeys.length === keys.length) {
          equal = true;
          for(let i=0, len = keys.length; i<len; i++) {
            if (handlerKeys[i] !== keys[i]) {
              equal = false;
              break;
            }
          }
        }
        return !equal;
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
