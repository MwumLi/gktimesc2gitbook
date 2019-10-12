const fs = require('fs');
const path = require('path');
const https = require('https');
const sh = require('shelljs');

const config = {
  cid: '87',
  cookie: '',
  gitbook: '',
}

function postJson(hostpath, postData) {
  postData = JSON.stringify(postData);
  const options = {
    hostname: "time.geekbang.org",
    port: 443,
    path: hostpath,
    method: "POST",
    headers: {
      Referer: "https://time.geekbang.org",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36",
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
      res.on("end", () => resolve(JSON.parse(data)) );
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


function loadConfig(file) {
  let data = fs.readFileSync(file, 'utf-8');
  data = JSON.parse(data);
  Object.assign(config, data);
  if (!data.cid) {
    console.log('请指定 cid, cid 为要导出的专栏ID');
    process.exit(1);
  }

  if (!data.cookie) {
    console.log('请指定 cookie, 否则导出为样章');
  }

  if (!data.gitbook) {
    config.gitbook = path.join(process.cwd(), 'gitbook');
  }
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

function generateDocs(menus) {
  let docsPath = path.join(config.gitbook, 'docs');
  sh.mkdir('-p', docsPath);
  return menus.map(async menu => {
    let html = await getColumnArticle(menu.id);
    let markdown = toMarkdown(html);
    markdown = `# ${menu.title}
    
    ${markdown}
    `;
    sh.ShellString(markdown).to(path.join(docsPath, `${menu.id}.md`));
    console.log(`[Generated] [${menu.title}](docs/${menu.id}.md)`);
  })
}

async function main (argc, argv) {
  if (argc < 3) {
    console.log('导出极客时间专栏为 gitbook')
    console.log(`Usage: ${path.basename(argv[1])} [jsonFile]`);
    let jsonFormat = {
      cid: 'cid 为极客时间专栏 id',
      cookie: '你登录极客时间后浏览器的 cookie, 如果你买了此专栏，指定 cookie 后可完整加载, 否则只能下载阉割版',
      gitbook: '导出的专栏存放目录, 默认当前运行命令的目录下 gitbook/'
    }
    console.log(`jsonFile 文件格式: ${JSON.stringify(jsonFormat, null, '  ')}`);
    console.log('最后, 也是最重要一点: 本脚本只是玩乐之作, 请不要用来作恶👻 , 支持付费阅读 ');
    process.exit(1)
  }

  // 加载配置文件
  loadConfig(argv[2]);

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
  let promises = generateDocs(menus);
  Promise.all(promises).then(() => console.log('Finished!'));
}

main( process.argv.length, process.argv);