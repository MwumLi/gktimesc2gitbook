const readline = require('readline');
const { getPaidCourses } = require('./gktime-service');

function strExtend(value, targetLength, direction, fillChar = ' ') {
  const str = value + ''
  const diff = targetLength - str.length
  if (diff <= 0) {
    return str
  }

  const f = new Array(diff + 1).join(fillChar)

  switch (direction) {
    case 'front':
      return f + str
    case 'end':
    default:
      return str + f
  }
}

async function selectCourse() {
  const courses = await getPaidCourses()
  console.log(`已购专栏列表：`)
  console.log(strExtend('', 50, 'front', '-'))

  console.log('序号  进度   专栏名称')

  for (let i = 0; i < courses.length; i++) {
    const {
      article,
      title,
      author
    } = courses[i]

    console.log(
      [
        strExtend(i, 2, 'front'),
        ' ',
        '[',
        strExtend(article.count_pub, 3, 'front'),
        '/',
        strExtend(article.count, 3, 'end'),
        ']',
        ' ',
        title,
        ' - ',
        author.name,
      ].join('')
    )
  }
  console.log(strExtend('', 50, 'front', '-'))
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((res, rej) => {
    rl.question('请输入要下载的专栏序号：', (index) => {
      const selected = courses[index]

      if (!!selected) {
        res(selected.id)
      } else {
        console.error(`Error: 输入错误，找不到对应专栏`)
        process.exit(2)
      }
    })
  })
}

module.exports = selectCourse;