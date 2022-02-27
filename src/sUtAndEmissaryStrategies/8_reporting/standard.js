// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import { promises as fsPromises } from 'fs';
import { createRequire } from 'module';
import Reporting from './strategy.js';
import chmodr from './helper/chmodr.js';
import { NowAsFileName } from '../../strings/index.js';
import config from '../../../config/config.js';

const require = createRequire(import.meta.url);
const { version } = require('../../../package');

class Standard extends Reporting {
  #baseUrl;
  #sutPropertiesSubSet;
  #emissaryPropertiesSubSet;
  #fileName = 'standard';
  #reportPrefix = 'report_';
  #emissaryOutputTransitionDir = '/usr/emissaryOutputTransition/'; // Defined in Dockerfile

  constructor({ log, baseUrl, publisher, sutPropertiesSubSet, emissaryPropertiesSubSet, zAp }) {
    super({ log, publisher, zAp });
    this.#baseUrl = baseUrl;
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  async #deleteLeftoverReportsAndSupportDirsIfExistFromPreviousTestRuns() {
    const methodName = '#deleteLeftoverReportsAndSupportDirsIfExistFromPreviousTestRuns';
    const { dir: appTesterUploadDir } = config.get('upload');
    const { testSession: { id: testSessionId } } = this.#sutPropertiesSubSet;
    const fileAndDirNames = await fsPromises.readdir(appTesterUploadDir);
    const reportFileAndDirNames = fileAndDirNames.filter((f) => f.startsWith(`${this.#reportPrefix}appScannerId-${testSessionId}_`)); // Only delete what we are responsible for.
    // Cron job defined in userData.tpl sets ownership on everything in this dir so that this process running as user app_scanner is able to delete old files.
    await Promise.all(reportFileAndDirNames.map(async (r) => fsPromises.rm(`${appTesterUploadDir}${r}`, { recursive: true })))
      .then(() => {
        const adminSuccessText = `Attempt to delete TestSession specific ("${testSessionId}") files and dirs from App Tester upload directory: "${appTesterUploadDir}" ✔ succeeded ✔.`;
        this.log.info(adminSuccessText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      })
      .catch((err) => {
        const adminErrorText = `Attempt to delete TestSession specific ("${testSessionId}") files and dirs from App Tester upload directory: "${appTesterUploadDir}" ✖ failed ✖. This is probably because the machine instance's cron job to set write permissions has not yet run for these files, Error was: ${err.message}`;
        this.log.notice(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });
  }

  async #applyMarkupReplacements(reportMetaData) {
    const methodName = '#applyMarkupReplacements';
    const { testSession: { id: testSessionId } } = this.#sutPropertiesSubSet;

    const reportMetaDataWithMarkupReplacements = reportMetaData.filter((r) => r.styling?.markupReplacements?.length);

    // Read
    await Promise.all(reportMetaDataWithMarkupReplacements.map(async (rMWMR) => {
      const r = rMWMR;
      r.inputFileContent = await fsPromises.readFile(`${this.#emissaryOutputTransitionDir}${r.generation.reportFileName}`, { encoding: 'utf8' })
        .catch((err) => {
          const buildUserErrorText = `Error occurred while attempting to read report: "${r.generation.reportFileName}" in order to apply styling`;
          const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
          this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
          throw new Error(buildUserErrorText);
        });
      return r;
    }));
    // Replace
    const reportMetadataWithOutputFileContent = reportMetaDataWithMarkupReplacements.map((rMWMR) => {
      const r = rMWMR;
      r.outputFileContent = r.styling.markupReplacements.reduce((pV, cV, i) => {
        let replacementCounter = 0;
        const result = pV.replace(cV.emissarySearch, () => {
          replacementCounter += 1;
          return cV.emissaryReplacement;
        });
        if (replacementCounter !== cV.expectedCount) {
          throw new Error(`A replacementCounter of: "${replacementCounter}" did not match an expectedCount: "${cV.expectedCount}" for element: "${i}" of markupReplacements of reportMetaData with name: "${r.generation.reportFileName}". The Emissary report layout must have changed.`);
        }
        return result;
      }, r.inputFileContent);
      return r;
    });
    // Write
    await Promise.all(reportMetadataWithOutputFileContent.map(async (r) => fsPromises.writeFile(`${this.#emissaryOutputTransitionDir}${r.generation.reportFileName}`, r.outputFileContent, { mode: 0o664 })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to write report: "${r.generation.reportFileName}" in order to apply styling`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
        throw new Error(buildUserErrorText);
      })));
  }

  async #applyStylingFileReplacements(reportMetaData) {
    const methodName = '#applyStylingFileReplacements';
    const { testSession: { id: testSessionId } } = this.#sutPropertiesSubSet;

    const reportMetaDataWithFileReplacements = reportMetaData.filter((r) => r.styling?.fileReplacements?.length);

    await Promise.all(reportMetaDataWithFileReplacements.map(async (r) => Promise.all(r.styling.fileReplacements.map(async (fR) =>
      fsPromises.writeFile(`${this.#emissaryOutputTransitionDir}${r.supportDir}/${fR.file}`, fR.content, { mode: 0o664 }) // eslint-disable-line implicit-arrow-linebreak
        .catch((err) => {
          const buildUserErrorText = `Error occurred while attempting to write styling file replacement: "${r.supportDir}/${fR.file}"`;
          const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
          this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
          throw new Error(buildUserErrorText);
        })))));
  }

