// To consume this module:
// 1. Require it:
//   const stdoutHook = require('src/api/app/models/stdoutHook');
// 2. Supply the write patch:
//   const ptStdoutWrite = stdoutHook.write((...writeParams) => {
//     const [str] = writeParams;
//     this.publisher.pubLog({ testSessionId: sessionsProps[1].testSession.id, logLevel: 'notice', textData: str, tagObj: { tags: ['app', 'stdout-hook'] } });
//   });
// 3. Engage it:
//   ptStdoutWrite.engage();
// 4. process.stdout.write is now patched

const write = (writePatch) => {

  const existingWrite = process.stdout.write;

  return {
    engage() {
      process.stdout.write = (() => {
        return (...writeParams) => {
          // write.apply(this, writeParams);
          const [str, enc, fd] = writeParams;
          writePatch(str, enc, fd);
        };
      })();
      return this;
    },
    disengage() {
      process.stdout.write = ((eWrite) => {
        return (...writeParams) => {
          eWrite.apply(process.stdout, writeParams);
        };
      })(existingWrite);
      return this;
    }
  };
};


module.exports = { write };

// Resources used:
//   https://gist.github.com/pguillory/729616/32aa9dd5b5881f6f2719db835424a7cb96dfdfd6
//   https://github.com/balderdashy/fixture-stdout which is linked to from first link
//   https://gist.github.com/stringparser/b539b8cfd5769542037d which is linked to from first link
//   https://github.com/cucumber/cucumber-js/blob/master/src/cli/index.js Where the cucumber Cli uses stdout.write

