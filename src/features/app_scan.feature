@app_scan
Feature: Web application free of security vulnerabilities known to Zap

# Before hooks are run befroe Background

Background:
  Given a new test session based on each build user supplied testSession
  And each build user supplied route of each testSession is navigated
  And a new scanning session based on each build user supplied testSession
  And the application is spidered for each testSession
  And all active scanners are disabled

Scenario: The application should not contain any vulnerabilities known to Zap
  Given all active scanners are enabled 
  When the active scan is run
  Then the vulnerability count should not exceed the build user decided threshold of vulnerabilities known to Zap
  And the Zap report is written to file
  