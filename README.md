# KeyBind

A small library which helps to add key bindings to your web app.  It records
keys and stores them in a stack.  Keys are added on `keydown` (registered on
`document.body`) and removed on `keyup` (registered on `document.body`).  On
each `keydown` event key stack is matched against registered key handlers.  If
one is matching it fires.  The `Ctrl`, `Alt`, `Meta` keys clear the key stack.
The reason is that browser original keybindings will trigger `keydown` event
but not `keyup` (like `Ctrl+s` or `Ctrl+u`).

## Useage

```
const KeyBind = require("keybind");

// add event listener for key binding `a+b`
KeyBind.addEventListener(['a', 'b'], function(ev) {});
// remove key bind listener
KeyBind.removeEventListener(['a', 'b']);

// start listening on keydown and keyup events on `document.body` element
KeyBind.enable();
// stop listening on `document.body` events
KeyBind.disable();

// clear key stack: remove recorded keys from the key stack
KeyBind.clearKeyStack();

// reset: remove all handlers and clear the key stack
KeyBind.reset();

// dispose: remove all handlers and event listeners, this is just runs: `KeyBind.clearKeyStack()`, `KeyBind.reset()` and `KeyBind.disable()`;
KeyBind.dispose();
```
