'use strict';

/**
 * LeetCode CN 云端提交：本地判题通过后，把核心代码提交到 leetcode.cn 拿官方判定。
 * 认证：环境变量 LEETCODE_SESSION / LEETCODE_CSRF_TOKEN，或 work/leetcode-config.json
 *      {session, csrf}（gitignore，chmod 600）。
 * 契约：任何失败返回 { error }，绝不抛异常；调用方非致命处理。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'work', 'leetcode-config.json');
const BASE = 'https://leetcode.cn';
const POLL_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 1000;
const REQUEST_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, opts, timeoutMs = REQUEST_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getAuth() {
  if (process.env.LEETCODE_SESSION && process.env.LEETCODE_CSRF_TOKEN) {
    return { session: process.env.LEETCODE_SESSION, csrf: process.env.LEETCODE_CSRF_TOKEN };
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
    if (cfg && cfg.session && cfg.csrf) return { session: cfg.session, csrf: cfg.csrf };
  } catch { /* 未配置 */ }
  return null;
}

function slugFromUrl(url) {
  const m = /problems\/([^/?#]+)/.exec(url || '');
  return m ? m[1] : null;
}

async function graphql(auth, titleSlug) {
  const res = await fetchWithTimeout(`${BASE}/graphql/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrftoken': auth.csrf,
      cookie: `csrftoken=${auth.csrf}; LEETCODE_SESSION=${auth.session}`,
    },
    body: JSON.stringify({
      operationName: 'questionData',
      query: 'query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionId titleSlug } }',
      variables: { titleSlug },
    }),
  });
  const data = await res.json();
  return data && data.data && data.data.question;
}

async function submit(auth, slug, qid, lang, code) {
  const res = await fetchWithTimeout(`${BASE}/problems/${slug}/submit/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrftoken': auth.csrf,
      cookie: `csrftoken=${auth.csrf}; LEETCODE_SESSION=${auth.session}`,
      referer: `${BASE}/problems/${slug}/`,
    },
    body: JSON.stringify({ lang, question_id: Number(qid), typed_code: code, judge_type: 'large' }),
  });
  const data = await res.json();
  if (!data || !data.submission_id) {
    return { error: (data && data.error) || '提交失败（无 submission_id，登录态可能失效）' };
  }
  return { submissionId: data.submission_id };
}

async function check(auth, submissionId) {
  const res = await fetchWithTimeout(`${BASE}/submissions/detail/${submissionId}/check/`, {
    headers: { cookie: `csrftoken=${auth.csrf}; LEETCODE_SESSION=${auth.session}` },
  });
  return res.json();
}

async function submitToLeetCode({ problem, code, lang }) {
  const auth = getAuth();
  if (!auth) {
    return { error: '未配置登录态：设置环境变量 LEETCODE_SESSION/LEETCODE_CSRF_TOKEN，或写入 work/leetcode-config.json（见 docs/CLI_GUIDE.md）' };
  }
  try {
    if (!problem || !problem.url) return { error: '缺少题目 url，无法解析 slug' };
    const slug = slugFromUrl(problem.url);
    if (!slug) return { error: `无法从题目 url 解析 slug: ${problem.url}` };
    const q = await graphql(auth, slug);
    if (!q || !q.questionId) return { error: '获取 questionId 失败（登录态可能失效）' };
    const s = await submit(auth, slug, q.questionId, lang, code);
    if (s.error) return s;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let r = null;
    do {
      await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
      r = await check(auth, s.submissionId);
      if (r && r.state && r.state !== 'STARTED' && r.state !== 'PENDING') break;
    } while (Date.now() < deadline);
    if (!r || r.state !== 'SUCCESS') return { error: '云端判定超时' };
    const accepted = r.status_code === 10;
    let detail = null;
    if (r.status_code === 11 && r.last_testcase != null) {
      detail = `最后一个用例: ${r.last_testcase}${r.expected_output != null ? '  期望: ' + r.expected_output : ''}`;
    } else if (r.status_code === 20 && r.compile_error != null) {
      detail = `编译错误: ${String(r.compile_error).slice(0, 300)}`;
    } else if (r.status_code === 14) {
      detail = '超时（Time Limit Exceeded）';
    } else if (r.status_code === 12) {
      detail = '内存超限（Memory Limit Exceeded）';
    }
    return { accepted, statusMsg: r.status_msg || (accepted ? 'Accepted' : '失败'), detail };
  } catch (e) {
    return { error: `云端提交异常: ${e.message}` };
  }
}

module.exports = { submitToLeetCode, getAuth, slugFromUrl };
