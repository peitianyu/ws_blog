async function loadWasm() {
  // 使用 fetch + instantiateStreaming（服务器需返回正确的 Content-Type）
  const resp = await fetch('module.wasm');

  // Provide minimal WASI imports expected by Emscripten-built standalone wasm.
  // This module only needs `proc_exit` at link time; provide a stub so
  // instantiation succeeds in the browser. Add more functions if needed.
  const imports = {
    wasi_snapshot_preview1: {
      proc_exit: function (code) {
        console.log('wasi proc_exit called with', code);
        // Don't actually terminate the page; throw to stop execution if desired
        // throw new Error('proc_exit ' + code);
      }
    }
  };

  // Some browsers/servers may not support instantiateStreaming for all MIME types,
  // so fall back to arrayBuffer + instantiate if it fails.
  try {
    const result = await WebAssembly.instantiateStreaming(resp, imports);
    return result.instance.exports;
  } catch (e) {
    console.warn('instantiateStreaming failed, falling back to ArrayBuffer:', e);
    const bytes = await resp.arrayBuffer();
    const result = await WebAssembly.instantiate(bytes, imports);
    return result.instance.exports;
  }
}

(async () => {
  try {
    const exports = await loadWasm();

    document.getElementById('sum').onclick = () => {
      const a = parseInt(document.getElementById('a').value, 10) || 0;
      const b = parseInt(document.getElementById('b').value, 10) || 0;
      const r = exports.add(a, b);
      document.getElementById('sum-out').textContent = String(r);
    };

    document.getElementById('fib').onclick = () => {
      const n = parseInt(document.getElementById('n').value, 10) || 0;
      const r = exports.fib(n);
      document.getElementById('fib-out').textContent = String(r);
    };

  } catch (e) {
    document.body.insertAdjacentHTML('beforeend', '<p style="color:red">加载 wasm 时出错：'+e+'</p>');
    console.error(e);
  }
})();
