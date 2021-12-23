// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0


const { promises: fsPromises } = require('fs');
const Reporting = require('./strategy');

const strings = require(`${process.cwd()}/src/strings`); // eslint-disable-line import/no-dynamic-require


class Standard extends Reporting {
  #sutPropertiesSubSet;
  #emissaryPropertiesSubSet
  #fileName = 'standard';

  constructor({ log, publisher, sutPropertiesSubSet, emissaryPropertiesSubSet, zAp }) {
    super({ log, publisher, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  #applyReportStyling = ({ format, text }) => {
    if (format !== 'html' && format !== 'md') return text;

    const regexpGlobal = 'g';
    const emissaryTitle = 'ZAP Scanning Report';
    const emissaryTitleReplacement = 'PurpleTeam Application Scanning Report';
    const emissaryImage = 'src="data:image/png;base64,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"';
    const emissaryImageReplacement = 'src="data:image/png;base64,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"';
    const counts = {
      expectedReplacementCountTitle: { md: 1, html: 2 },
      actualReplacementCountTitle: { md: 0, html: 0 },
      expectedReplacementCountImage: { md: 0, html: 1 },
      actualReplacementCountImage: { md: 0, html: 0 }
    };

    const styledReport = text.replace(new RegExp(emissaryTitle, regexpGlobal), () => {
      counts.actualReplacementCountTitle[format] += 1;
      return emissaryTitleReplacement;
    }).replace(emissaryImage, () => {
      counts.actualReplacementCountImage[format] += 1;
      return emissaryImageReplacement;
    });

    if (counts.actualReplacementCountTitle[format] === counts.expectedReplacementCountTitle[format]
      && counts.actualReplacementCountImage[format] === counts.expectedReplacementCountImage[format]) return styledReport;

    throw new Error('An actualReplacementCount did not match an expectedReplacementCount. The Emissary report layout must have changed.');
  };

  async createReports() {
    const methodName = 'createReports';
    const { id: testSessionId } = this.#sutPropertiesSubSet;
    const { reportDir, reportFormats } = this.#emissaryPropertiesSubSet;

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    const zApApiReportFuncCallback = (response) => {
      const toPrint = ((resp) => {
        if (typeof (resp) === 'object') return { format: 'json', text: JSON.stringify(resp, null, 2) };
        if (typeof (resp) === 'string' && resp.startsWith('<!DOCTYPE html>')) return { format: 'html', text: resp };
        if (typeof (resp) === 'string' && resp.includes('# ZAP Scanning Report')) return { format: 'md', text: resp };
        throw new Error('Unable to determin report type based on response from Zap');
      })(response);

      toPrint.text = this.#applyReportStyling(toPrint);

      return new Promise((resolve, reject) => {
        const reportFilePath = `${reportDir}report_appScannerId-${testSessionId}_${strings.NowAsFileName()}.${toPrint.format}`;
        this.log.info(`Writing ${toPrint.format}report to ${reportFilePath}, for Test Session with id: "${testSessionId}".`, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });

        fsPromises.writeFile(reportFilePath, toPrint.text).then(() => {
          this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Done writing ${toPrint.format}report file, for Test Session with id: "${testSessionId}".`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          resolve(`Done writing ${toPrint.format}report file.`);
        }).catch((writeFileErr) => {
          this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: `Error writing ${toPrint.format}report file to disk, for Test Session with id: "${testSessionId}": ${writeFileErr}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          reject(new Error(`Error writing ${toPrint.format}report file to disk, for Test Session with id: "${testSessionId}": ${writeFileErr}`));
        });
      });
    };

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `About to write reports in the following formats, for Test Session with id: "${testSessionId}": ${[...reportFormats]}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    const reportPromises = reportFormats.map(async (format) => this.zAp.aPi.core[`${format}report`]()
      .then(zApApiReportFuncCallback)
      .catch((err) => {
        const errorText = `Error occurred while attempting to create Zap ${format} report, for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
        this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        throw new Error(errorText);
      }));
    await Promise.all(reportPromises);
  }
}

module.exports = Standard;
