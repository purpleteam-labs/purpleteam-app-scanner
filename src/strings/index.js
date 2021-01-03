// Copyright (C) 2017-2021 BinaryMist Limited. All rights reserved.

// This file is part of purpleteam.

// purpleteam is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation version 3.

// purpleteam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with purpleteam. If not, see <https://www.gnu.org/licenses/>.

// Similar to that used in the CLI.
const NowAsFileName = (hourMinuteSecondSeperator = ':') => {
  const date = new Date();
  const padLeft = (num) => (num < 10 ? `0${num}` : `${num}`);
  return `${date.getFullYear()}-${padLeft(date.getMonth() + 1)}-${padLeft(date.getDate())}T${padLeft(date.getHours())}${hourMinuteSecondSeperator}${padLeft(date.getMinutes())}${hourMinuteSecondSeperator}${padLeft(date.getSeconds())}`;
};

module.exports = { NowAsFileName };
