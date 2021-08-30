@app_scan
Feature: Web application free of security vulnerabilities known to Zap

# Before hooks are run before Background

Background:
  Given a new Test Session based on each Build User supplied appScanner resourceObject
  And each Build User supplied route of each appScanner resourceObject is navigated
  And a new scanning session based on each Build User supplied appScanner resourceObject
  And the application is spidered for each appScanner resourceObject
  And all active scanners are disabled

Scenario: The application should not contain vulnerabilities known to Zap that exceed the Build User defined threshold
  Given all active scanners are enabled 
  When the active scan is run
  Then the vulnerability count should not exceed the Build User defined threshold of vulnerabilities known to Zap

