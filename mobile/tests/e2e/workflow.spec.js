import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('example review persistence editing completion and offline use', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mkdir('../.local/screenshots', { recursive: true });
  await page.goto('/');
  await expect(page.locator('.hero-title')).toContainText('清楚安排');
  await page.screenshot({ path: '../.local/screenshots/home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '../.local/screenshots/home-mobile.png', fullPage: true });
  await page.locator('.example-link').click();
  await expect(page.locator('.candidate-card')).toHaveCount(2);
  await expect(page.locator('.review-intro .tag')).toHaveText('预置示例');
  await expect(page.locator('.save-panel .primary-button')).toHaveAttribute('disabled', 'true');
  await page.locator('.evidence-button').first().click();
  await expect(page.locator('.highlighted').first()).toBeVisible();
  await page.locator('.modal-card [aria-label="关闭原文"]').click();
  await page.screenshot({ path: '../.local/screenshots/review-mobile.png', fullPage: true });
  await page.locator('.confirmation-row').click();
  await page.locator('.save-panel .primary-button').click();
  await expect(page.locator('.task-card')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.task-card')).toHaveCount(2);
  await context.setOffline(true);
  await page.locator('.task-check').first().click();
  await expect(page.locator('.task-card.completed')).toHaveCount(1);
  await page.locator('.task-actions .text-button').filter({ hasText: '编辑' }).first().click();
  await page.locator('.modal-card input').first().fill('离线修改后的待办');
  await page.locator('.modal-card .primary-button').filter({ hasText: '保存修改' }).click();
  await expect(page.locator('.task-title').filter({ hasText: '离线修改后的待办' })).toHaveCount(1);
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator('.task-card.completed')).toHaveCount(1);
  await expect(page.locator('.task-title').filter({ hasText: '离线修改后的待办' })).toHaveCount(1);
  await page.screenshot({ path: '../.local/screenshots/tasks-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('live AI result can be reviewed and saved', async ({ page }) => {
  test.skip(process.env.LIVE_AI_E2E !== '1', 'Opt-in: this test uses the configured model account');
  await page.goto('/');
  await page.locator('.sample-button').filter({ hasText: '课程提交' }).click();
  await page.locator('.parse-button').click();
  await expect(page.locator('.review-intro .tag')).toHaveText('真实 AI 解析', { timeout: 30000 });
  await expect(page.locator('.candidate-card')).toHaveCount(2);
  await expect(page.locator('.candidate-card').first().locator('input').nth(1)).toHaveValue('2026-10-23');
  await expect(page.locator('.candidate-card').first().locator('input').nth(2)).toHaveValue('18:00');
  await page.screenshot({ path: '../.local/screenshots/review-live-ai.png', fullPage: true });
  await page.locator('.confirmation-row').click();
  await page.locator('.save-panel .primary-button').click();
  await expect(page.locator('.task-card')).toHaveCount(2);
  await expect(page.locator('.task-list')).toContainText('AI 解析后核对');
});

test('API failure keeps text and allows explicit manual continuation', async ({ page }) => {
  await page.route('**/api/v1/parse', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'MODEL_NOT_CONFIGURED', message: 'AI 尚未配置，请手动整理' }) }));
  await page.goto('/');
  const input = page.locator('textarea');
  await input.fill('请提交项目书，截止时间另行通知。');
  await page.locator('.parse-button').click();
  await expect(page.locator('.inline-message')).toContainText('AI 尚未配置');
  await expect(input).toHaveValue('请提交项目书，截止时间另行通知。');
  await page.locator('.manual-button').click();
  await expect(page.locator('.review-intro .tag')).toHaveText('手动整理');
  await page.locator('.candidate-card input').first().fill('提交项目书');
  await page.locator('.confirmation-row').click();
  await page.locator('.save-panel .primary-button').click();
  await expect(page.locator('.task-card')).toHaveCount(1);
  await expect(page.locator('.task-list')).toContainText('手动整理');
});

test('AI assistant renders the reply returned by the chat API', async ({ page }) => {
  await page.route('**/api/v1/chat', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    mode: 'chat', model_id: 'deepseek-flash', request_id: 'chat-test', reply: '先核对通知中的截止时间，再按指定渠道提交材料。',
  }) }));
  await page.goto('/');
  await page.locator('.robot-launcher').click();
  await page.locator('.chat-input textarea').fill('我应该怎样处理这条通知？');
  await page.locator('.send-chat').click();
  await expect(page.locator('.chat-line.assistant').last()).toContainText('先核对通知中的截止时间');
});

