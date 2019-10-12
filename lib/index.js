const fs = require('fs');
const path = require('path');
const https = require('https');
const sh = require('shelljs');

// config
let config = {};

const UserAgents = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:55.0) Gecko/20100101 Firefox/55.0"
];

function postJson(hostpath, postData) {
  postData = JSON.stringify(postData);
  const randomUAIndex = Math.round(Math.random()*100) % UserAgents.length;
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
        } catch(err) {
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

    req.on("error", e =>  reject(e) );

    // write data to request body
    req.write(postData);
    req.end();
  });
}

async function getColumnIntro(cid) {
  let data = await postJson('/serv/v1/column/intro', { cid });
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

async function getColumnArticle(id) {
  let data = await postJson('/serv/v1/article', { id, include_neighbors: true });
  data = data.data;
  return data.article_content || data.article_content_short;
}

const TurndownService = require('turndown')
const turndownService = new TurndownService({
    codeBlockStyle: 'fenced',
    fence: '```',
    headingStyle: 'atx'
  })
function toMarkdown(html) {
  return turndownService.turndown(html)
}


function generateBookJson(intro) {
  let gitbookConfig = {
    title: intro.column_title,
    language : "zh",
  }

  gitbookConfig = JSON.stringify(gitbookConfig, null, '  ');
  sh.ShellString(gitbookConfig).to(path.join(config.gitbook, 'book.json'));
}

function generateREADME(intro) {
  let markdown = toMarkdown(intro.column_intro);
  markdown = `# ${intro.column_title}
  
${markdown}
`;

  sh.ShellString(markdown).to(path.join(config.gitbook, 'README.md'));
}

function generateSummary(menus) {
  let menuStr = menus.map(menu => `* [${menu.title}](./docs/${menu.id}.md)`).join('\n');
  let markdown = `# SUMMARY

* [简介](./README.md)  
${menuStr}
`;

  sh.ShellString(markdown).to(path.join(config.gitbook, 'SUMMARY.md'));
}

async function generateDocs(menus) {
  let docsPath = path.join(config.gitbook, 'docs');
  sh.mkdir('-p', docsPath);
  for (let menu of menus) {
    await wait(config.rate);
    let html = await getColumnArticle(menu.id);
    let markdown = toMarkdown(html);
    markdown = `# ${menu.title}
    
    ${markdown}
    `;
    sh.ShellString(markdown).to(path.join(docsPath, `${menu.id}.md`));
    console.log(`[Generated] [${menu.title}](docs/${menu.id}.md)`);
  }
}

async function wait(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  })
}

async function main(_config) {
  Object.assign(config, _config);
  let cid = config.cid;
  let intro = await getColumnIntro(cid);
  let menus = await getColumnMenus(cid, intro.article_count);

  // clear
  sh.rm('-rf', config.gitbook);

  console.log(`将生成书籍到 ${config.gitbook} ...`);
  sh.mkdir('-p', config.gitbook);
  
  console.log('[Generated] book.json');
  generateBookJson(intro);

  console.log('[Generated] README.md');
  generateREADME(intro);

  console.log('[Generated] SUMMARY.md ...');
  generateSummary(menus);

  console.log('[Generate] docs ...')
  await generateDocs(menus);
  console.log('Finished!')
}

module.exports = main;