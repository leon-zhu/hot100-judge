'use strict';

/**
 * LeetCode CN 登录助手：拉起本机 Chrome，人工完成登录后自动抓取 cookie 写入
 * work/leetcode-config.json（session/csrf，chmod 600），供 --cloud 云端判定使用。
 *
 * 为什么不用账号密码直接请求：
 * 力扣密码登录走 GraphQL authSignInWithPasswordByNvc，nvcData 必须由阿里云
 * 无痕验证 SDK 在真实浏览器中生成，且风控触发后还要二次验证。因此这里只做
 * 浏览器代登录，不接触也不保存密码。
 *
 * 零依赖：Chrome DevTools Protocol + Node 内置 WebSocket/fetch。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'work', 'leetcode-config.json');
const PROFILE = path.join(ROOT, 'work', '.chrome-profile');
const LOGIN_URL = 'https://leetcode.cn/accounts/login/';
const POLL_MS = 1500;
const TIMEOUT_MS = 5 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const home = os.homedir();
  const candidates = process.platform === 'darwin'
    ? [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ]
    : process.platform === 'win32'
      ? [
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      ]
      : [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/microsoft-edge',
        '/usr/bin/brave-browser',
        '/snap/bin/chromium',
      ];
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

// 极简 CDP 客户端：够用即可（Storage.getCookies / Browser.close）
async function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let nextId = 0;
  let closed = false;

  const client = {
    send(method, params = {}) {
      if (closed) return Promise.reject(new Error('浏览器连接已断开'));
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      try { ws.close(); } catch { /* ignore */ }
    },
  };

  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    const p = msg.id && pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error.message || 'CDP 调用失败'));
    else p.resolve(msg.result);
  });
  ws.addEventListener('close', () => {
    closed = true;
    for (const p of pending.values()) p.reject(new Error('浏览器连接已断开'));
    pending.clear();
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('无法连接 Chrome 调试端口')), { once: true });
  });
  return client;
}

async function waitForDebugger(proc) {
  const portFile = path.join(PROFILE, 'DevToolsActivePort');
  const deadline = Date.now() + 20000;
  let port = null;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`Chrome 启动后立即退出（${proc.exitCode}）。若 work/.chrome-profile 被占用，请先关闭对应窗口`);
    }
    try {
      const [p] = fs.readFileSync(portFile, 'utf8').split('\n');
      if (p) { port = Number(p); break; }
    } catch { /* 尚未写入 */ }
    await sleep(200);
  }
  if (!port) throw new Error('等待 Chrome 调试端口超时');

  let lastErr = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const info = await res.json();
      if (info && info.webSocketDebuggerUrl) return info.webSocketDebuggerUrl;
    } catch (e) { lastErr = e; }
    await sleep(250);
  }
  throw new Error(`无法访问 Chrome 调试端口${lastErr ? `: ${lastErr.message}` : ''}`);
}

function pickAuthCookies(cookies) {
  const find = (name) => cookies.find((c) => c.name === name && /(^|\.)leetcode\.cn$/.test(c.domain));
  const session = find('LEETCODE_SESSION');
  const csrf = find('csrftoken');
  if (!session || !csrf || !session.value || !csrf.value) return null;
  return { session: session.value, csrf: csrf.value };
}

async function userStatus(auth) {
  const res = await fetch('https://leetcode.cn/graphql/', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrftoken': auth.csrf,
      cookie: `csrftoken=${auth.csrf}; LEETCODE_SESSION=${auth.session}`,
    },
    body: JSON.stringify({
      operationName: 'userStatus',
      query: 'query userStatus { userStatus { isSignedIn username } }',
      variables: {},
    }),
  });
  const data = await res.json();
  return (data && data.data && data.data.userStatus) || null;
}