test('AI chat history is shared across pages and remains after reopening the app', async ({ page }) => {
  const requests = [];
  await page.route('**/api/v1/chat', async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body.messages);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      mode: 'chat', model_id: 'deepseek-flash', request_id: `chat-${requests.length}`, reply: `小知回答 ${requests.length}`,
    }) });
  });
  await page.goto('/');
  await page.locator('.robot-launcher').click();
  await page.locator('.chat-input textarea').fill('第一条问题');
  await page.locator('.send-chat').click();
  await expect(page.locator('.chat-line.assistant').last()).toContainText('小知回答 1');
  await page.locator('.close-chat').click();
  await page.locator('.tasks-nav-item').click();
  await expect(page.locator('.page-title')).toHaveText('我的待办');
  await page.locator('.robot-launcher').click();
  await expect(page.locator('.chat-line.user')).toContainText('第一条问题');
  await expect(page.locator('.chat-line.assistant').last()).toContainText('小知回答 1');
  await page.locator('.chat-input textarea').fill('第二条问题');
  await page.locator('.send-chat').click();
  await expect(page.locator('.chat-line.assistant').last()).toContainText('小知回答 2');
  expect(requests[1]).toEqual([
    { role: 'user', content: '第一条问题' },
    { role: 'assistant', content: '小知回答 1' },
    { role: 'user', content: '第二条问题' },
  ]);
  await page.reload();
  await page.locator('.robot-launcher').click();
  await expect(page.locator('.chat-line.user')).toHaveCount(2);
  await expect(page.locator('.chat-line.assistant').last()).toContainText('小知回答 2');
});

test('long AI replies scroll inside the assistant panel without scrolling the page', async ({ page }) => {
  const reply = Array.from({ length: 70 }, (_, index) => `${index + 1}. 按通知核对材料、时间与提交渠道。`).join('\n');
  await page.route('**/api/v1/chat', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    mode: 'chat', model_id: 'deepseek-flash', request_id: 'long-chat-test', reply,
  }) }));
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.robot-launcher').click();
  await page.locator('.chat-input textarea').fill('请详细说明');
  await page.locator('.send-chat').click();
  const messages = page.locator('.chat-messages');
  await expect(page.locator('.chat-line.assistant').last()).toContainText('70. 按通知核对');
  const scrollSurface = messages.locator('.uni-scroll-view').last();
  await scrollSurface.hover();
  await page.mouse.wheel(0, 800);
  await expect.poll(() => scrollSurface.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('assistant launcher can be repositioned on a narrow screen', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  const launcher = page.locator('.robot-launcher');
  const before = await launcher.boundingBox();
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 - 48, before.y + before.height / 2 - 42, { steps: 6 });
  await page.mouse.up();
  const after = await launcher.boundingBox();
  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(20);
  await page.waitForTimeout(400);
  await launcher.click();
  await expect(page.locator('.chat-panel')).toBeVisible();
});

test('phone navigation stays at the bottom and presents the task label on two lines', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  const nav = page.locator('.app-nav-wrap');
  const bounds = await nav.boundingBox();
  expect(Math.abs(bounds.y + bounds.height - 844)).toBeLessThanOrEqual(1);
  await expect(page.locator('.tasks-nav-item .nav-label')).toHaveText('我的待办');
  await expect(page.locator('.app-nav .nav-item')).toHaveCount(3);
});

test('website download link opens the app introduction page', async ({ page }) => {
  await page.goto('/');
  await page.locator('.download-link').click();
  await expect(page.locator('.download-hero')).toContainText('面向校园生活的 AI 通知助手');
  await expect(page.locator('.download-cta')).toContainText('下载 Android 安装包');
});

test('real AI deep reading visibly separates suggestions from notice facts and survives saving', async ({ page }) => {
  const text = '请于2026年10月23日18:00前通过教学平台提交项目书PDF，答辩时间另行通知。';
  await page.route('**/api/v1/parse', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    request_id: 'test-parse', parse_id: 'test-result', mode: 'ai', model_id: 'deepseek-flash', warnings: [],
    items: [{ id: 'test-action', action: '提交项目书PDF', due_text: '2026年10月23日18:00前', due_date: '2026-10-23', due_at: '2026-10-23T18:00:00+08:00', location: '教学平台', materials: ['项目书PDF'], evidence: { action: '提交项目书PDF', due: '2026年10月23日18:00前', location: '教学平台', materials: ['项目书PDF'] }, review_reasons: [] }],
  }) }));
  await page.route('**/api/v1/deep-read', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    request_id: 'test-deep', mode: 'ai_deep_read', model_id: 'deepseek-flash', cached: false,
    summary: '先提交项目书PDF，答辩时间尚未明确。', summary_quote: '提交项目书PDF',
    steps: [{ instruction: '先检查项目书PDF内容', why: '在上传前发现遗漏', source_quote: '项目书PDF' }, { instruction: '在截止前上传至教学平台', why: '通知给出了渠道和截止时间', source_quote: '2026年10月23日18:00前' }],
    questions: [{ question: '答辩时间何时公布？', reason: '通知只说另行通知' }],
  }) }));
  await page.goto('/');
  await page.locator('textarea').first().fill(text);
  await page.locator('.parse-button').click();
  await expect(page.locator('.deep-read .deep-step')).toHaveCount(2);
  await expect(page.locator('.deep-read')).toContainText('AI 建议');
  await expect(page.locator('.deep-read')).toContainText('答辩时间何时公布？');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '../.local/screenshots/deep-read-mobile.png', fullPage: true });
  await page.locator('.confirmation-row').click();
  await page.locator('.save-panel .primary-button').click();
  await page.locator('.task-actions .text-button').filter({ hasText: '来源' }).first().click();
  await expect(page.locator('.saved-deep')).toContainText('先检查项目书PDF内容');
});
