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

function putText(values, key, value) {
  plus.android.invoke(values, 'put', key, value);
}

function findWritableCalendar(resolver, Calendars) {
  const columns = [Calendars._ID, Calendars.CALENDAR_ACCESS_LEVEL, Calendars.VISIBLE];
  const cursor = plus.android.importClass(plus.android.invoke(resolver, 'query', Calendars.CONTENT_URI, columns, null, null, null));
  if (!cursor) throw new Error('无法读取手机日历列表');
  try {
    const idIndex = plus.android.invoke(cursor, 'getColumnIndex', Calendars._ID);
    const accessIndex = plus.android.invoke(cursor, 'getColumnIndex', Calendars.CALENDAR_ACCESS_LEVEL);
    const visibleIndex = plus.android.invoke(cursor, 'getColumnIndex', Calendars.VISIBLE);
    while (plus.android.invoke(cursor, 'moveToNext')) {
      if (idIndex < 0 || accessIndex < 0) continue;
      const visible = visibleIndex < 0 || Number(plus.android.invoke(cursor, 'getInt', visibleIndex)) === 1;
      if (visible && Number(plus.android.invoke(cursor, 'getInt', accessIndex)) >= 500) return Number(plus.android.invoke(cursor, 'getLong', idIndex));
    }
  } finally {
    plus.android.invoke(cursor, 'close');
  }
  return null;
}

function createLocalCalendar(resolver, Calendars, CalendarContract, timezone) {
  const accountName = '知行本机日历';
  const accountType = CalendarContract.ACCOUNT_TYPE_LOCAL;
  const builder = plus.android.invoke(Calendars.CONTENT_URI, 'buildUpon');
  plus.android.invoke(builder, 'appendQueryParameter', CalendarContract.CALLER_IS_SYNCADAPTER, 'true');
  plus.android.invoke(builder, 'appendQueryParameter', Calendars.ACCOUNT_NAME, accountName);
  plus.android.invoke(builder, 'appendQueryParameter', Calendars.ACCOUNT_TYPE, accountType);
  const syncAdapterUri = plus.android.invoke(builder, 'build');
  const values = plus.android.newObject('android.content.ContentValues');
  putText(values, Calendars.ACCOUNT_NAME, accountName);
  putText(values, Calendars.ACCOUNT_TYPE, accountType);
  putText(values, Calendars.NAME, 'zhixing-local');
  putText(values, Calendars.CALENDAR_DISPLAY_NAME, '知行');
  putText(values, Calendars.OWNER_ACCOUNT, accountName);
  putText(values, Calendars.CALENDAR_TIME_ZONE, timezone);
  putText(values, Calendars.ALLOWED_REMINDERS, '0,1');
  putInteger(values, Calendars.CALENDAR_COLOR, -11804109);
  putInteger(values, Calendars.CALENDAR_ACCESS_LEVEL, 700);
  putInteger(values, Calendars.MAX_REMINDERS, 5);
  putInteger(values, Calendars.VISIBLE, 1);
  putInteger(values, Calendars.SYNC_EVENTS, 1);
  const calendarUri = plus.android.invoke(resolver, 'insert', syncAdapterUri, values);
  if (!calendarUri) throw new Error('系统日历暂不允许创建本机日历，请确认手机系统日历服务可用');
  const calendarId = Number(plus.android.invoke(calendarUri, 'getLastPathSegment'));
  if (!Number.isSafeInteger(calendarId) || calendarId <= 0) throw new Error('手机日历没有返回本机日历编号');
  return calendarId;
}

function insertAndroidEvent(task, timing) {
  const main = plus.android.runtimeMainActivity();
  const resolver = plus.android.invoke(main, 'getContentResolver');
  const Calendars = plus.android.importClass('android.provider.CalendarContract$Calendars');
  const CalendarContract = plus.android.importClass('android.provider.CalendarContract');
  const Events = plus.android.importClass('android.provider.CalendarContract$Events');
  const Reminders = plus.android.importClass('android.provider.CalendarContract$Reminders');
  const TimeZone = plus.android.importClass('java.util.TimeZone');
  const timezone = plus.android.invoke(plus.android.invoke(TimeZone, 'getDefault'), 'getID');
  const calendarId = findWritableCalendar(resolver, Calendars)
    ?? createLocalCalendar(resolver, Calendars, CalendarContract, timezone);
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