// ---- 从日常浏览器导入登录态（macOS：Chrome Safe Storage + v10 AES-CBC） ----
function browserRoots() {
  if (process.platform !== 'darwin') return [];
  const home = os.homedir();
  return [
    { name: 'Chrome', dir: path.join(home, 'Library', 'Application Support', 'Google', 'Chrome'), service: 'Chrome Safe Storage', account: 'Chrome' },
    { name: 'Chromium', dir: path.join(home, 'Library', 'Application Support', 'Chromium'), service: 'Chromium Safe Storage', account: 'Chromium' },
    { name: 'Edge', dir: path.join(home, 'Library', 'Application Support', 'Microsoft Edge'), service: 'Microsoft Edge Safe Storage', account: 'Microsoft Edge' },
    { name: 'Brave', dir: path.join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser'), service: 'Brave Safe Storage', account: 'Brave' },
  ];
}

function profileDirs(root) {
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && (d.name === 'Default' || /^Profile \d+$/.test(d.name)))
      .map((d) => path.join(root, d.name))
      .filter((p) => fs.existsSync(path.join(p, 'Cookies')));
  } catch { return []; }
}

function safeStorageKey(service, account) {
  try {
    return execFileSync('security', ['find-generic-password', '-w', '-s', service, '-a', account], {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim() || null;
  } catch { return null; }
}

// Chrome 运行时 Cookie 库被锁，复制一份（含 WAL）再读
function readBrowserCookies(profileDir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hot100-cookies-'));
  try {
    for (const f of ['Cookies', 'Cookies-wal', 'Cookies-shm']) {
      const src = path.join(profileDir, f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(tmp, f));
    }
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(path.join(tmp, 'Cookies'), { readOnly: true });
    try {
      return db.prepare(
        "SELECT host_key AS hostKey, name, value, encrypted_value AS enc " +
        "FROM cookies WHERE host_key LIKE '%leetcode.cn' AND name IN ('LEETCODE_SESSION', 'csrftoken')",
      ).all();
    } finally { db.close(); }
  } catch {
    return [];
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function decryptCookieValue(enc, hostKey, password) {
  const buf = Buffer.from(enc || []);
  const prefix = buf.subarray(0, 3).toString('latin1');
  if (prefix !== 'v10' && prefix !== 'v11') return null;
  try {
    const key = crypto.pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1');
    const d = crypto.createDecipheriv('aes-128-cbc', key, Buffer.alloc(16, 0x20));
    let pt = Buffer.concat([d.update(buf.subarray(3)), d.final()]);
    // 新版 Chrome 会在明文前拼 SHA256(host_key)，命中则剥离
    for (const h of [hostKey, hostKey.replace(/^\./, '')]) {
      const digest = crypto.createHash('sha256').update(h).digest();
      if (pt.length > 32 && pt.subarray(0, 32).equals(digest)) { pt = pt.subarray(32); break; }
    }
    return pt.toString('utf8');
  } catch { return null; }
}

async function importFromBrowsers() {
  if (process.platform !== 'darwin') return { reason: '当前平台暂不支持自动导入，请用 --browser' };
  let sawCookies = false;
  for (const b of browserRoots()) {
    if (!fs.existsSync(b.dir)) continue;
    let password = null;
    for (const profile of profileDirs(b.dir)) {
      const rows = readBrowserCookies(profile);
      if (!rows.length) continue;
      sawCookies = true;
      if (password === null) password = safeStorageKey(b.service, b.account);
      if (!password) continue;
      const pick = (name) => {
        const row = rows.find((r) => r.name === name);
        if (!row) return null;
        return row.value || decryptCookieValue(row.enc, row.hostKey, password);
      };
      const session = pick('LEETCODE_SESSION');
      const csrf = pick('csrftoken');
      if (!session || !csrf) continue;
      const auth = { session, csrf };
      let status = null;
      try { status = await userStatus(auth); } catch { /* 网络异常，继续尝试下一个 profile */ }
      if (status && status.isSignedIn) {
        return { auth, user: status, browser: `${b.name}（${path.basename(profile)}）` };
      }
    }
  }
  return { reason: sawCookies ? '浏览器里有 leetcode.cn cookie，但已失效或无法解密（钥匙串未授权）' : '日常浏览器中没有找到 leetcode.cn 登录态' };
}

function saveAuth(auth) {
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  fs.writeFileSync(CONFIG, JSON.stringify({ session: auth.session, csrf: auth.csrf }, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(CONFIG, 0o600);
}

async function login({ browser = false } = {}) {
  if (!browser) {
    console.log('尝试从本机浏览器导入 leetcode.cn 登录态…');
    const imported = await importFromBrowsers();
    if (imported.auth) {
      saveAuth(imported.auth);
      console.log(`✅ 已从 ${imported.browser} 导入登录态${imported.user.username ? `（${imported.user.username}）` : ''}，已保存到 work/leetcode-config.json`);
      console.log('   无需打开浏览器；登录失效后重新运行 hot100 login 即可');
      return imported.user;
    }
    console.log(`  ${imported.reason}`);
    console.log('改为打开独立浏览器窗口（如在窗口里验证码反复失败，请先在日常 Chrome 登录 leetcode.cn，再重跑 hot100 login）');
  }

  const exe = chromePath();
  if (!exe) {
    throw new Error('未找到 Chrome/Chromium。请安装 Chrome，或用环境变量 CHROME_PATH 指定浏览器可执行文件');
  }

  fs.mkdirSync(PROFILE, { recursive: true });
  fs.rmSync(path.join(PROFILE, 'DevToolsActivePort'), { force: true });

  console.log('正在打开浏览器，请在窗口里登录 leetcode.cn（扫码 / 手机验证码 / 帐号密码均可）');
  console.log('注意: 这是独立 profile（work/.chrome-profile），与你日常 Chrome 的登录态不共享；');
  console.log('      在该窗口登录一次即可，之后会复用。');
  const proc = spawn(exe, [
    '--remote-debugging-port=0',
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate,MediaRouter',
    LOGIN_URL,
  ], { stdio: 'ignore' });

  const kill = () => { try { proc.kill('SIGKILL'); } catch { /* ignore */ } };
  const onSignal = () => { kill(); process.exit(130); };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  let cdp = null;
  try {
    cdp = await connectCdp(await waitForDebugger(proc));
    const deadline = Date.now() + TIMEOUT_MS;
    let lastHint = Date.now();
    console.log('等待登录…（最长 5 分钟，Ctrl-C 取消）');

    while (Date.now() < deadline) {
      let auth = null;
      try {
        const { cookies } = await cdp.send('Storage.getCookies', {});
        auth = pickAuthCookies(cookies || []);
      } catch (e) {
        throw new Error(`读取浏览器 cookie 失败: ${e.message}`);
      }
      if (auth) {
        const status = await userStatus(auth);
        if (status && status.isSignedIn) {
          saveAuth(auth);
          console.log(`✅ 登录成功${status.username ? `（${status.username}）` : ''}，已保存到 work/leetcode-config.json`);
          console.log('   现在可以运行: hot100 judge <题号> <文件> --cloud');
          return status;
        }
      }
      if (Date.now() - lastHint > 30000) {
        lastHint = Date.now();
        console.log('  仍在等待登录完成…');
      }
      await sleep(POLL_MS);
    }
    throw new Error('登录超时（5 分钟）。请重新运行 hot100 login');
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    if (cdp) {
      try { await cdp.send('Browser.close'); } catch { /* ignore */ }
      cdp.close();
    }
    // Browser.close 后进程通常自行退出；兜底清理
    let exited = proc.exitCode !== null;
    if (!exited) {
      exited = await Promise.race([
        new Promise((r) => proc.once('exit', () => r(true))),
        sleep(3000).then(() => false),
      ]);
    }
    if (!exited) kill();
  }
}

module.exports = { login, chromePath };
