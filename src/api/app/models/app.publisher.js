// This is just verifying end-to-end comms
const publisher = (runParams) => {
  const { model, model: { log, publisher: p }, sessionsProps } = runParams;

  setInterval(() => {
    model.slavesDeployed = true;
    const sessionId = `${sessionsProps[0].testSession.id}`;
    log.debug('publishing to redis', { tags: ['app', sessionId] });
    try {
      p.publish(sessionId, `it is {red-fg}raining{/red-fg} cats and dogs${Date.now()}, session: ${sessionId}`);
    } catch (e) {
      log.error(`Error occurred while attempting to publish to redis channel: "app", event: "testerProgress". Error was: ${e}`, { tags: ['app', sessionId] });
    }
  }, 1000);

  setInterval(() => {
    const sessionId = `${sessionsProps[1].testSession.id}`;
    log.debug('publishing to redis', { tags: ['app', sessionId] });
    try {
      p.publish(sessionId, `it is {red-fg}raining{/red-fg} cats and dogs${Date.now()}, session: ${sessionId}`);
    } catch (e) {
      log.error(`Error occurred while attempting to publish to redis channel: "app", event: "testerProgress". Error was: ${e}`, { tags: ['app', sessionId] });
    }
  }, 1000);

  let pctComplete = 0;
  setInterval(() => {
    const sessionId = `${sessionsProps[1].testSession.id}`;
    log.debug('publishing to redis', { tags: ['app', sessionId] });
    pctComplete = pctComplete > 99 ? 0 : pctComplete + 1;
    // pctComplete = pctComplete >= 100 ? 100 : pctComplete + 1;
    try {
      p.publish(sessionId, pctComplete, 'testerPctComplete');
    } catch (e) {
      log.error(`Error occurred while attempting to publish to redis channel: "app", event: "testerPctComplete". Error was: ${e}`, { tags: ['app', sessionId] });
    }
  }, 1000);

  let bugCount = 0;
  setInterval(() => {
    const sessionId = `${sessionsProps[0].testSession.id}`;
    log.debug('publishing to redis - bugCount', { tags: ['app', sessionId] });
    bugCount += 1;
    try {
      p.publish(sessionId, bugCount, 'testerBugCount');
    } catch (e) {
      log.error(`Error occurred while attempting to publish to redis channel: "app", event: "testerBugCount". Error was: ${e}`, { tags: ['app', sessionId] });
    }
  }, 2000);
};

module.exports = publisher;
