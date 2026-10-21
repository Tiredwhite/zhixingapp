export function calendarSignature(task) {
  return JSON.stringify([task.title, task.due_at || task.due_date || '', task.location || '']);
}

export function calendarTiming(task) {
  let startTime;
  let reminderMinutes;
  if (task.due_at) {
    startTime = new Date(task.due_at).getTime();
    reminderMinutes = 30;
  } else if (task.due_date) {
    const [year, month, day] = task.due_date.split('-').map(Number);
    startTime = new Date(year, month - 1, day, 9, 0, 0, 0).getTime();
    reminderMinutes = 0;
  }
  if (!Number.isFinite(startTime) || startTime <= 0) throw new Error('待办日期无效，请先编辑并保存有效日期');
  return { startTime, endTime: startTime + 30 * 60 * 1000, reminderMinutes };
}

function putLong(values, key, value) {
  const longValue = plus.android.newObject('java.lang.Long', String(value));
  plus.android.invoke(values, 'put', key, longValue);
}

function putInteger(values, key, value) {
  const integerValue = plus.android.newObject('java.lang.Integer', String(value));
  plus.android.invoke(values, 'put', key, integerValue);
}

function findWritableCalendar(resolver, Calendars) {
  const columns = [Calendars._ID, Calendars.CALENDAR_ACCESS_LEVEL, Calendars.VISIBLE];
  const cursor = plus.android.importClass(plus.android.invoke(resolver, 'query', Calendars.CONTENT_URI, columns, null, null, null));
  if (!cursor) throw new Error('无法读取手机日历列表');
  try {
    const idIndex = cursor.getColumnIndex(Calendars._ID);
    const accessIndex = cursor.getColumnIndex(Calendars.CALENDAR_ACCESS_LEVEL);
    const visibleIndex = cursor.getColumnIndex(Calendars.VISIBLE);
    while (cursor.moveToNext()) {
      if (idIndex < 0 || accessIndex < 0) continue;
      const visible = visibleIndex < 0 || Number(cursor.getInt(visibleIndex)) === 1;
      if (visible && Number(cursor.getInt(accessIndex)) >= 500) return Number(cursor.getLong(idIndex));
    }
  } finally {
    cursor.close();
  }
  throw new Error('手机中没有可写入的日历，请先在系统日历添加一个日历账户');
}

function insertAndroidEvent(task, timing) {
  const main = plus.android.runtimeMainActivity();
  const resolver = main.getContentResolver();
  const Calendars = plus.android.importClass('android.provider.CalendarContract$Calendars');
  const Events = plus.android.importClass('android.provider.CalendarContract$Events');
  const Reminders = plus.android.importClass('android.provider.CalendarContract$Reminders');
  const TimeZone = plus.android.importClass('java.util.TimeZone');
  const calendarId = findWritableCalendar(resolver, Calendars);
  const timezone = plus.android.invoke(plus.android.invoke(TimeZone, 'getDefault'), 'getID');
  const event = plus.android.newObject('android.content.ContentValues');
  putLong(event, 'calendar_id', calendarId);
  putLong(event, 'dtstart', timing.startTime);
  putLong(event, 'dtend', timing.endTime);
  putInteger(event, 'hasAlarm', 1);
  plus.android.invoke(event, 'put', 'title', task.title);
  plus.android.invoke(event, 'put', 'description', `知行校园通知助手 · ${timing.reminderMinutes ? '截止前30分钟提醒' : '当天09:00提醒'}`);
  plus.android.invoke(event, 'put', 'eventTimezone', timezone);
  plus.android.invoke(event, 'put', 'eventLocation', task.location || '');

  const eventUri = plus.android.invoke(resolver, 'insert', Events.CONTENT_URI, event);
  if (!eventUri) throw new Error('系统日历没有接受这条日程');
  try {
    const eventId = Number(plus.android.invoke(eventUri, 'getLastPathSegment'));
    if (!Number.isSafeInteger(eventId) || eventId <= 0) throw new Error('系统日历没有返回日程编号');
    const reminder = plus.android.newObject('android.content.ContentValues');
    putLong(reminder, 'event_id', eventId);
    putInteger(reminder, 'minutes', timing.reminderMinutes);
    putInteger(reminder, 'method', 1);
    if (!plus.android.invoke(resolver, 'insert', Reminders.CONTENT_URI, reminder)) throw new Error('日程已创建，但提醒未能保存');
  } catch (error) {
    plus.android.invoke(resolver, 'delete', eventUri, null, null);
    throw error;
  }
}

export function addTaskToCalendar(task, { success, fail }) {
  let timing;
  try { timing = calendarTiming(task); }
  catch (error) { fail(error); return; }

  // #ifdef APP-PLUS
  if (plus.os.name === 'Android' && plus.android?.requestPermissions) {
    plus.android.requestPermissions(
      ['android.permission.READ_CALENDAR', 'android.permission.WRITE_CALENDAR'],
      (result) => {
        if (!result.granted?.includes('android.permission.READ_CALENDAR') || !result.granted?.includes('android.permission.WRITE_CALENDAR')) {
          fail(new Error('需要允许知行访问日历，才能自动创建日程和提醒'));
          return;
        }
        try { insertAndroidEvent(task, timing); success(); }
        catch (error) { fail(new Error(error.message || '写入手机日历失败')); }
      },
      () => fail(new Error('日历权限申请未完成')),
    );
    return;
  }
  // #endif

  if (typeof uni.addPhoneCalendar !== 'function') {
    fail(new Error('此设备暂不支持直接写入系统日历'));
    return;
  }
  uni.addPhoneCalendar({
    title: task.title,
    startTime: Math.floor(timing.startTime / 1000),
    endTime: Math.floor(timing.endTime / 1000),
    location: task.location || '',
    notes: `知行校园通知助手 · ${timing.reminderMinutes ? '截止前30分钟提醒' : '当天09:00提醒'}`,
    alarm: true,
    alarmOffset: timing.reminderMinutes * 60,
    success: () => success(),
    fail: (error) => fail(new Error(error?.errMsg || '写入系统日历失败')),
  });
}
