const https = require('https');

const UserAgents = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:55.0) Gecko/20100101 Firefox/55.0"
];

const config = {};

function retry(maxRetries, fn) {
  return fn().catch(function (err) {
    if (maxRetries <= 0) {
      process.exit(1);
    }
    var waitTill = new Date(new Date().getTime() + config.delay * 1000);
    while (waitTill > new Date()) { }
    return retry(maxRetries - 1, fn);
  });
}

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

  let fn = () => new Promise((resolve, reject) => {
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
          reject(err);
        }
      });
    });

    req.on("error", e => reject(e));

    // write data to request body
    req.write(postData);
    req.end();
  });

  return retry(config.retry, fn);
}

/**
 * 获取专栏介绍
 * @param {*} cid 专栏id
 */
async function getColumnIntro(cid) {
  let data = await postJson('/serv/v1/column/intro', {
    cid
  });
  data = data.data;
  if (!data || !Object.keys(data).length) {
    console.error(`Error: 获取专栏介绍失败, cid 为 "${cid}" 的专栏可能不存在`);
    process.exit(2);
  }
  return {
    column_title: data.column_title,
    article_count: data.article_count,
    column_intro: data.column_intro
  };
}

/**
 * 获取专栏目录
 * @param {*} cid 专栏id
 * @param {*} size 目录数, 尽可能最大, 保证可以完整获取
 */
async function getColumnMenus(cid, size) {
  let data = await postJson('/serv/v1/column/articles', {
    cid: cid,
    size: size || 300, // 要获取的目录数, 设置极大的值, 保证获取全部
    order: "earliest", // 按从早到晚的顺序
    prev: 0,
    sample: false,
  });

  data = data.data.list.map(item => {
    return {
      title: item.article_title,
      id: item.id
    }
  });
  return data;
}

/**
 * 获取专栏文章内容
 * @param {*} id 专栏文章ID
 */
async function getColumnArticle(id) {
  let data = await postJson('/serv/v1/article', {
    id,
    include_neighbors: true
  });
  data = data.data;
  return data.article_content || data.article_content_short;
}

async function getPaidCourses() {
  let data = await postJson('/serv/v3/learn/product', {
    desc: true,
    expire: 1,
    last_learn: 0,
    learn_status: 0,
    prev: 0,
    size: 100,
    sort: 1,
    type: 'c1', // 专栏
    with_learn_count: 1,
  });

  data = data.data
  if (!data || !Object.keys(data).length) {
    console.error(`Error: 获取已购买专栏列表失败，请检查 cookie 信息是否正确`);
    process.exit(2);
  }
  return data.products;
}

function initService(_config) {
  Object.assign(config, _config);
}

module.exports = {
  initService,
  getColumnIntro,
  getColumnMenus,
  getColumnArticle,
  getPaidCourses
}
