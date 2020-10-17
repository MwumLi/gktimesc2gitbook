const path = require('path');
const sh = require('shelljs');
const TurndownService = require('turndown')
const gktimeService = require('./gktime-service');
const turndownService = new TurndownService({
  codeBlockStyle: 'fenced',
  fence: '```',
  headingStyle: 'atx'
})

function toMarkdown(html) {
  return turndownService.turndown(html)
}

async function wait(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  })
}

function generateBookJson(intro, gitbook) {
  let gitbookConfig = {
    title: intro.column_title,
    language: "zh",
  }

  gitbookConfig = JSON.stringify(gitbookConfig, null, '  ');
  sh.ShellString(gitbookConfig).to(path.join(gitbook, 'book.json'));
}

function generateREADME(intro, gitbook) {
  let markdown = toMarkdown(intro.column_intro);
  markdown = `# ${intro.column_title}

${markdown}
`;

  sh.ShellString(markdown).to(path.join(gitbook, 'README.md'));
}

function generateSummary(menus, gitbook) {
  let menuStr = menus.map(menu => `* [${menu.title}](./docs/${menu.id}.md)`).join('\n');
  let markdown = `# SUMMARY

* [简介](./README.md)
${menuStr}
`;

  sh.ShellString(markdown).to(path.join(gitbook, 'SUMMARY.md'));
}

async function generateDocs(menus, { gitbook, rate }) {
  let docsPath = path.join(gitbook, 'docs');
  sh.mkdir('-p', docsPath);
  for (let menu of menus) {
    await wait(rate);
    let html = await gktimeService.getColumnArticle(menu.id);
    let markdown = toMarkdown(html);
    markdown = `# ${menu.title}

    ${markdown}
    `;
    sh.ShellString(markdown).to(path.join(docsPath, `${menu.id}.md`));
    console.log(`[Generated] [${menu.title}](docs/${menu.id}.md)`);
  }
}

async function exportGitbook(cid, { gitbook, rate}) {
  let intro = await gktimeService.getColumnIntro(cid);
  let menus = await gktimeService.getColumnMenus(cid, intro.article_count);
  // clear
  sh.rm('-rf', gitbook);

  console.log(`将生成书籍到 ${gitbook} ...`);
  sh.mkdir('-p', gitbook);

  console.log('[Generated] book.json');
  generateBookJson(intro, gitbook);

  console.log('[Generated] README.md');
  generateREADME(intro, gitbook);

  console.log('[Generated] SUMMARY.md ...');
  generateSummary(menus, gitbook);

  console.log('[Generate] docs ...')
  await generateDocs(menus, { gitbook, rate });
  console.log('Finished!')
}

module.exports = exportGitbook