  async #applyReportStyling(reportMetaData) {
    await this.#applyMarkupReplacements(reportMetaData);
    await this.#applyStylingFileReplacements(reportMetaData);
  }

  // emissaryUploadDir            is emissary.upload.dir in config   which at time of writing is: /mnt/purpleteam-app-scanner/
  // appTesterUploadDir           is upload.dir          in config   which at time of writing is: /mnt/purpleteam-app-scanner/
  // #emissaryOutputTransitionDir defined in this class              which at time of writing is: /usr/emissaryOutputTransition/
  // reportDir                    is emissary.report.dr  in config   which at time of writing is: /var/log/purpleteam/outcomes/

  // 1. App Tester attempts to delete previous reports of same TestSession from appTesterUploadDir
  // 2. Zap saves reports to emissaryUploadDir
  // 3. App Tester copies reports from appTesterUploadDir to #emissaryOutputTransitionDir
  // 4. App Tester changes permissions on files/dirs in #emissaryOutputTransitionDir
  // 5. App Tester applies markup and style changes
  // 6. App Tester copies reports from #emissaryOutputTransitionDir to reportDir, then deletes same reports from #emissaryOutputTransitionDir
  async createReports() {
    const methodName = 'createReports';
    const {
      testSession: { id: testSessionId, attributes: testSessionAttributes },
      context: { name: contextName }
    } = this.#sutPropertiesSubSet;

    const { uploadDir: emissaryUploadDir, reportDir } = this.#emissaryPropertiesSubSet;
    const { dir: appTesterUploadDir } = config.get('upload');
    const nowAsFileName = NowAsFileName();

    const reportMetaData = [{
      name: 'traditionalHtml',
      generation: {
        title: 'PurpleTeam AppScan Report',
        template: 'traditional-html',
        theme: '', // N/A
        description: 'Purple teaming with PurpleTeam',
        contexts: contextName,
        sites: this.#baseUrl,
        sections: '', // All
        includedConfidences: 'Low|Medium|High|Confirmed',
        includedRisks: 'Informational|Low|Medium|High',
        reportFileName: `${this.#reportPrefix}appScannerId-${testSessionId}_traditional_${nowAsFileName}.html`,
        reportFileNamePattern: '',
        reportDir: emissaryUploadDir,
        display: false
      },
      styling: {
        markupReplacements: [{
          expectedCount: 1,
          emissarySearch: /<img\s*src=.*\s*alt="" \/>/gm,
          emissaryReplacement: '<img src="data:image/png;base64,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" alt="PurpleTeam Report">'
        }]
      }
    }, {
      name: 'traditionalHtmlPlusLight',
      generation: {
        title: 'PurpleTeam AppScan Report',
        template: 'traditional-html-plus',
        theme: 'light', // N/A
        description: 'Purple teaming with PurpleTeam',
        contexts: contextName,
        sites: this.#baseUrl,
        sections: '', // All
        includedConfidences: 'Low|Medium|High|Confirmed',
        includedRisks: 'Informational|Low|Medium|High',
        reportFileName: `${this.#reportPrefix}appScannerId-${testSessionId}_plus-light_${nowAsFileName}.html`,
        reportFileNamePattern: '',
        reportDir: emissaryUploadDir,
        display: false
      },
      supportDir: `${this.#reportPrefix}appScannerId-${testSessionId}_plus-light_${nowAsFileName}`,
      styling: {
        markupReplacements: [{
          expectedCount: 1,
          emissarySearch: new RegExp(`<img src="${this.#reportPrefix}.*>`, 'gm'),
          emissaryReplacement: '<img src="data:image/png;base64,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" alt="PurpleTeam Report">'
        }]
      }
    }, {
      name: 'traditionalHtmlPlusDark',
      generation: {
        title: 'PurpleTeam AppScan Report',
        template: 'traditional-html-plus',
        theme: 'dark', // N/A
        description: 'Purple teaming with PurpleTeam',
        contexts: contextName,
        sites: this.#baseUrl,
        sections: '', // All
        includedConfidences: 'Low|Medium|High|Confirmed',
        includedRisks: 'Informational|Low|Medium|High',
        reportFileName: `${this.#reportPrefix}appScannerId-${testSessionId}_plus-dark_${nowAsFileName}.html`,
        reportFileNamePattern: '',
        reportDir: emissaryUploadDir,
        display: false
      },
      supportDir: `${this.#reportPrefix}appScannerId-${testSessionId}_plus-dark_${nowAsFileName}`,
      styling: {
        markupReplacements: [{
          expectedCount: 1,
          emissarySearch: new RegExp(`<img src="${this.#reportPrefix}.*>`, 'gm'),
          emissaryReplacement: '<img src="data:image/png;base64,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" alt="PurpleTeam Report">'
        }]
      }
    }, {
      name: 'traditionalJson',
      generation: {
        title: 'PurpleTeam AppScan Report',
        template: 'traditional-json',
        theme: '', // N/A
        description: 'Purple teaming with PurpleTeam',
        contexts: contextName,
        sites: this.#baseUrl,
        sections: '', // All
        includedConfidences: 'Low|Medium|High|Confirmed',
        includedRisks: 'Informational|Low|Medium|High',
        reportFileName: `${this.#reportPrefix}appScannerId-${testSessionId}_traditional_${nowAsFileName}.json`,
        reportFileNamePattern: '',
        reportDir: emissaryUploadDir,
        display: false
      }
    }, {
      name: 'traditionalMd',
      generation: {
        title: 'PurpleTeam AppScan Report',
        template: 'traditional-md',
        theme: '', // N/A
        description: 'Purple teaming with PurpleTeam',
        contexts: contextName,
        sites: this.#baseUrl,
        sections: '', // All
        includedConfidences: 'Low|Medium|High|Confirmed',
        includedRisks: 'Informational|Low|Medium|High',
        reportFileName: `${this.#reportPrefix}appScannerId-${testSessionId}_traditional_${nowAsFileName}.md`,
        reportFileNamePattern: '',
        reportDir: emissaryUploadDir,
        display: false
      }
    }, {
      name: 'traditionalXml',
      generation: {
        title: 'PurpleTeam AppScan Report',
        template: 'traditional-xml',
        theme: '', // N/A
        description: 'Purple teaming with PurpleTeam',
        contexts: contextName,
        sites: this.#baseUrl,
        sections: '', // All
        includedConfidences: 'Low|Medium|High|Confirmed',
        includedRisks: 'Informational|Low|Medium|High',
        reportFileName: `${this.#reportPrefix}appScannerId-${testSessionId}_traditional_${nowAsFileName}.xml`,
        reportFileNamePattern: '',
        reportDir: emissaryUploadDir,
        display: false
      },
      styling: {
        markupReplacements: [{
          expectedCount: 1,
          emissarySearch: /<OWASPZAPReport version="2\.11\.1"/mg,
          emissaryReplacement: `<PurpleTeamReport version="${version}"`
        }, {
          expectedCount: 1,
          emissarySearch: /<\/OWASPZAPReport>/mg,
          emissaryReplacement: '</PurpleTeamReport>'
        }]
      }
    }, {
      name: 'riskConfidenceHtmlDark',
      generation: {
        title: 'PurpleTeam AppScan Report',
        template: 'risk-confidence-html',
        theme: 'original', // N/A
        description: 'Purple teaming with PurpleTeam',
        contexts: contextName,
        sites: this.#baseUrl,
        sections: '', // All
        includedConfidences: 'Low|Medium|High|Confirmed',
        includedRisks: 'Informational|Low|Medium|High',
        reportFileName: `${this.#reportPrefix}appScannerId-${testSessionId}_risk-confidence-dark_${nowAsFileName}.html`,
        reportFileNamePattern: '',
        reportDir: emissaryUploadDir,
        display: false
      },
      supportDir: `${this.#reportPrefix}appScannerId-${testSessionId}_risk-confidence-dark_${nowAsFileName}`,
      // Styling colours copied from https://purpleteam-labs.com/pricing/
      styling: {
        markupReplacements: [{
          expectedCount: 1,
          emissarySearch: /<a href="https:\/\/zaproxy\.org"><img\s.*<\/a>/,
          emissaryReplacement: '<a href="https://purpleteam-labs.com"><img src="data:image/png;base64,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" alt="The PurpleTeam Logo" class="zap-logo">PurpleTeam</a>'
        }],
        // Simple copy of original files with tweaks applied.
        fileReplacements: [{
          file: 'themes/original/main.css',
          content: `*, *::after, *::before {
            box-sizing: border-box;
         }
         
         h1, h2, h3, h4, h5, h6 {
           margin: 0;
           padding: 0;
         }
         
         pre, ul {
           margin: 0;
         }
         
         ol {
           list-style-type: none;
         }
         
         h1 {
           font-size: 3em;
         }
         
         h2 {
           font-size: 2em;
         }
         
         h3, h4, h5, h6 {
           font-size: 1em;
         }
         
         html {
           box-sizing: border-box;
           font-family: Verdana, sans-serif;
           line-height: 1.5;
         }
         
         body {
           margin: 1.5em 0;
         }
         
         @media screen and (min-width: 50em) {
           body {
             margin: 1.5em 2ch;
             padding: 1.5em 2ch;
           }
         }
         
         a:active, header a:active {
           outline-style: solid;
         }
         
         header, main {
           margin: 0 auto;
           max-width: 90ch;
           padding: 1.5em 4ch;
         }
         
         header {
           border-radius: .25em .25em 0 0;
         }
         
         main {
           border-radius: 0 0 .25em .25em;
         }
         
         summary {
           cursor: pointer;
         }
         
         .contents {
           margin-top: 1.5em;
         }
         
         main > section {
           margin-bottom: 4.5em;
         }
         
         .about-this-report > section {
           margin-bottom: 3em;
         }
         
         .summaries section {
           margin-bottom: 3em;
         }
         
         h2 {
           margin-bottom: .75em;
         }
         
         h3 {
           margin-bottom: 1.5em;
         }
         
         h4 {
           margin-bottom: 1.5em;
         }
         
         .report-parameters--container h4 {
           margin-top: 1.5em;
         }
         
         p {
           margin: 1.5em 0;
         }
         
         p:first-of-type {
           margin-top: 0;
         }
         
         p:last-of-type {
           margin-bottom: 0;
         }
         
         .contents li, .alerts li, .alert-types > ol > li {
           margin-top: 1.5em;
         }
         
         .alert-types h4 {
           margin-bottom: 0;
         }
         
         a {
           border-radius: .125em;
         }
         
         caption {
           margin-bottom: 1.5em;
           text-align: left;
         }
         
         code, .request-method-n-url {
           overflow-wrap: anywhere;
           white-space: break-spaces;
         }
         
         table {
           border-collapse: collapse;
         }
         
         .report-description--container, .report-parameters--container {
           margin-left: 2ch;
           padding: 0 2ch;
         }
         
         .about-this-report h3, .summaries h3, .appendix h3 {
           border-bottom: .05em solid;
         }
         
         .alerts h4 {
           text-align: center;
         }
         
         .alerts ol {
           padding-left: 0;
         }
         
         .alerts--site-li {
           border: .05em solid;
           border-radius: .25em;
           margin-left: 2ch;
           padding: 1.5em 3ch;
         }
         
         .contents ol {
           list-style-position: inside;
           list-style-type: square;
           padding-left: 4ch;
         }
         
         .contexts-list, .sites-list {
           list-style-type: square;
         }
         
         .risk-confidence-counts-table {
           width: 100%;
         }
         
         .risk-confidence-counts-table tr {
           height: 4.5em;
         }
         
         .risk-confidence-counts-table thead > tr {
           height: 3em;
         }
         
         .risk-confidence-counts-table th[scope="row"], .risk-confidence-counts-table th[scope="rowgroup"] {
           hyphens: auto;
           overflow-wrap: anywhere;
           word-break: break-all;
         }
         
         .risk-confidence-counts-table th[scope="row"] {
           padding-right: 5%;
         }
         
         @media screen and (max-width: 50em) {
           .risk-confidence-counts-table th[scope="row"] {
             padding-right: 1ch;
           }
         }
         
         .risk-confidence-counts-table th[scope="rowgroup"] {
           padding: 0 .5ch;
           vertical-align: middle;
         }
         
         .risk-confidence-counts-table > tbody > tr {
           border-top: .05em solid;
         }
         
         .risk-confidence-counts-table th[scope="row"], .risk-confidence-counts-table td {
           vertical-align: top;
         }
         
         .risk-confidence-counts-table th[scope="col"] {
           vertical-align: bottom;
         }
         
         .risk-confidence-counts-table th[scope="col"], .risk-confidence-counts-table th[scope="row"] {
           font-family: monospace, monospace;
           font-weight: bold;
         }
         
         .risk-confidence-counts-table th[scope="colgroup"], .risk-confidence-counts-table th[scope="rowgroup"] {
           font-weight: normal;
         }
         
         .risk-confidence-counts-table td, .risk-confidence-counts-table th[scope="col"], .risk-confidence-counts-table th[scope="row"] {
           text-align: right;
         }
         
         .site-risk-counts-table {
           width: 100%;
         }
         
         .site-risk-counts-table tr {
           height: 4.5em;
         }
         
         .site-risk-counts-table thead > tr:first-of-type {
           height: 3em;
         }
         
         .site-risk-counts-table th[scope="row"], .site-risk-counts-table th[scope="col"] {
           hyphens: auto;
           overflow-wrap: anywhere;
           word-break: break-all;
         }
         
         .site-risk-counts-table th[scope="row"] {
           padding-right: 1%;
         }
         
         @media screen and (max-width: 50em) {
           .site-risk-counts-table th[scope="row"] {
             padding-right: 1ch;
           }
         }
         
         .site-risk-counts-table th[scope="rowgroup"] {
           padding: 0 .5ch;
           vertical-align: middle;
         }
         
         .site-risk-counts-table > tbody > tr {
           border-top: .05em solid;
         }
         
         .site-risk-counts-table th[scope="row"], .site-risk-counts-table td {
           vertical-align: top;
         }
         
         .site-risk-counts-table th[scope="col"] {
           vertical-align: bottom;
         }
         
         .site-risk-counts-table th[scope="col"], .site-risk-counts-table th[scope="row"] {
           font-family: monospace, monospace;
           font-weight: bold;
         }
         
         .site-risk-counts-table th[scope="colgroup"], .site-risk-counts-table th[scope="rowgroup"] {
           font-weight: normal;
         }
         
         .site-risk-counts-table td, .site-risk-counts-table th[scope="col"], .site-risk-counts-table th[scope="row"] {
           text-align: right;
         }
         
         .alert-type-counts-table {
           width: 100%;
         }
         
         .alert-type-counts-table th, .alert-type-counts-table td {
           padding: 0 1rem;
           text-align: left;
           vertical-align: top;
         }
         
         .alert-type-counts-table td:nth-last-of-type(2) {
           padding-left: 1.5rem;
         }
         
         .alert-type-counts-table > tbody > tr {
           border-bottom: 0.05em dotted;
         }
         
         .alert-type-counts-table th[scope="col"] {
           border-left: 1rem solid;
         }
         
         .alert-type-counts-table th[scope="col"]:first-of-type {
           border-left: 0;
         }
         
         .alert-type-counts-table th[scope="col"]:last-of-type, .alert-type-counts-table td:last-of-type {
           text-align: right;
         }
         
         .alert-type-counts-table th[scope="col"], .alert-type-counts-table th[scope="row"] {
           font-weight: normal;
         }
         
         .alert-type-counts-table th[scope="row"], .alert-type-counts-table td {
           padding-bottom: 1.5em;
         }
         
         .alert-type-counts-table thead > th:first-of-type {
           width: 45%;
         }
         
         .alerts-table, .alert-types-table {
           border-collapse: separate;
           border-spacing: 2ch 1.5em;
           width: 100%;
         }
         
         .alerts-table th, .alerts-table td, .alert-types-table th, .alert-types-table td {
           vertical-align: top;
         }
         
         .alerts-table td, .alert-types-table td {
           overflow-wrap: anywhere;
         }
         
         .alerts-table th, .alert-types-table th {
           padding: 0 1ch;
         }
         
         .alerts-table td, .alert-types-table td {
           padding: 0 2ch;
         }
         
         .alerts-table summary {
           margin-bottom: 1.5em;
         }
         
         .alert-tags-list {
           list-style-position: inside;
           list-style-type: square;
           padding-left: 0;
         }
         
         .alert-tags-list > li {
           margin-top: 0;
         }
         
         .request-body, .response-body {
           margin-top: 1.5em;
         }
         
         .request-method-n-url {
           margin-bottom: 0;
         }
         
         .alert-types-table {
           padding-top: 0;
         }
         
         .alert-types-table th {
           width: 20%;
         }
         
         .alert-types-table ol {
           list-style-position: inside;
           list-style-type: square;
           padding-left: 0;
         }
         
         .alert-types-table li:not(:first-of-type) {
           margin-top: 1.5em;
         }
         
         p.alert-types-intro {
           margin-bottom: 3em;
         }
         
         .zap-logo {
           height: 1em;
           margin-right: .25ch;
         }
         
         h1, h2 {
           font-family: Georgia, serif;
         }
         
         .risk-level, .confidence-level, .included-risk-codes, .included-confidence-codes, .additional-info-percentages {
           font-family: monospace, monospace;
         }
         
         .context, .site, .request-method-n-url {
           font-family: monospace, monospace;
         }`
        }, {
          file: 'themes/original/colors.css',
          content: `body {
            background-color: #23252f;
          }
          
          main, footer {
            background-color: #343a40;
          }
          
          header {
            background-color: #8999af;
            color: #fff;
          }
          
          a:link {
            color: #9b6bcc;
            text-decoration: none;
          }
          
          a:visited {
            color: #9b6bcc;
          }
          
          a:focus {
            color: #8999af;
          }
          
          a:hover {
            color: #8999af;
            text-decoration: underline;
          }
          
          a:active {
            background-color: initial;
            color: #9b6bcc;
          }
          
          header a:link {
            color: #fff;
            text-decoration: underline;
          }
          
          header a:visited {
            color: #fff;
          }
          
          header a:focus {
            color: #343a40;
          }
          
          header a:hover {
            color: #343a40;
            text-decoration: underline;
          }
          
          header a:active {
            background-color: initial;
            color: #343a40;
          }
          
          summary:focus {
            background-color: #007bff;
          }
          
          summary:hover {
            background-color: #007bff;
          }
          
          summary:active {
            background-color: #007bff;
          }
          
          h2, h3, h4, h5, h6 {
            color: #fff;
          }
          
          .risk-level, .confidence-level {
            color: #8be9fd;
          }
          
          .risk-confidence-counts-table th[scope="colgroup"], .risk-confidence-counts-table th[scope="rowgroup"] {
            background-color: #9b6bcc;
            color: #fff;
          }
          
          .risk-confidence-counts-table th[scope="col"], .risk-confidence-counts-table th[scope="row"] {
            color: #fff;
          }
          
          .risk-confidence-counts-table > tbody > tr {
            border-top-color: #9b6bcc;
          }
          
          .site-risk-counts-table th[scope="colgroup"], .site-risk-counts-table th[scope="rowgroup"] {
            background-color: #9b6bcc;
            color: #fff;
          }
          
          .site-risk-counts-table th[scope="col"], .site-risk-counts-table th[scope="row"] {
            color: #fff;
          }
          
          .site-risk-counts-table > tbody > tr {
            border-top-color: #9b6bcc;
          }
          
          .alert-type-counts-table > tbody > tr {
            border-bottom-color: #9b6bcc;
          }
          
          .alert-type-counts-table th[scope="col"] {
            background-color: #9b6bcc;
            color: #fff;
          }
          
          .alert-type-counts-table th[scope="col"] {
            border-left-color: #fff;
          }
          
          .alerts-table th, .alert-types-table th {
            background-color: #8999af;
            color: #fff;
          }
          
          .additional-info-percentages {
            color: #8be9fd;
          }
          
          li, p, span, tr {
            color: #fff
          }`
        }]
      }
    }, {
      name: 'modernMarketing',
      generation: {
        title: 'PurpleTeam AppScan Report',
        template: 'modern',
        theme: 'marketing', // ["console","construction","corporate","marketing","mountain","nature","ocean","plutonium","skyline","technology"]
        description: 'Purple teaming with PurpleTeam',
        contexts: contextName,
        sites: this.#baseUrl,
        sections: '', // All
        includedConfidences: 'Low|Medium|High|Confirmed',
        includedRisks: 'Informational|Low|Medium|High',
        reportFileName: `${this.#reportPrefix}appScannerId-${testSessionId}_modern-marketing_${nowAsFileName}.html`,
        reportFileNamePattern: '',
        reportDir: emissaryUploadDir,
        display: false
      },
      supportDir: `${this.#reportPrefix}appScannerId-${testSessionId}_modern-marketing_${nowAsFileName}`,
      styling: {
        markupReplacements: [{
          expectedCount: 1,
          emissarySearch: new RegExp(`<img src="${this.#reportPrefix}.*>`, 'gm'),
          emissaryReplacement: '<img src="data:image/png;base64,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" alt="PurpleTeam Report">'
        }, {
          expectedCount: 1,
          emissarySearch: /<a href="https:\/\/www\.zaproxy\.org\/" target="_blank">ZAP<\/a>/,
          emissaryReplacement: '<a href="https://purpleteam-labs.com" target="_blank">PurpleTeam</a>'
        }]
      }
    }, {
      name: 'highLevelReport',
      generation: {
        title: 'PurpleTeam AppScan Report',
        template: 'high-level-report',
        theme: '', // No themes
        description: 'Purple teaming with PurpleTeam',
        contexts: contextName,
        sites: this.#baseUrl,
        sections: '', // All
        includedConfidences: 'Low|Medium|High|Confirmed',
        includedRisks: 'Informational|Low|Medium|High',
        reportFileName: `${this.#reportPrefix}appScannerId-${testSessionId}_high-level_${nowAsFileName}.html`,
        reportFileNamePattern: '',
        reportDir: emissaryUploadDir,
        display: false
      },
      supportDir: `${this.#reportPrefix}appScannerId-${testSessionId}_high-level_${nowAsFileName}`,
      styling: {
        markupReplacements: [{
          expectedCount: 1,
          emissarySearch: new RegExp(`<img src="${this.#reportPrefix}.*>`, 'gm'),
          emissaryReplacement: '<img src="data:image/png;base64,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" alt="PurpleTeam Report">'
        }]
      }
    }];

    this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });

    await this.#deleteLeftoverReportsAndSupportDirsIfExistFromPreviousTestRuns();

    const { reports } = { ...testSessionAttributes };
    // If reports, then Build User decided to specify a sub-set of report types rather than all report types.
    const chosenReportTemplateThemeNames = reports ? reports.templateThemes.map((rTT) => rTT.name) : reportMetaData.map((r) => r.name);

    const chosenReportMetaData = reportMetaData.filter((rMD) => chosenReportTemplateThemeNames.includes(rMD.name));

    // Run sequentially as we've had trouble with Zap handling parallel calls in other places.
    await chosenReportMetaData.reduce(async (accum, cV) => {
      await accum;
      const { generation: args } = cV;
      await this.zAp.aPi.reports.generate(args)
        .then(() => {
          this.publisher.pubLog({ testSessionId, logLevel: 'info', textData: `Done generating report: ${args.reportFileName}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        })
        .catch((err) => {
          const errorText = `Error occurred while attempting to generate report: "${args.reportFileName}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
          this.publisher.pubLog({ testSessionId, logLevel: 'error', textData: errorText, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
          throw new Error(errorText);
        });
    }, {});

    const reportFileAndDirNames = [...chosenReportMetaData.map((r) => r.generation.reportFileName), ...chosenReportMetaData.filter((r) => r.supportDir).map((r) => r.supportDir)];

    await Promise.all(reportFileAndDirNames.map(async (r) => fsPromises.cp(`${appTesterUploadDir}${r}`, `${this.#emissaryOutputTransitionDir}${r}`, { preserveTimestamps: true, recursive: true }))) // cp is experimental in node v17.
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to copy reports: "${reportFileAndDirNames}" from App Tester upload directory: "${appTesterUploadDir}" to Emissary output transition directory: "${this.#emissaryOutputTransitionDir}"`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });

    await chmodr(this.#emissaryOutputTransitionDir, 0o664)
      .then(() => {
        this.log.info(`chmodr was successfully applied to Emissary output transition directory: ${this.#emissaryOutputTransitionDir}`, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      })
      .catch((err) => {
        const buildUserErrorText = 'Error occurred while attempting to execute chmod -R on the Emissary output transition directory';
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
        throw new Error(buildUserErrorText);
      });

    // In order to compare the un-altered Zap reports with the PurpleTeam changes, comment this line out.
    await this.#applyReportStyling(chosenReportMetaData);

    await Promise.all(reportFileAndDirNames.map(async (r) => fsPromises.cp(`${this.#emissaryOutputTransitionDir}${r}`, `${reportDir}${r}`, { preserveTimestamps: true, recursive: true }))) // cp is experimental in node v17.
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to copy reports: "${reportFileAndDirNames}" from Emissary output transition directory: "${this.#emissaryOutputTransitionDir}" to report directory: "${reportDir}"`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });

    await Promise.all(reportFileAndDirNames.map(async (r) => fsPromises.rm(`${this.#emissaryOutputTransitionDir}${r}`, { recursive: true })))
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to remove reports: "${reportFileAndDirNames}" from Emissary output transition directory: "${this.#emissaryOutputTransitionDir}"`;
        const adminErrorText = `${buildUserErrorText}, for Test Session with id: "${testSessionId}", Error was: ${err.message}`;
        this.publisher.publish({ testSessionId, textData: `${buildUserErrorText}.`, tagObj: { tags: [`pid-${process.pid}`, this.#fileName, methodName] } });
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });
  }
}

export default Standard;
