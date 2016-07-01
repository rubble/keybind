/*!
 * Copyright (c) 2016 Rubble LTD. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
 * OR OTHER DEALINGS IN THE SOFTWARE.
 */
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

(function (factory) {
  if (typeof require === "function" && (typeof exports === "undefined" ? "undefined" : _typeof(exports)) === "object" && (typeof module === "undefined" ? "undefined" : _typeof(module)) === "object") {
    // CommonJS module
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    // AMD anonymous module
    define([], factory);
  } else {
    // No module loader (plain <script> tag) - put directly in global namespace
    factory();
  }
})(function () {
  'use strict';

  function equal(key, stack) {
    if (key.length !== stack.length) return false;
    for (var i = 0, len = key.length; i < len; i++) {
      if (key[i] !== stack[i].key) return false;
    }
    return true;
  };

  var specialKeys = ['Shift', 'Alt', 'Compose', 'Meta', 'Control', 'AltGraph'];

  function getKey(ev) {
    var key = ev.key;
    if (key === 'Esc') return 'Escape';
    return key;
  };

  var KeyBindPrototype = {
    _indexOf: function _indexOf(key) {
      for (var i = 0, len = this._stack.length; i < len; i++) {
        if (this._stack[i].key === key) return i;
      }
      return -1;
    },

    _keyDownListener: function _keyDownListener(ev) {
      this._stack = this._stack.filter(function (key) {
        return key !== ev.key;
      });

      // do not register Alt, Ctrl, CtrlGraph, Meta key combinations.  Some of
      // them are handled by the browser (Ctrl+s) or the system (Alt+Tab).
      var evKey = getKey(ev);
      if (evKey === "Alt" || ev.altKey || ev.key == "Meta" || ev.metaKey || ev.key === "Control" || ev.ctrlKey) {
        this._stack.splice(0, this._stack.length);
        return;
      }
      this._stack.push({
        key: evKey,
        altKey: ev.altKey,
        ctrlKey: ev.ctrlKey,
        metaKey: ev.metaKey,
        shiftKey: ev.shiftKey
      });
      if (this._debug) console.log('keydown', this._stack.map(function (key) {
        return key.key;
      }));

      var keyBindEvent = document.createEvent('CustomEvent');
      keyBindEvent.initCustomEvent('keybinding', false, false, Array.prototype.slice.call(this._stack));
      document.body.dispatchEvent(keyBindEvent);
    },

    _keyUpListener: function _keyUpListener(ev) {
      this._stack = this._stack.filter(function (stackKey) {
        return stackKey.key !== getKey(ev);
      });

      var isAltKey = evKey === "Alt",
          isCtrlKey = evKey === "Control",
          isMetaKey = evKey === "Meta",
          isShiftKey = evKey === "Shift";

      if (isAltKey || isCtrlKey || isMetaKey || isShiftKey) {
        // keyup event might not be fired if browser has a keybinding, e.g.
        // Alt+d or Ctr+s.  We need this part just for shiftKey.
        this._stack = this._stack.filter(function (stackKey) {
          var ret = isAltKey && !stackKey.altKey || isCtrlKey && !stackKey.ctrlKey || isMetaKey && !stackKey.metaKey || isShiftKey && !stackKey.shiftKey;
          return ret;
        });
      }

      if (evKey === 'AltGraph' || evKey === 'Compose') {
        // key sequence 'AltGraph+shift-AltGraph-Shit' emits AltGraph then Shift
        // on keydown event and then Compose and Shift on KeyDown.
        var altGrIdx = this._indexOf('AltGraph'),
            composeIdx = this._indexOf('Compose');
        var idx = void 0;
        if (altGrIdx !== -1 && composeIdx !== -1) idx = Math.min(altGrIdx, composeIdx);else if (altGrIdx !== -1) idx = altGrIdx;else if (composeIdx !== -1) idx = composeIdx;else {
          // it might happen that AltGraph was already removed if it was pressed
          // after shiftKey that has been released already.
          idx = 0;
        }
        this._stack.splice(idx, this._stack.length - idx);
      }

      var key = {
        key: evKey,
        altKey: ev.altKey,
        ctrlKey: ev.ctrlKey,
        metaKey: ev.metaKey,
        shiftKey: ev.shiftKey
      };
      if (this._debug) console.log('keyup', evKey, this._stack.length);
    },

    _keyBindingListener: function _keyListener(ev) {
      var _this = this;

      this._handlers.forEach(function (handler) {
        if (equal(handler.keys, ev.detail)) {
          handler.handler(ev);
          if (handler.options.clearKeyStack) _this.clearStack();
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
      options = options || { clearKeyStack: false };
      options.clearKeyStack = !!options.clearKeyStack;
      this._handlers.push({ keys: keys, handler: handler, options: options });
    },

    removeEventListener: function removeEventListener(keys) {
      this._handlers = this._handlers.filter(function (handler) {
        var handlerKeys = handler.keys;
        var equal = false;
        if (handlerKeys.length === keys.length) {
          equal = true;
          for (var i = 0, len = keys.length; i < len; i++) {
            if (handlerKeys[i] !== keys[i]) {
              equal = false;
              break;
            }
          }
        }
        return !equal;
      });
    },

    clearStack: function clearStack() {
      this._stack.splice(0, this._stack.length);
    },

    reset: function reset() {
      this.clearStack();
      this._handlers.splice(0, this._handlers.length);
    },

    dispose: function dispose() {
      this.reset();
      this.disable();
    }
  };

  var KeyBind = Object.create(KeyBindPrototype, {
    _stack: { value: [], writable: true },
    _handlers: { value: [], writable: true },
    _debug: { value: false, writable: true }
  });

  KeyBind._keyUpListener = KeyBind._keyUpListener.bind(KeyBind);
  KeyBind._keyDownListener = KeyBind._keyDownListener.bind(KeyBind);
  KeyBind._keyBindingListener = KeyBind._keyBindingListener.bind(KeyBind);

  return KeyBind;
});