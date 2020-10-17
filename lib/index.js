const { initService } = require('./gktime-service');
const selectCourse = require('./select-course');
const exportGitbook = require('./gitbook');
// config
let config = {};
async function main(_config) {
  Object.assign(config, _config);
  initService(config)
  let cid = config.cid;
  if (!cid) {
    cid = await selectCourse()
  }
  await exportGitbook(cid, config);
}

module.exports = main;
