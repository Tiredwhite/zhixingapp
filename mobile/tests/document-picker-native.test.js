import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAndroidDocument } from '../src/core/document-picker.js';

test('Android document picker calls resolver and cursor through the native bridge', async () => {
  const values = { display_name: 'notice.docx', size: 4096 };
  const cursor = {
    moveToFirst() { return true; },
    getColumnIndex(name) { return name === 'display_name' ? 0 : 1; },
    getString(index) { return index === 0 ? values.display_name : ''; },
    getLong(index) { return index === 1 ? values.size : 0; },
    close() { this.closed = true; },
  };
  const uri = { toString() { return 'content://documents/42'; } };
  const resolver = { query(_uri, columns) { assert.deepEqual(columns, ['display_name', 'size']); return cursor; } };
  const main = {
    getContentResolver() { return resolver; },
    startActivityForResult(_intent, requestCode) { this.requestCode = requestCode; },
  };
  class Intent {
    static ACTION_GET_CONTENT = 'get-content';
    static CATEGORY_OPENABLE = 'openable';
    constructor(action) { this.action = action; }
    setType(value) { this.type = value; }
    addCategory(value) { this.category = value; }
  }
  globalThis.plus = {
    os: { name: 'Android' },
    android: {
      runtimeMainActivity() { return main; },
      importClass(name) {
        if (name === 'android.content.Intent') return Intent;
        if (name === 'android.provider.OpenableColumns') return { DISPLAY_NAME: 'display_name', SIZE: 'size' };
        if (name === 'android.app.Activity') return { RESULT_OK: -1 };
        return name;
      },
      invoke(target, method, ...args) { return target[method](...args); },
    },
  };

  const pending = chooseAndroidDocument();
  main.onActivityResult(main.requestCode, -1, { getData() { return uri; } });
  const selected = await pending;
  assert.deepEqual(selected, { path: 'content://documents/42', name: 'notice.docx', size: 4096 });
  assert.equal(cursor.closed, true);
  delete globalThis.plus;
});
