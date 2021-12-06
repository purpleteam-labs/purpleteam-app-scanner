// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of PurpleTeam.

// PurpleTeam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// PurpleTeam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this PurpleTeam project. If not, see <https://www.gnu.org/licenses/>.

// Similar to that used in the CLI.
const NowAsFileName = (hourMinuteSecondSeperator = ':') => {
  const date = new Date();
  const padLeft = (num) => (num < 10 ? `0${num}` : `${num}`);
  // getHours returns hours as per UTC because the Docker image is set to UTC: https://github.com/purpleteam-labs/purpleteam/issues/84
  return `${date.getFullYear()}-${padLeft(date.getMonth() + 1)}-${padLeft(date.getDate())}T${padLeft(date.getHours())}${hourMinuteSecondSeperator}${padLeft(date.getMinutes())}${hourMinuteSecondSeperator}${padLeft(date.getSeconds())}`;
};

const percentEncode = (str) => str.split('').map((char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`).reduce((accum, cV) => `${accum}${cV}`, '');

module.exports = {
  NowAsFileName,
  percentEncode
};
