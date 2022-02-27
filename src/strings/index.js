// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

// Similar to that used in the CLI.
const NowAsFileName = (hourMinuteSecondSeperator = ':') => {
  const date = new Date();
  const padLeft = (num) => (num < 10 ? `0${num}` : `${num}`);
  // getHours returns hours as per UTC because the Docker image is set to UTC: https://github.com/purpleteam-labs/purpleteam/issues/84
  return `${date.getFullYear()}-${padLeft(date.getMonth() + 1)}-${padLeft(date.getDate())}T${padLeft(date.getHours())}${hourMinuteSecondSeperator}${padLeft(date.getMinutes())}${hourMinuteSecondSeperator}${padLeft(date.getSeconds())}`;
};

const percentEncode = (str) => str.split('').map((char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`).reduce((accum, cV) => `${accum}${cV}`, '');

export default { NowAsFileName, percentEncode };
export { NowAsFileName, percentEncode };

