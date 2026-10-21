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

export function addTaskToCalendar(task, { success, fail }) {
  let timing;
  try { timing = calendarTiming(task); }
  catch (error) { fail(error); return; }

  // HBuilderX 5.26+ provides a native calendar API for Android and iOS. It
  // handles the device's Calendar Provider and local-calendar creation rules.
  if (typeof uni === 'undefined' || typeof uni.addPhoneCalendar !== 'function') {
    fail(new Error('当前安装包的系统日历能力版本过旧，请安装最新版知行后重试'));
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
