'use strict';

/**
 * 进程执行器：负责编译/运行 Java 代码，带 CPU 时间、内存、输出体积限制。
 * 使用 `sh -c 'ulimit ...; exec "$@"'` 包装，对子进程施加 RLIMIT。
 */
const { spawn, execFile } = require('child_process');

const DEFAULT_TIMEOUT_MS = 4000;   // 运行墙钟超时（毫秒）
const COMPILE_TIMEOUT_MS = 30000;  // 编译墙钟超时（毫秒）
const DEFAULT_CPU_SEC = 5;         // 运行 CPU 时间上限（秒）
const COMPILE_CPU_SEC = 30;        // 编译 CPU 时间上限（秒）
const DEFAULT_MEM_KB = 524288;     // 地址空间上限（KB，即 512MB）
const MAX_OUTPUT = 64 * 1024;      // stdout/stderr 各自上限

function commandExists(command) {
  return new Promise((resolve) => {
    execFile('sh', ['-lc', `command -v ${command}`], (error, stdout) => {
      if (error || !stdout.trim()) return resolve(null);
      resolve(stdout.trim());
    });
  });
}

/**
 * 运行命令。
 * @param {string} command 可执行文件
 * @param {string[]} args 参数
 * @param {{cwd?:string, input?:string, timeout?:number, cpuSeconds?:number, limits?:boolean, phase?:'compile'|'run'}} options
 * @returns {Promise<{code:number, stdout:string, stderr:string, timedOut:boolean, ms:number, killedByLimit?:string}>}
 */
function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const limit = options.limits !== false;
    const isCompile = options.phase === 'compile';
    const cpuSec = options.cpuSeconds || (isCompile ? COMPILE_CPU_SEC : DEFAULT_CPU_SEC);
    const timeout = options.timeout || (isCompile ? COMPILE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);
    const realArgs = limit
      ? ['-c', `ulimit -t ${cpuSec} 2>/dev/null; ulimit -v ${DEFAULT_MEM_KB} 2>/dev/null; exec "$@"`, 'runner', command, ...args]
      : args;
    const realCommand = limit ? 'sh' : command;

    const child = spawn(realCommand, realArgs, {
      cwd: options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let killedByLimit = '';
    const timer = setTimeout(() => {
      timedOut = true;
      killedByLimit = 'time';
      try { child.kill('SIGKILL'); } catch (e) { /* noop */ }
    }, timeout);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > MAX_OUTPUT) {
        killedByLimit = killedByLimit || 'output';
        try { child.kill('SIGKILL'); } catch (e) { /* noop */ }
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > MAX_OUTPUT) {
        killedByLimit = killedByLimit || 'output';
        try { child.kill('SIGKILL'); } catch (e) { /* noop */ }
      }
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: error.message, timedOut, killedByLimit, ms: Date.now() - started });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 137 && timedOut) killedByLimit = killedByLimit || 'time';
      if (code === 153 && !timedOut) killedByLimit = killedByLimit || 'cpu';
      resolve({ code, stdout, stderr, timedOut, killedByLimit, ms: Date.now() - started });
    });
    try {
      child.stdin.end(options.input || '');
    } catch (e) { /* noop */ }
  });
}

module.exports = { runProcess, commandExists };
