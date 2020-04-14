const fs = require('fs')
const path = require('path')

const CONFIG = {
  cid: 0,
  cookie: '',
  // 默认导出目录为执行目录下的 gitbook/
  gitbook: path.join(process.cwd(), 'gitbook'),
  rate: 5e2, // 请求速率，单位 ms, 防止服务器认为你在攻击而限制请求
  debug: false, // 调试模式
}

function parseConfig(fileConfig, cmdConfig) {
  for (let k in CONFIG) {
    let v = cmdConfig[k] || fileConfig[k]
    if (v !== undefined) {
      CONFIG[k] = v
    }
  }

  if (!CONFIG.cookie) {
    console.warn(
      '[警告] 因为没有指定用于通过专栏内容获取接口认证的 cookie, 所以将会导出专栏的所有样章'
    )
  }

  return CONFIG
}

function readConfig(configFile) {
  let data
  try {
    data = fs.readFileSync(configFile, 'utf-8')
  } catch (err) {
    console.error(`Error: Load Config file '${configFile}' failed`)
    throw err
  }

  try {
    data = JSON.parse(data)
  } catch (err) {
    console.error(`Error: 配置文件不是合法的 JSON`)
    throw err
  }
  return data
}

function existsConfig(config = {}) {
  return Object.keys(CONFIG).some((k) => config[k])
}

module.exports = {
  readConfig: readConfig,
  parseConfig: parseConfig,
  existsConfig: existsConfig,
}
