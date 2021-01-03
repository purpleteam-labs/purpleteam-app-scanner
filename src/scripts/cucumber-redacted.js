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

// Only an older version of gherkin works.
// Sadly this functionality now inaccessible in the later versions of cucumber, even though it's still needed.
// https://github.com/cucumber/cucumber-js/issues/1489
// getActiveTestCasesFromFilesystem is used by app.js to display the test plan to the build user.
const gherkin = require('gherkin');
const path = require('path');
const { readFile } = require('fs').promises;

const getTestCases = ({ eventBroadcaster, language, pickleFilter, source, uri }) => { // eslint-disable-line no-unused-vars
  const result = [];
  const lang = null; // There is a bug in parser.js that expects lang to be falsy or an instance of TokenMatcher, so we can't just pass language through.
  const events = gherkin.generateEvents(source, uri, {}, lang);
  events.forEach((event) => {
    // https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_omit
    eventBroadcaster.emit(event.type, () => { const { type, ...theRest } = event; return theRest; });
    if (event.type === 'pickle') {
      const { pickle } = event;
      if (pickleFilter.matches({ pickle, uri })) {
        eventBroadcaster.emit('pickle-accepted', { pickle, uri });
        result.push({ pickle, uri });
      } else {
        eventBroadcaster.emit('pickle-rejected', { pickle, uri });
      }
    }

    if (event.type === 'attachment') {
      throw new Error(`Parse error in '${uri}': ${event.data}`);
    }
  });
  return result;
};

const getTestCasesFromFilesystem = async ({ cwd, eventBroadcaster, featureDefaultLanguage, featurePaths, pickleFilter }) => {
  const fSAndFPs = await Promise.all(featurePaths.map(async (fP) => ({
    fileSource: await readFile(fP, { encoding: 'utf8' }),
    featurePath: fP
  })));

  const collectionOfCollectionOfTestCases = fSAndFPs.map((fSAndFP) => getTestCases({
    eventBroadcaster,
    pickleFilter,
    language: featureDefaultLanguage,
    uri: path.relative(cwd, fSAndFP.featurePath),
    source: fSAndFP.fileSource
  }));

  const testCases = collectionOfCollectionOfTestCases.reduce((accum, cV) => [...accum, ...cV], []);
  return testCases;
};

module.exports = {
  getTestCases,
  getTestCasesFromFilesystem,
  getActiveTestCasesFromFilesystem: (options) => getTestCasesFromFilesystem(options)
};
