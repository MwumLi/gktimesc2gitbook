const https = require('https');

function postJson(hostpath, postData) {
  postData = JSON.stringify(postData);
  const randomUAIndex = Math.round(Math.random() * 100) % UserAgents.length;
  const options = {
    hostname: "time.geekbang.org",
    port: 443,
    path: hostpath,
    method: "POST",
    headers: {
      Referer: "https://time.geekbang.org",
      "User-Agent": UserAgents[randomUAIndex],
      "Connection": "Keep-Alive",
      "Proxy-Connection": "Keep-Alive",
      "Content-Type": "application/json",
      "Content-Length": postData.length,
      "Cookie": config.cookie || ''
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      res.setEncoding("utf8");
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data))
        } catch (err) {
          console.error('Error: 接口返回数据错误, 期待json, 但是现在却是', data);
          if (config.debug) {
            console.debug(`当前接口: https://time.geekbang.org${hostpath}`);
            console.debug(`请求数据: ${postData}`);
            console.debug(`当前http状态码: ${res.statusMessage}, 当前响应 headers: \n`, res.headers);
          }
          throw err;
        }
      });
    });

    req.on("error", e => reject(e));

    // write data to request body
    req.write(postData);
    req.end();
  });
}

module.exports = {
  postJson
}
