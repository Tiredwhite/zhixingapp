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

function calendarErrorMessage(error) {
  const providerMessages = {
    607: '手机系统日历服务不可用，请确认系统“日历”应用已启用后重试',
    608: '手机日历写入失败，请确认日历权限已开启后重试',
    609: '已取消日历创建',
  };
  return providerMessages[Number(error?.errCode)]
    || error?.errMsg
    || error?.message
    || '写入手机日历失败，请检查系统日历服务和日历权限';
}

function openSystemCalendarEditor(task, timing) {
  const native = typeof plus !== 'undefined' && plus.android;
  if (!native || plus.os?.name !== 'Android') {
    throw new Error('当前设备无法打开系统日历，请在安卓知行 App 中重试');
  }

  // The Calendar INSERT intent is supported by Android calendar apps and does
  // not require the app to read or write the user's calendar database.
  const Intent = native.importClass('android.content.Intent');
  const Uri = native.importClass('android.net.Uri');
  if (!Intent || !Uri) throw new Error('无法调用 Android 系统日历，请检查手机日历应用');

  const intent = new Intent('android.intent.action.INSERT');
  intent.setData(Uri.parse('content://com.android.calendar/events'));
  intent.putExtra('title', task.title);
  intent.putExtra('beginTime', timing.startTime);
  intent.putExtra('endTime', timing.endTime);
  intent.putExtra('allDay', false);
  intent.putExtra('description', `知行校园通知助手 · ${timing.reminderMinutes ? '截止前30分钟提醒' : '当天09:00提醒'}`);
  if (task.location) intent.putExtra('eventLocation', task.location);
  intent.putExtra('hasAlarm', true);
  intent.putExtra('minutes', timing.reminderMinutes);
  native.runtimeMainActivity().startActivity(intent);
  return { method: 'system_calendar_insert', requiresSave: true };
}

export function addTaskToCalendar(task, { success, fail }) {
  let timing;
  try { timing = calendarTiming(task); }
  catch (error) { fail(error); return; }

  // Keep the native API where available. Classic uni-app runtimes that predate
  // this API use Android's INSERT intent and let the user save in their calendar.
  if (typeof uni === 'undefined') {
    fail(new Error('请在知行 App 中使用手机日历功能'));
    return;
  }
  if (typeof uni.addPhoneCalendar !== 'function') {
    try { success(openSystemCalendarEditor(task, timing)); }
    catch (error) { fail(error); }
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
    success: (result) => success(result),
    fail: (error) => fail(new Error(calendarErrorMessage(error))),
  });
}
