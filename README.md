# gktimesc2gitbook

`gktimesc2gitbook` 是一个使用 Node.js 写的脚本，用于自动化把极客时间专栏转化为 gitbook 目录结构, 从而方便使用 `gitbook-cli` 去生成静态站点或制作电子书 `pdf`, `epub` 等。  

## 运行环境

* 操作系统: 类 Unix 操作系统, 因为为了偷懒, 脚本中对于文件系统的操作使用 `shelljs`  
* Nodejs: 支持 `async/await` 的 Node.js, 哈哈, 我喜欢使用最新异步操作方式  

## 安装

	$ npm install -g gktimesc2gitbook

## 使用

安装后使用:  

   $ gktimesc2gitbook ./gitbook.json

可以使用 `npx` 快速使用:  

	$ npx gktimesc2gitbook ./gitbook.json
   # 或
	$ npx github:MwumLi/gktimesc2gitbook ./gitbook.json


## 参数文件格式


```
{
	"cid": 88,
	"cookie": "_ga=GA1.2.1178127592.1541215352; GCID=1d8d20c-ad6568d-b955709-d1640ea; _gid=GA1.2.782933269.1548774656; GCESS=BAkBAQQEgFEBAAYEmVDOeQwBAQIEJm1QXAoEAAAAAAEE2HETAAgBAwUEAAAAAAcEQLd.3AsCBAADBCZtUFw-; _gat=1; Hm_lvt_022f847c4e3acd44d4a2481d9187f1e6=1548774656,1548774699,1548848221,1548848729; Hm_lpvt_022f847c4e3acd44d4a2481d9187f1e6=1548848729; SERVERID=1fa1f330efedec1559b3abbcb6e30f50|1548848729|1548847313"
}
```

* `cid`: 必须, 专栏的 id, 浏览器打开专栏, url 上就可以看到  
* `cookie`: 可选, 用来通过极客时间的用户认证。 如果指定 cookie 或 cookie 失效, 导出的是阉割版的专栏, 因此, 此功能仅为付费用户。  
* `gitbook`: 可选, 指定导出的专栏内容存放目录。默认为运行命令的当前目录下的 `./gitbook/`  

