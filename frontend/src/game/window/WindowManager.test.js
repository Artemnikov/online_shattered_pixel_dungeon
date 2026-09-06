import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WindowManager } from './WindowManager.ts';
import { WindowLevel } from './WindowTypes.ts';

test('WindowManager: registers and unregisters windows', () => {
  const wm = new WindowManager();
  assert.equal(wm.hasActiveWindows(), false);

  wm.register({ id: 'wnd1', level: WindowLevel.BASE });
  assert.equal(wm.hasActiveWindows(), true);
  assert.equal(wm.getWindows().length, 1);

  wm.unregister('wnd1');
  assert.equal(wm.hasActiveWindows(), false);
  assert.equal(wm.getWindows().length, 0);
});

test('WindowManager: resolves priority by window level (higher level on top)', () => {
  const wm = new WindowManager();
  wm.register({ id: 'base', level: WindowLevel.BASE });
  wm.register({ id: 'dialog', level: WindowLevel.DIALOG });
  wm.register({ id: 'secondary', level: WindowLevel.SECONDARY });

  const windows = wm.getWindows();
  assert.equal(windows[0].id, 'dialog');
  assert.equal(windows[1].id, 'secondary');
  assert.equal(windows[2].id, 'base');

  assert.equal(wm.getTopWindow()?.id, 'dialog');
});

test('WindowManager: resolves LIFO order for windows with same level', () => {
  const wm = new WindowManager();
  wm.register({ id: 'win1', level: WindowLevel.BASE });
  wm.register({ id: 'win2', level: WindowLevel.BASE });
  wm.register({ id: 'win3', level: WindowLevel.BASE });

  const windows = wm.getWindows();
  assert.equal(windows[0].id, 'win3');
  assert.equal(windows[1].id, 'win2');
  assert.equal(windows[2].id, 'win1');
});

test('WindowManager: updating existing window retains order but updates callback', () => {
  const wm = new WindowManager();
  let calls = [];

  wm.register({
    id: 'first',
    level: WindowLevel.BASE,
    onClose: () => calls.push('first-v1'),
  });

  wm.register({
    id: 'second',
    level: WindowLevel.BASE,
    onClose: () => calls.push('second-v1'),
  });

  wm.register({
    id: 'first',
    level: WindowLevel.BASE,
    onClose: () => calls.push('first-v2'),
  });

  assert.equal(wm.getTopWindow()?.id, 'second');

  wm.unregister('second');
  assert.equal(wm.getTopWindow()?.id, 'first');

  const handled = wm.handleEscape();
  assert.equal(handled, true);
  assert.deepEqual(calls, ['first-v2']);
});

test('WindowManager: update() modifies window properties without re-ordering and notifies subscribers', () => {
  const wm = new WindowManager();
  let notifications = 0;
  const unsub = wm.subscribe(() => { notifications++; });

  wm.register({ id: 'win1', level: WindowLevel.BASE, closeOnEscape: true });
  assert.equal(notifications, 1);

  wm.update('win1', { closeOnEscape: false });
  assert.equal(notifications, 2);
  assert.equal(wm.getTopWindow()?.closeOnEscape, false);

  unsub();
});

test('WindowManager: top window with closeOnEscape=false consumes escape and blocks underlying windows', () => {
  const wm = new WindowManager();
  let calls = [];

  wm.register({
    id: 'base',
    level: WindowLevel.BASE,
    onClose: () => calls.push('base'),
  });

  wm.register({
    id: 'modal',
    level: WindowLevel.DIALOG,
    closeOnEscape: false,
    onClose: () => calls.push('modal'),
  });

  const handled = wm.handleEscape();
  assert.equal(handled, true);
  assert.deepEqual(calls, []);
  assert.equal(wm.hasActiveWindows(), true);
});

test('WindowManager: triggers fallback handler when no window is active', () => {
  const wm = new WindowManager();
  let fallbackCalls = 0;

  wm.setFallbackHandler(() => {
    fallbackCalls++;
    return true;
  });

  const handled = wm.handleEscape();
  assert.equal(handled, true);
  assert.equal(fallbackCalls, 1);
});
