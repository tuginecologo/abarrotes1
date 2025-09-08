// Create utils/retry.js
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryOperation = (operation, delayTime, retries) => {
  return new Promise((resolve, reject) => {
    return operation()
      .then(resolve)
      .catch((reason) => {
        if (retries > 0) {
          return delay(delayTime)
            .then(retryOperation.bind(null, operation, delayTime, retries - 1))
            .then(resolve)
            .catch(reject);
        }
        return reject(reason);
      });
  });
};

module.exports = { retryOperation, delay };