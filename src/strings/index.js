// Similar to that used in the CLI.
const NowAsFileName = (hourMinuteSecondSeperator = ':') => {
  const date = new Date();
  const padLeft = (num) => (num < 10 ? `0${num}` : `${num}`);
  return `${date.getFullYear()}-${padLeft(date.getMonth() + 1)}-${padLeft(date.getDate())}T${padLeft(date.getHours())}${hourMinuteSecondSeperator}${padLeft(date.getMinutes())}${hourMinuteSecondSeperator}${padLeft(date.getSeconds())}`;
};

module.exports = { NowAsFileName };
