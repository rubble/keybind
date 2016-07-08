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

  /**
   *  @function equal - Compare if a list of keys is the same as a list of KeyObjects in a stack. 
   *    KeyObject is is of shape.  This function ignores altKey, ctrlKey,
   *    metaKey and shiftKey.
   *  @private
   *
   *  @param {String[]} key
   *  @param {Object[]} stack - stack of KeyObjects
   *    {Object} KeyObject
   *    {string} KeyObject.string
   *    {boolean} KeyObject.altKey
   *    {boolean} KeyObject.ctrlKey
   *    {boolean} KeyObject.metaKey
   *    {boolean} KeyObject.shiftKey
   *    
   *  @return {boolean} - return true if keys and stack are the same.
   */

  function equal(key, stack) {
    if (key.length !== stack.length) return false;
    for (var i = 0, len = key.length; i < len; i++) {
      if (key[i] !== stack[i].key) return false;
    }
    return true;
  };

  // specialKeys which are claering the stack on keydown since they are used
  // by browsers and they do not fire keyup event.
  // Chrome: F3 (search), F6
  // Firefox: F10 (menu)
  // IE9: F6, F7 (caret browsing)
  var specialKeys = ['Alt', 'Meta', 'Control', 'F1', 'F3', 'F5', 'F6', 'F7', 'F10', 'F11'];

  /**
   *  @function getKey - get key in platform independed way from a KeyEvent (keydown or keyup).
   *  @private
   *
   *  @param {KeyEvent} ev
   *  @return {String}
   */
  function getKey(ev) {
    var key = ev.key;
    if (key === 'Esc')
      // Edge, IE11: `Esc`; Firefox, Chrome: `Escape`.
      return 'Escape';else if (key === 'Spacebar')
      // Edge, IE11: `Spacebar`; Firefox, Chrome: ` `.
      return ' ';
    return key;
  };

  /**
   *  @typedef KeyObject - object hodling key information
   *  @type {object}
   *  @property {string} key - platform independent string representing a key
   *  @property {boolean} altKey - true if alt key was pressed
   *  @property {boolean} ctrlKey - true if control key was pressed
   *  @property {boolean} metaKey - true if meta key wsa pressed 
   *  @property {boolean} shiftKey - true if shift key was pressed
   */

  /**
   *  @callback keyBindListener
   *  @param {KeyObject[]} stack
   */

  /**
   *  @typedef HandlerObject
   *  @type {object}
   *  @property {string[]} keys - list of chars
   *  @property {keyBindListener} handler - handler callback
   *  @property {object} options - options object 
   */

  /**
   *  @name KeyBindPrototype - prototype of KeyBind object
   *  @private
   *  @memberof KeyBind.protoype
   */
  var KeyBindPrototype = {
    _indexOf: function _indexOf(key) {
      for (var i = 0, len = this._stack.length; i < len; i++) {
        if (this._stack[i].key === key) return i;
      }
      return -1;
    },

    /**
     *  @method _keyDownListener
     *  @private
     * 
     *  @param {KeyEvent} ev
     *  @emit {CustomEvent} keybinding - emits keybinding event if the current
     *     stack matches with one of registered key combinations.
     */
    _keyDownListener: function _keyDownListener(ev) {
      var evKey = getKey(ev);
      this._stack = this._stack.filter(function (key) {
        return key !== evKey;
      });

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
        shiftKey: ev.shiftKey
      });
      this._lastKeyDownTime = Date.now();
      if (this._timeoutId) clearTimeout(this._timeoutId);
      if (this.clearStackTimeout) this._timeoutId = setTimeout(this._clearStackCallback.bind(this), this.clearStackTimeout);

      if (this._debug) console.log('keydown', this._stack.map(function (key) {
        return key.key;
      }));

      var keyBindEvent = document.createEvent('CustomEvent');
      keyBindEvent.initCustomEvent('keybinding', false, false, Array.prototype.slice.call(this._stack));
      document.body.dispatchEvent(keyBindEvent);
    },

    /**
     *  @method _keyUpListener
     *  @private
     *
     *  @param {KeyEvent} ev
     */
    _keyUpListener: function _keyUpListener(ev) {
      var evKey = getKey(ev);

      if (evKey === "Unidentified")
        // IE9
        return this.clearKeyStack();

      this._stack = this._stack.filter(function (stackKey) {
        return stackKey.key !== evKey;
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

      if (this._debug) console.log('keyup', evKey, this._stack.length, this._timeoutId && this._stack.length === 0 ? 'clearing this._timeoutId' : '');

      if (this._stack.length === 0 && this._timeoutId) clearTimeout(this._timeoutId);
    },

    /**
     *  @method _keyBindingListener
     *  @private
     *
     *  @param {KeyBind} ev
     */
    _keyBindingListener: function _keyListener(ev) {
      var _this = this;

      this._handlers.forEach(function (handler) {
        if (equal(handler.keys, ev.detail)) {
          handler.handler(ev);
          if (handler.options.clearKeyStack) _this.clearStack();
        }
      });
    },

    /**
     *  @methhod _clearStackCallback - clearStack interval callback
     *  @private
     */
    _clearStackCallback: function _clearStackCallback() {
      this._timeoutId = null;
      if (this._debug) console.log('_clearStackCallback');
      if (this._stack.length > 0 && Date.now() - this._lastKeyDownTime > this.clearStackTimeout) {
        this.clearStack();
      }
    },

    /**
     *  @method enable
     *
     *  Enable key bindings.  This method clears the stack and adds event
     *  listeners to the body element.
     *
     *  @listens key
     */
    enable: function enebale() {
      this.clearStack();
      document.body.addEventListener('keyup', this._keyUpListener, false);
      document.body.addEventListener('keydown', this._keyDownListener, false);
      document.body.addEventListener('keybinding', this._keyBindingListener, false);
    },

    /**
     *  @method disable
     *
     *  Disable key bindings by removing all event listeners and clearing the
     *  key stack.
     */
    disable: function disable() {
      this.clearStack();
      document.body.removeEventListener('keyup', this._keyUpListener);
      document.body.removeEventListener('keydown', this._keyDownListener);
      document.body.removeEventListener('keybinding', this._keyBindingListener);
    },

    /**
     *  @method addEventListener
     *
     *  @param {string[]} keys - list of strings that the listener should
     *    handle
     *  @param {keyBindListener} handler - keybind event listener.  As an argument
     *    a copy of the current stack (list of KeyObjects) is passed.
     *  @param {Object} [options] - currently only optinos.clearKeyStack is
     *    supported: a boolean option, if true clears the stack after the
     *    handler is called, the default is false
     */
    addEventListener: function addEventListener(keys, handler, options) {
      options = options || { clearKeyStack: false };
      options.clearKeyStack = !!options.clearKeyStack;
      this._handlers.push({ keys: keys, handler: handler, options: options });
    },

    /**
     *  @method removeEventListener - Removes all listeners that match the key
     *    combination or only the one given by handler argument.
     *  @example KeyBind.removeEventListener(['a', 'b']);
     *  @example KeyBind.removeEventListener(null, abKeyHandler);
     *
     *  @param {?string[]} [keys] - a list of strings
     *  @param {?keyBindListener} [handler]
     *
     *
     */
    removeEventListener: function removeEventListener(keys, handler) {
      this._handlers = this._handlers.filter(function (_handler) {
        var handlerKeys = _handler.keys;
        var equal = false;
        if (keys && handlerKeys.length === keys.length) {
          equal = true;
          for (var i = 0, len = keys.length; i < len; i++) {
            if (handlerKeys[i] !== keys[i]) {
              equal = false;
              break;
            }
          }
        }
        return !equal || _handler.handler === handler;
      });
    },

    /**
     *  @method clearStack - clear the stack of keys registered through
     *    keydown and keyup events.  Also remove timeout callback which would
     *    clear the stack.
     */
    clearStack: function clearStack() {
      this._stack.splice(0, this._stack.length);
      if (this._timeoutId) {
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
      }
    },

    /**
     *  @method reset - clear the stack, remove all handlers and clear timeout.
     */
    reset: function reset() {
      this.clearStack();
      this._handlers.splice(0, this._handlers.length);
    },

    /**
     *  @method dispose
     *
     *  Clear the stack, remove all handlers and event listeners.  Call this
     *  method before you want to garbace collect the KeyBind object.
     */
    dispose: function dispose() {
      this.reset();
      this.disable();
    }
  };

  /**
   *  @name KeyBind
   *
   *  @property {number} KeyBind.clearStackTimeout - number of milliseconds after
   *    which clear the stack if there was no keydown event.  If zero (or
   *    falsy) do not ever clear the stack from a setTimeout callback.
   *  @property {KeyObject[]} KeyBind._stack - stack of keys
   *  @property {HandlerObject[]} KeyBind._handlers - list of handlers
   *  @property {boolean} KeyBind._debug
   *  @property {nubmer} KeyBind._timeoutId - timeoutId returned from
   *    setTimeout, when setting the KeyBindPrototype.clearStackCallback.
   *  @property {number} KeyBind._lastDownTime - last time a key was pressed
   *    (registered on keydown event).
   */
  var KeyBind = Object.create(KeyBindPrototype, {

    clearStackTimeout: { value: 750, writable: true },
    _stack: { value: [], writable: true },
    _handlers: { value: [], writable: true },
    _debug: { value: false, writable: true },
    _timeoutId: { value: null, writable: true },
    _lastKeyDownTime: { value: 0, writable: true }
  });

  KeyBind._keyUpListener = KeyBind._keyUpListener.bind(KeyBind);
  KeyBind._keyDownListener = KeyBind._keyDownListener.bind(KeyBind);
  KeyBind._keyBindingListener = KeyBind._keyBindingListener.bind(KeyBind);

  return KeyBind;
});