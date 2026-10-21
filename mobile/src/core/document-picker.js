export function chooseAndroidDocument() {
  return new Promise((resolve, reject) => {
    const runtime = typeof plus === 'undefined' ? null : plus;
    if (!runtime || runtime.os?.name !== 'Android') {
      reject(new Error('当前设备暂不支持选择文档'));
      return;
    }
    const bridge = runtime.android;
    const main = bridge.runtimeMainActivity();
    const Intent = bridge.importClass('android.content.Intent');
    const OpenableColumns = bridge.importClass('android.provider.OpenableColumns');
    const intent = new Intent(Intent.ACTION_GET_CONTENT);
    bridge.invoke(intent, 'setType', '*/*');
    bridge.invoke(intent, 'addCategory', Intent.CATEGORY_OPENABLE);
    const requestCode = 24000 + Math.floor(Math.random() * 10000);
    const previousHandler = main.onActivityResult;
    let settled = false;
    let timeout;

    const restore = () => {
      clearTimeout(timeout);
      if (main.onActivityResult === handler) main.onActivityResult = previousHandler;
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      restore();
      callback(value);
    };
    const handler = (resultRequestCode, resultCode, data) => {
      if (resultRequestCode !== requestCode) {
        if (typeof previousHandler === 'function') previousHandler(resultRequestCode, resultCode, data);
        return;
      }
      const Activity = plus.android.importClass('android.app.Activity');
      if (resultCode !== Activity.RESULT_OK || !data) {
        const error = new Error('已取消选择文档');
        error.cancelled = true;
        finish(reject, error);
        return;
      }
      try {
        const uri = bridge.invoke(data, 'getData');
        if (!uri) throw new Error('没有取得所选文档');
        const resolver = bridge.invoke(main, 'getContentResolver');
        const columns = [OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE];
        const cursor = bridge.invoke(resolver, 'query', uri, columns, null, null, null);
        let name = '';
        let size = 0;
        try {
          if (cursor && bridge.invoke(cursor, 'moveToFirst')) {
            const nameIndex = bridge.invoke(cursor, 'getColumnIndex', OpenableColumns.DISPLAY_NAME);
            const sizeIndex = bridge.invoke(cursor, 'getColumnIndex', OpenableColumns.SIZE);
            if (nameIndex >= 0) name = bridge.invoke(cursor, 'getString', nameIndex) || '';
            if (sizeIndex >= 0) size = Number(bridge.invoke(cursor, 'getLong', sizeIndex)) || 0;
          }
        } finally {
          if (cursor) bridge.invoke(cursor, 'close');
        }
        const path = bridge.invoke(uri, 'toString');
        if (!path) throw new Error('无法读取所选文档的位置');
        finish(resolve, { path, name, size });
      } catch (error) {
        finish(reject, new Error(error.message || '读取文档信息失败'));
      }
    };

    main.onActivityResult = handler;
    timeout = setTimeout(() => finish(reject, new Error('选择文档等待超时，请重试')), 120000);
    try {
      bridge.invoke(main, 'startActivityForResult', intent, requestCode);
    } catch (error) {
      finish(reject, new Error(error.message || '无法打开系统文档选择器'));
    }
  });
}
